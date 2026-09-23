import { z } from 'zod';

import { MODEL_DISCOVERY_ERRORS } from './openai-compatible-models';
import { openAICompatibleURL } from './openai-compatible-url';

export const CONNECTION_TEST_ERRORS = {
  missingCredentials: 'API key, base URL and default model are required.',
  invalidURL: MODEL_DISCOVERY_ERRORS.invalidURL,
  unauthorized: MODEL_DISCOVERY_ERRORS.unauthorized,
  modelUnavailable:
    'The selected model is unavailable or does not support chat.',
  quota: 'The model service has insufficient quota.',
  rateLimited: MODEL_DISCOVERY_ERRORS.rateLimited,
  timeout: MODEL_DISCOVERY_ERRORS.timeout,
  connection: MODEL_DISCOVERY_ERRORS.connection,
  invalidResponse: 'Model service returned an invalid chat response.',
  requestFailed: MODEL_DISCOVERY_ERRORS.requestFailed,
} as const;

/** Upstream diagnostics must never cross the admin boundary. */
export class ConnectionTestError extends Error {
  constructor(readonly code: keyof typeof CONNECTION_TEST_ERRORS) {
    super(CONNECTION_TEST_ERRORS[code]);
  }
}

const draftSchema = z.object({
  apiKey: z.string().trim().min(1),
  baseURL: z.string().trim().min(1),
  defaultModel: z.string().trim().min(1),
});
const errorSchema = z.object({
  error: z.object({
    code: z.string().nullish(),
    type: z.string().nullish(),
    param: z.string().nullish(),
    message: z.string().optional(),
  }),
});
const chatSchema = z.object({
  choices: z
    .array(
      z
        .object({
          message: z.object({
            role: z.literal('assistant'),
            content: z.string().nullable(),
          }),
          finish_reason: z.string().nullish(),
        })
        .refine(
          choice =>
            choice.message.content !== null || choice.finish_reason === 'length'
        )
    )
    .min(1),
});

async function readUpstreamError(response: Response) {
  try {
    const parsed = errorSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.error : undefined;
  } catch {
    // Only recognized error fields influence retry/classification, never output.
    return undefined;
  }
}

function unsupportedCompletionLimit(
  error: Awaited<ReturnType<typeof readUpstreamError>>
) {
  if (!error) return false;
  if (
    (error.param && error.param !== 'max_completion_tokens') ||
    error.code === 'invalid_value'
  ) {
    return false;
  }
  if (
    error.param === 'max_completion_tokens' &&
    error.code === 'unsupported_parameter'
  ) {
    return true;
  }
  return (
    /max_completion_tokens/.test(error.message ?? '') &&
    /unsupported (?:parameter|argument)|not supported|unrecognized (?:request )?argument/i.test(
      error.message ?? ''
    )
  );
}

/** Probe a draft via a small chat request; neither config nor messages are saved. */
export async function testOpenAICompatibleConnection(
  input: unknown
): Promise<{ model: string; latencyMs: number }> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    throw new ConnectionTestError('missingCredentials');
  }
  const { apiKey, baseURL, defaultModel } = parsed.data;
  let url: string;
  try {
    url = openAICompatibleURL(baseURL, 'chat/completions');
  } catch {
    throw new ConnectionTestError('invalidURL');
  }
  // Share one deadline across both attempts and response-body reads.
  const signal = AbortSignal.timeout(20_000);
  const started = performance.now();
  const requestChat = (limit: 'max_completion_tokens' | 'max_tokens') =>
    globalThis.fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        stream: false,
        [limit]: 32,
      }),
      signal,
      redirect: 'error',
    });
  try {
    // Match the native openai_chat encoder, with one legacy relay fallback.
    let response = await requestChat('max_completion_tokens');
    let upstreamError =
      response.status === 400 || response.status === 429
        ? await readUpstreamError(response)
        : undefined;
    if (response.status === 400 && unsupportedCompletionLimit(upstreamError)) {
      signal.throwIfAborted();
      response = await requestChat('max_tokens');
      upstreamError =
        response.status === 400 || response.status === 429
          ? await readUpstreamError(response)
          : undefined;
    }
    signal.throwIfAborted();
    if (!response.ok) {
      if (
        response.status === 402 ||
        [upstreamError?.code, upstreamError?.type].some(code =>
          [
            'insufficient_quota',
            'quota_exceeded',
            'billing_hard_limit_reached',
          ].includes(code ?? '')
        )
      ) {
        throw new ConnectionTestError('quota');
      }
      switch (response.status) {
        case 401:
        case 403:
          throw new ConnectionTestError('unauthorized');
        case 404:
        case 405:
          throw new ConnectionTestError('modelUnavailable');
        case 429:
          throw new ConnectionTestError('rateLimited');
        case 400:
          if (
            upstreamError?.param === 'model' ||
            [
              'model_not_found',
              'model_not_supported',
              'unsupported_model',
            ].includes(upstreamError?.code ?? '') ||
            /not a chat model|does not support chat|not supported (?:in|on|for).*chat/i.test(
              upstreamError?.message ?? ''
            )
          ) {
            throw new ConnectionTestError('modelUnavailable');
          }
      }
      throw new ConnectionTestError('requestFailed');
    }
    const body: unknown = await response.json();
    signal.throwIfAborted();
    if (!chatSchema.safeParse(body).success) {
      throw new ConnectionTestError('invalidResponse');
    }
    return {
      model: defaultModel,
      latencyMs: Math.max(0, Math.round(performance.now() - started)),
    };
  } catch (error) {
    if (signal.aborted) throw new ConnectionTestError('timeout');
    if (error instanceof ConnectionTestError) throw error;
    if (error instanceof SyntaxError) {
      throw new ConnectionTestError('invalidResponse');
    }
    throw new ConnectionTestError('connection');
  }
}

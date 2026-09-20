import { z } from 'zod';

import { openAICompatibleURL } from './openai-compatible-url';

export const MODEL_DISCOVERY_ERRORS = {
  missingCredentials: 'API key and base URL are required.',
  invalidURL:
    'Base URL must be HTTP(S) without credentials, query parameters or fragments.',
  unauthorized: 'Model service rejected the API key.',
  unsupported: 'Model service does not provide a models endpoint.',
  rateLimited: 'Model service rate limit exceeded.',
  timeout: 'Model service request timed out.',
  connection: 'Unable to connect to the model service.',
  invalidResponse: 'Model service returned an invalid model list.',
  requestFailed: 'Model service request failed.',
} as const;

/** Only safe, fixed messages cross the model discovery boundary. */
export class ModelDiscoveryError extends Error {
  constructor(readonly code: keyof typeof MODEL_DISCOVERY_ERRORS) {
    super(MODEL_DISCOVERY_ERRORS[code]);
  }
}

const credentialsSchema = z.object({
  apiKey: z.string().trim().min(1),
  baseURL: z.string().trim().min(1),
});
const modelListSchema = z.object({
  data: z.array(z.object({ id: z.string() })),
});

function modelsURL(baseURL: string): string {
  try {
    return openAICompatibleURL(baseURL, 'models');
  } catch {
    throw new ModelDiscoveryError('invalidURL');
  }
}

/** Discover models using a draft or saved provider config, without changing it. */
export async function fetchOpenAICompatibleModels(
  input: unknown
): Promise<string[]> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModelDiscoveryError('missingCredentials');
  }
  const { apiKey, baseURL } = parsed.data;
  const url = modelsURL(baseURL);
  const signal = AbortSignal.timeout(10_000);
  try {
    const response = await globalThis.fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
      // Never forward the credential to a redirect destination.
      redirect: 'error',
    });
    signal.throwIfAborted();
    if (!response.ok) {
      switch (response.status) {
        case 401:
        case 403:
          throw new ModelDiscoveryError('unauthorized');
        case 404:
          throw new ModelDiscoveryError('unsupported');
        case 429:
          throw new ModelDiscoveryError('rateLimited');
        default:
          throw new ModelDiscoveryError('requestFailed');
      }
    }
    const body: unknown = await response.json();
    signal.throwIfAborted();
    const models = modelListSchema.safeParse(body);
    if (!models.success) {
      throw new ModelDiscoveryError('invalidResponse');
    }
    return [
      ...new Set(
        models.data.data.map(model => model.id.trim()).filter(Boolean)
      ),
    ];
  } catch (error) {
    if (signal.aborted) {
      throw new ModelDiscoveryError('timeout');
    }
    if (error instanceof ModelDiscoveryError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ModelDiscoveryError('invalidResponse');
    }
    throw new ModelDiscoveryError('connection');
  }
}

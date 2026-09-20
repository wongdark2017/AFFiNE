import { Button } from '@affine/admin/components/ui/button';
import { affineFetch } from '@affine/admin/fetch-utils';
import { CheckCircle2, Loader2, PlugZap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { t } from '../../i18n';
import { getCopilotProviderError } from './copilot-provider-error';

const FALLBACK_ERROR =
  'Connection test failed. Check the API key, endpoint and model, then try again.';
const INVALID_RESPONSE = 'Model service returned an invalid chat response.';

type ConnectionConfig = {
  apiKey: string;
  baseURL: string;
  defaultModel: string;
};
type TestState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; model: string; latencyMs: number }
  | { status: 'error'; message: string };

async function testConnection(config: ConnectionConfig, signal: AbortSignal) {
  const response = await affineFetch('/api/copilot/admin/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    signal,
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('Sign in as an administrator to test the connection.');
  }
  if (response.status === 429) {
    throw new Error('Too many requests. Wait a moment and try again.');
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(response.ok ? INVALID_RESPONSE : FALLBACK_ERROR);
  }
  if (!response.ok) {
    throw new Error(getCopilotProviderError(payload, FALLBACK_ERROR));
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('model' in payload) ||
    typeof payload.model !== 'string' ||
    !payload.model.trim() ||
    !('latencyMs' in payload) ||
    typeof payload.latencyMs !== 'number' ||
    !Number.isFinite(payload.latencyMs) ||
    payload.latencyMs < 0
  ) {
    throw new Error(INVALID_RESPONSE);
  }
  return { model: payload.model, latencyMs: Math.round(payload.latencyMs) };
}

export function OpenAICompatibleConnectionTest({
  apiKey,
  baseURL,
  defaultModel,
}: ConnectionConfig) {
  const [state, setState] = useState<TestState>({ status: 'idle' });
  const requestRef = useRef<AbortController | null>(null);
  const configRef = useRef({ apiKey, baseURL, defaultModel });
  configRef.current = { apiKey, baseURL, defaultModel };
  const configured = Boolean(
    apiKey.trim() && baseURL.trim() && defaultModel.trim()
  );
  const loading = state.status === 'loading';

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setState({ status: 'idle' });
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [apiKey, baseURL, defaultModel]);

  const runTest = async () => {
    if (!configured || loading) return;
    const request = new AbortController();
    requestRef.current = request;
    setState({ status: 'loading' });
    const current = () =>
      !request.signal.aborted &&
      requestRef.current === request &&
      configRef.current.apiKey === apiKey &&
      configRef.current.baseURL === baseURL &&
      configRef.current.defaultModel === defaultModel;
    try {
      const result = await testConnection(
        { apiKey, baseURL, defaultModel },
        request.signal
      );
      if (current()) setState({ status: 'success', ...result });
    } catch (error) {
      if (current()) {
        setState({
          status: 'error',
          message: getCopilotProviderError(error, FALLBACK_ERROR),
        });
      }
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  };

  return (
    <div
      className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          disabled={!configured || loading}
          onClick={() => {
            runTest().catch(() => {
              setState({ status: 'error', message: FALLBACK_ERROR });
            });
          }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <PlugZap size={14} aria-hidden="true" />
          )}
          {t(
            loading
              ? 'Testing connection...'
              : state.status === 'idle'
                ? 'Test connection'
                : 'Test again'
          )}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          {t(
            configured
              ? 'Sends a short request using the current settings. This uses a small amount of model quota.'
              : 'Fill in the API key, endpoint and default model to test the connection.'
          )}
        </p>
      </div>
      {state.status === 'success' ? (
        <div role="status" className="flex items-start gap-2 text-sm">
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="font-medium">{t('Connection successful.')}</p>
            <p className="break-all text-xs leading-5 text-muted-foreground">
              {t('Model: {model} · {latency} ms', {
                model: state.model,
                latency: state.latencyMs,
              })}
            </p>
          </div>
        </div>
      ) : state.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.message)}
        </p>
      ) : null}
    </div>
  );
}

// Only fixed application messages are shown; upstream bodies may contain secrets.
const SAFE_MESSAGES = new Set([
  'API key and base URL are required.',
  'API key, base URL and default model are required.',
  'Base URL must be HTTP(S) without credentials, query parameters or fragments.',
  'Model service rejected the API key.',
  'Model service does not provide a models endpoint.',
  'Model service rate limit exceeded.',
  'Model service request timed out.',
  'Unable to connect to the model service.',
  'Model service request failed.',
  'Model service returned an invalid model list.',
  'Model service returned an invalid chat response.',
  'The selected model is unavailable or does not support chat.',
  'The model service has insufficient quota.',
  'Sign in as an administrator to get models.',
  'Sign in as an administrator to test the connection.',
  'Too many requests. Wait a moment and try again.',
]);

export function getCopilotProviderError(value: unknown, fallback: string) {
  const message =
    value && typeof value === 'object' && 'message' in value
      ? value.message
      : undefined;
  return typeof message === 'string' && SAFE_MESSAGES.has(message)
    ? message
    : fallback;
}

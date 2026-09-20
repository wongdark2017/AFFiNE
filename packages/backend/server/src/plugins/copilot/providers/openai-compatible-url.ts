/** API base passed to the native chat request layer, which appends /v1 itself. */
export function openAICompatibleBaseURL(baseURL: string): string {
  const url = new URL(baseURL);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    baseURL.includes('?') ||
    baseURL.includes('#')
  ) {
    throw new TypeError('Invalid model service URL.');
  }
  const basePath = url.pathname.replace(/\/+$/, '').replace(/\/v1$/, '');
  url.pathname = basePath;
  return url.toString().replace(/\/+$/, '');
}

/** Normalize the same API base for discovery and chat, including local relays. */
export function openAICompatibleURL(
  baseURL: string,
  endpoint: 'models' | 'chat/completions'
): string {
  return `${openAICompatibleBaseURL(baseURL)}/v1/${endpoint}`;
}

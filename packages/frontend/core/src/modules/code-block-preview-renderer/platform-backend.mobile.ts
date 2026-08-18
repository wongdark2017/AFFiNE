import { getNativePreviewHandlers } from './runtime-config';
import type { PreviewRenderRequestMap, PreviewRenderResultMap } from './types';

function getRequiredNativeHandler<
  Name extends keyof NonNullable<ReturnType<typeof getNativePreviewHandlers>>,
>(name: Name) {
  const handler = getNativePreviewHandlers()?.[name];
  if (!handler) {
    throw new Error(`Mobile preview handler "${String(name)}" is unavailable.`);
  }
  return handler;
}

export async function renderMermaidSvgBackend(
  request: PreviewRenderRequestMap['mermaid']
): Promise<PreviewRenderResultMap['mermaid']> {
  return getRequiredNativeHandler('renderMermaidSvg')(request);
}

export async function renderTypstSvgBackend(
  request: PreviewRenderRequestMap['typst']
): Promise<PreviewRenderResultMap['typst']> {
  return getRequiredNativeHandler('renderTypstSvg')(request);
}

export async function renderTikzSvgBackend(
  request: PreviewRenderRequestMap['tikz']
): Promise<PreviewRenderResultMap['tikz']> {
  const handler = getNativePreviewHandlers()?.renderTikzSvg;
  if (!handler) {
    throw new Error('TikZ preview is not supported on this platform yet.');
  }
  return handler(request);
}

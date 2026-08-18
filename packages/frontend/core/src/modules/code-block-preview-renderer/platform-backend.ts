import { getMermaidRenderer } from '@affine/core/modules/mermaid/renderer';
import { getTikzRenderer } from '@affine/core/modules/tikz/renderer';
import { getTypstRenderer } from '@affine/core/modules/typst/renderer';

import { renderClassicMermaidSvg } from './classic-mermaid';
import { isMermaidWasmNativeRendererEnabled } from './runtime-config';
import type { PreviewRenderRequestMap, PreviewRenderResultMap } from './types';

export async function renderMermaidSvgBackend(
  request: PreviewRenderRequestMap['mermaid']
): Promise<PreviewRenderResultMap['mermaid']> {
  if (!isMermaidWasmNativeRendererEnabled()) {
    return renderClassicMermaidSvg(request);
  }

  return getMermaidRenderer().render(request);
}

export async function renderTypstSvgBackend(
  request: PreviewRenderRequestMap['typst']
): Promise<PreviewRenderResultMap['typst']> {
  return getTypstRenderer().render(request);
}

export async function renderTikzSvgBackend(
  request: PreviewRenderRequestMap['tikz']
): Promise<PreviewRenderResultMap['tikz']> {
  return getTikzRenderer().render(request);
}

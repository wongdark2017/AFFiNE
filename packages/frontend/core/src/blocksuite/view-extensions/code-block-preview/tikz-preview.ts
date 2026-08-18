import 'node-tikzjax/css/fonts.css';

import { renderTikzSvg } from '@affine/core/modules/code-block-preview-renderer/bridge';
import { CodeBlockPreviewExtension } from '@blocksuite/affine/blocks/code';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/lit';
import type { CodeBlockModel } from '@blocksuite/affine/model';
import { unsafeCSSVarV2 } from '@blocksuite/affine/shared/theme';
import { ShadowlessElement } from '@blocksuite/std';
import { css, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { choose } from 'lit/directives/choose.js';
import { styleMap } from 'lit/directives/style-map.js';

const RENDER_DEBOUNCE_MS = 200;

export const CodeBlockTikzPreview = CodeBlockPreviewExtension(
  'tikz',
  model => html`<tikz-preview .model=${model}></tikz-preview>`
);

/**
 * Adapts the black-on-white TikZ output to the current theme: black strokes
 * follow the text color and white fills follow the background color
 * (same approach as obsidian-tikzjax).
 */
export function adaptTikzSvgColors(svg: string): string {
  return svg
    .replaceAll(/#000000|#000\b|\bblack\b/g, 'currentColor')
    .replaceAll(
      /#ffffff|#fff\b|\bwhite\b/g,
      'var(--affine-background-primary-color)'
    );
}

export class TikzPreview extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .tikz-preview-loading {
      color: ${unsafeCSSVarV2('text/placeholder')};
      font-family: 'IBM Plex Mono';
      font-size: 12px;
      line-height: 18px;
      padding: 12px;
      text-align: center;
    }

    .tikz-preview-error,
    .tikz-preview-fallback {
      color: ${unsafeCSSVarV2('button/error')};
      font-family: 'IBM Plex Mono';
      font-size: 12px;
      line-height: 18px;
      padding: 12px;
      text-align: center;
    }

    details.tikz-error-details {
      margin-top: 8px;
      text-align: left;
      border: 1px dashed ${unsafeCSSVarV2('layer/insideBorder/border')};
      border-radius: 6px;
      padding: 8px;
      background: ${unsafeCSSVarV2('layer/background/secondary')};
      color: ${unsafeCSSVarV2('text/secondary')};
      font-family: 'IBM Plex Mono';
      font-size: 12px;
      line-height: 18px;
    }

    .tikz-error-text {
      white-space: pre-wrap;
      word-break: break-word;
      user-select: text;
    }

    .tikz-copy-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 6px;
    }

    .tikz-copy-button {
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      background: ${unsafeCSSVarV2('layer/background/primary')};
      color: ${unsafeCSSVarV2('text/primary')};
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s ease;
    }

    .tikz-copy-button:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
    }

    .tikz-preview-container {
      width: 100%;
      min-height: 120px;
      max-height: 600px;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      border-radius: 8px;
      background: ${unsafeCSSVarV2('layer/background/primary')};
      color: ${unsafeCSSVarV2('text/primary')};
      padding: 12px;
      overflow: auto;
      position: relative;
      cursor: grab;
    }

    .tikz-preview-svg {
      width: 100%;
      transform-origin: center;
      transition: transform 0.15s ease-out;
      display: inline-block;
    }

    .tikz-preview-svg > div {
      display: flex;
      justify-content: center;
      width: 100%;
      transform-origin: center;
    }

    .tikz-controls {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      z-index: 10;
    }

    .tikz-control-button {
      width: 28px;
      height: 28px;
      border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
      border-radius: 4px;
      background: ${unsafeCSSVarV2('layer/background/primary')};
      color: ${unsafeCSSVarV2('text/primary')};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .tikz-control-button:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
      border-color: ${unsafeCSSVarV2('layer/insideBorder/primaryBorder')};
    }

    .tikz-control-button:active {
      transform: scale(0.96);
    }
  `;

  @property({ attribute: false })
  accessor model: CodeBlockModel | null = null;

  @property({ attribute: false })
  accessor tikzCode: string | null = null;

  @state()
  accessor state: 'loading' | 'error' | 'finish' | 'fallback' = 'loading';

  @state()
  accessor svgContent: string = '';

  @state()
  accessor errorMessage: string | null = null;

  @state()
  accessor copyState: 'idle' | 'copied' | 'failed' = 'idle';

  @query('.tikz-preview-container')
  accessor container!: HTMLDivElement;

  private renderTimeout: ReturnType<typeof setTimeout> | null = null;
  private isRendering = false;
  private renderPending = false;
  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private async _copyError() {
    if (!this.errorMessage) return;
    try {
      await navigator.clipboard.writeText(this.errorMessage);
      this.copyState = 'copied';
      setTimeout(() => (this.copyState = 'idle'), 1500);
    } catch (err) {
      console.error('Failed to copy TikZ error message:', err);
      this.copyState = 'failed';
      setTimeout(() => (this.copyState = 'idle'), 1500);
    }
  }

  private get _errorMessageDetail() {
    return this.errorMessage
      ? html`<details class="tikz-error-details">
          <summary>Error details</summary>
          <pre
            class="tikz-error-text"
            tabindex="0"
            aria-label="TikZ error message"
          >
${this.errorMessage}</pre
          >
          <div class="tikz-copy-row">
            <button class="tikz-copy-button" @click=${this._copyError}>
              ${this._copyButtonLabel}
            </button>
          </div>
        </details>`
      : nothing;
  }

  private get _errorMessageComponent() {
    const lower = this.errorMessage?.toLowerCase() ?? '';

    const friendlyMessage =
      lower.includes('not found') || lower.includes('not ')
        ? 'Failed to render TikZ. The code may use a LaTeX package that is not bundled with the offline renderer.'
        : 'Failed to render TikZ. Please check your code.';

    return [friendlyMessage, this._errorMessageDetail];
  }

  private get _copyButtonLabel() {
    if (this.copyState === 'copied') {
      return 'Copied';
    } else if (this.copyState === 'failed') {
      return 'Copy failed';
    } else {
      return 'Copy';
    }
  }

  private get _finalPreview() {
    return this.state === 'finish'
      ? html`
          <div class="tikz-controls">
            <button
              class="tikz-control-button"
              @click=${this._zoomOut}
              title="Zoom out"
            >
              −
            </button>
            <button
              class="tikz-control-button"
              @click=${this._resetView}
              title="Reset view"
            >
              ⟳
            </button>
            <button
              class="tikz-control-button"
              @click=${this._zoomIn}
              title="Zoom in"
            >
              +
            </button>
          </div>
          <div
            class="tikz-preview-svg"
            style=${styleMap({
              transform: `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`,
            })}
          >
            ${this.svgContent
              ? html`<div .innerHTML=${this.svgContent}></div>`
              : nothing}
          </div>
        `
      : nothing;
  }

  override firstUpdated() {
    this._scheduleRender();
    this._setupDragListeners();

    if (this.model) {
      this.disposables.add(
        this.model.props.text$.subscribe(() => {
          this._scheduleRender();
        })
      );
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }
  }

  get normalizedCode() {
    return this.model?.props.text.toString() ?? this.tikzCode ?? '';
  }

  private _scheduleRender() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.renderTimeout = setTimeout(() => {
      this._render().catch(error => {
        console.error('TikZ preview render failed:', error);
      });
    }, RENDER_DEBOUNCE_MS);
  }

  private _resetView() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.requestUpdate();
  }

  private _zoomIn() {
    this.scale = Math.min(this.scale * 1.2, 5);
    this.requestUpdate();
  }

  private _zoomOut() {
    this.scale = Math.max(this.scale / 1.2, 0.2);
    this.requestUpdate();
  }

  private _setupDragListeners() {
    if (!this.container) return;

    this.disposables.addFromEvent(
      this.container,
      'mousedown',
      (event: MouseEvent) => {
        if (event.button !== 0) return;
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.container.style.cursor = 'grabbing';
      }
    );

    this.disposables.addFromEvent(
      document,
      'mousemove',
      (event: MouseEvent) => {
        if (!this.isDragging) return;
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        this.translateX += deltaX;
        this.translateY += deltaY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.requestUpdate();
      }
    );

    this.disposables.addFromEvent(document, 'mouseup', () => {
      this.isDragging = false;
      if (this.container) {
        this.container.style.cursor = 'grab';
      }
    });

    this.disposables.addFromEvent(this.container, 'selectstart', e =>
      e.preventDefault()
    );
  }

  private async _render() {
    if (this.isRendering) {
      // TikZ renders can take seconds; remember to re-render with the
      // latest code once the in-flight render completes.
      this.renderPending = true;
      return;
    }
    this.isRendering = true;
    this.state = 'loading';
    this.errorMessage = null;

    const code = this.normalizedCode.trim();
    if (!code) {
      this.svgContent = '';
      this.state = 'fallback';
      this.isRendering = false;
      return;
    }

    try {
      const { svg } = await renderTikzSvg({ code });
      this.svgContent = adaptTikzSvgColors(svg);
      this.state = 'finish';
      this._resetView();
    } catch (error) {
      console.error('TikZ preview failed:', error);
      const message =
        (error as Error | undefined)?.message ??
        (typeof error === 'string' ? error : null);
      this.errorMessage = message;
      this.state = 'error';
    } finally {
      this.isRendering = false;
      if (this.renderPending) {
        this.renderPending = false;
        this._scheduleRender();
      }
    }
  }

  override render() {
    return html`
      <div class="tikz-preview-wrapper">
        ${choose(this.state, [
          [
            'loading',
            () =>
              html`<div class="tikz-preview-loading">
                Rendering TikZ code...
              </div>`,
          ],
          [
            'error',
            () =>
              html`<div class="tikz-preview-error">
                ${this._errorMessageComponent}
              </div>`,
          ],
          [
            'fallback',
            () =>
              html`<div class="tikz-preview-fallback">
                Enter TikZ code to preview.
              </div>`,
          ],
        ])}
        <div
          class="tikz-preview-container"
          style=${styleMap({
            display: this.state === 'finish' ? undefined : 'none',
          })}
        >
          ${this._finalPreview}
        </div>
      </div>
    `;
  }
}

export function effects() {
  customElements.define('tikz-preview', TikzPreview);
}

declare global {
  interface HTMLElementTagNameMap {
    'tikz-preview': TikzPreview;
  }
}

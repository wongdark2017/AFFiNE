import type { MessageCommunicapable } from '@toeverything/infra/op';
import { OpConsumer } from '@toeverything/infra/op';

import { ensureTikzReady, renderTikzSvgWithOptions } from './runtime';
import type { TikzOps, TikzRenderOptions, TikzRenderRequest } from './types';

class TikzRendererBackend extends OpConsumer<TikzOps> {
  private options: TikzRenderOptions = {};

  constructor(port: MessageCommunicapable) {
    super(port);
    this.register('init', this.init.bind(this));
    this.register('render', this.render.bind(this));
  }

  async init(options?: TikzRenderOptions) {
    this.options = { ...options };
    await ensureTikzReady();
    return { ok: true } as const;
  }

  async render({ code, options }: TikzRenderRequest) {
    return renderTikzSvgWithOptions(code, { ...this.options, ...options });
  }
}

new TikzRendererBackend(self as MessageCommunicapable);

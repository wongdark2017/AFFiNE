import { WorkerOpRenderer } from '../../shared/worker-op-renderer';
import type { TikzOps, TikzRenderOptions, TikzRenderRequest } from './types';

class TikzRenderer extends WorkerOpRenderer<TikzOps> {
  constructor() {
    super('tikz');
  }

  init(options?: TikzRenderOptions) {
    return this.ensureInitialized(() => this.call('init', options));
  }

  async render(request: TikzRenderRequest) {
    await this.init();
    return this.call('render', request);
  }
}

let sharedTikzRenderer: TikzRenderer | null = null;

export function getTikzRenderer() {
  if (!sharedTikzRenderer) {
    sharedTikzRenderer = new TikzRenderer();
  }
  return sharedTikzRenderer;
}

export type {
  TikzOps,
  TikzRenderOptions,
  TikzRenderRequest,
  TikzRenderResult,
} from './types';

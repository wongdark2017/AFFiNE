import type { OpSchema } from '@toeverything/infra/op';

export type TikzRenderOptions = {
  /**
   * Forward the TeX engine console log to the worker console.
   * The log is always captured for error reporting regardless of this flag.
   */
  showConsole?: boolean;
};

export type TikzRenderRequest = {
  code: string;
  options?: TikzRenderOptions;
};

export type TikzRenderResult = {
  svg: string;
};

export interface TikzOps extends OpSchema {
  init: [TikzRenderOptions | undefined, { ok: true }];
  render: [TikzRenderRequest, TikzRenderResult];
}

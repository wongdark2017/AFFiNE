import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import { FrameworkProvider } from '@toeverything/infra';
import { z } from 'zod';

import { TikzSlashMenuConfigExtension } from '../tikz/slash-menu';
import {
  CodeBlockHtmlPreview,
  effects as htmlPreviewEffects,
} from './html-preview';
import { CodeBlockLangsExtension } from './langs';
import {
  CodeBlockMermaidPreview,
  effects as mermaidPreviewEffects,
} from './mermaid-preview';
import {
  CodeBlockTikzPreview,
  effects as tikzPreviewEffects,
} from './tikz-preview';
import {
  CodeBlockTypstPreview,
  effects as typstPreviewEffects,
} from './typst-preview';

const optionsSchema = z.object({
  framework: z.instanceof(FrameworkProvider).optional(),
});

export class CodeBlockPreviewViewExtension extends ViewExtensionProvider {
  override name = 'code-block-preview';

  override schema = optionsSchema;

  override effect() {
    super.effect();

    htmlPreviewEffects();
    mermaidPreviewEffects();
    typstPreviewEffects();
    tikzPreviewEffects();
  }

  override setup(
    context: ViewExtensionContext,
    options?: z.infer<typeof optionsSchema>
  ) {
    super.setup(context, options);
    context.register(CodeBlockHtmlPreview);
    context.register(CodeBlockMermaidPreview);
    context.register(CodeBlockTypstPreview);
    context.register(CodeBlockTikzPreview);
    context.register(TikzSlashMenuConfigExtension);
    context.register(
      CodeBlockLangsExtension({ isMobile: this.isMobile(context.scope) })
    );
  }
}

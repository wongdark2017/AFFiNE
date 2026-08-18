import { focusTextModel } from '@blocksuite/affine/rich-text';
import { isInsideBlockByFlavour } from '@blocksuite/affine/shared/utils';
import { Text } from '@blocksuite/affine/store';
import {
  type SlashMenuConfig,
  SlashMenuConfigExtension,
} from '@blocksuite/affine/widgets/slash-menu';
import { TeXIcon } from '@blocksuite/icons/lit';

const TIKZ_TEMPLATE = `\\begin{tikzpicture}
  \\draw[->] (-2,0) -- (2,0) node[right] {$x$};
  \\draw[->] (0,-2) -- (0,2) node[above] {$y$};
  \\draw (0,0) circle (1);
\\end{tikzpicture}`;

const tikzSlashMenuConfig: SlashMenuConfig = {
  items: [
    {
      name: 'TikZ Diagram',
      description: 'Render TikZ code to a vector image.',
      icon: TeXIcon(),
      searchAlias: ['tikz', 'latex', 'pgf', 'pgfplots', 'circuitikz', '绘图'],
      group: '4_Content & Media@9',
      when: ({ model }) => {
        return (
          model.store.schema.flavourSchemaMap.has('affine:code') &&
          !isInsideBlockByFlavour(model.store, model, 'affine:edgeless-text')
        );
      },
      action: ({ model, std }) => {
        const { store } = model;
        const parent = store.getParent(model);
        if (!parent) return;

        const index = parent.children.indexOf(model);
        if (index === -1) return;

        const codeId = store.addBlock(
          'affine:code',
          {
            language: 'tikz',
            preview: true,
            text: new Text(TIKZ_TEMPLATE),
          },
          parent,
          index + 1
        );
        if (!codeId) return;

        if (model.text?.length === 0) {
          store.deleteBlock(model);
        }

        focusTextModel(std, codeId);
      },
    },
  ],
};

export const TikzSlashMenuConfigExtension = SlashMenuConfigExtension(
  'tikz',
  tikzSlashMenuConfig
);

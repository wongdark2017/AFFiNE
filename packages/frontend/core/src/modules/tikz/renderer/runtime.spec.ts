import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  extractSvg,
  gunzip,
  prepareTexInput,
  renderTikzSvgWithOptions,
  untarTexFiles,
} from './runtime';

const require = createRequire(import.meta.url);

const ASSET_URLS = {
  wasmUrl: 'https://assets.test/tex.wasm.gz',
  coredumpUrl: 'https://assets.test/core.dump.gz',
  texFilesUrl: 'https://assets.test/tex_files.tar.gz',
};

function resolveTexAsset(name: string) {
  return require.resolve(`node-tikzjax/tex/${name}`);
}

function stubAssetFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const name = url.split('/').at(-1) as string;
      const data = await readFile(resolveTexAsset(name));
      return new Response(new Uint8Array(data));
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('prepareTexInput', () => {
  test('wraps bare tikz commands in tikzpicture and document', () => {
    const input = prepareTexInput('\\draw (0,0) circle (1in);');
    expect(input).toBe(
      '\\begin{document}\n' +
        '\\begin{tikzpicture}\n' +
        '\\draw (0,0) circle (1in);\n' +
        '\\end{tikzpicture}\n' +
        '\\end{document}\n'
    );
  });

  test('keeps an existing environment and hoists preamble commands', () => {
    const input = prepareTexInput(
      [
        '\\begin{tikzpicture}',
        '\\usepackage{pgfplots}',
        '\\node at (0,0) {x};',
        '\\end{tikzpicture}',
      ].join('\n')
    );
    expect(input).toBe(
      '\\usepackage{pgfplots}\n' +
        '\\begin{document}\n' +
        '\\begin{tikzpicture}\n' +
        '\\node at (0,0) {x};\n' +
        '\\end{tikzpicture}\n' +
        '\\end{document}\n'
    );
  });

  test('passes through input that already has a document env', () => {
    const code =
      '\\begin{document}\n\\begin{tikzpicture}\\end{tikzpicture}\n\\end{document}';
    expect(prepareTexInput(code)).toBe(`${code}\n`);
  });

  test('strips blank lines and non-breaking spaces', () => {
    const input = prepareTexInput('\\draw (0,0);\n\n  \n\\draw (1,1);');
    expect(input).toContain('\\draw (0,0);\n\\draw (1,1);');
  });
});

describe('extractSvg', () => {
  test('extracts the svg root and unique-ifies pgf ids', () => {
    const html =
      '<div><svg><use href="#pgfsym1"/><g id="pgfsym1"></g></svg></div>';
    const svg = extractSvg(html);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).not.toContain('id="pgfsym1"');
    expect(svg).toMatch(/id="pgf[a-z0-9]+sym1"/);
  });

  test('throws when no svg is present', () => {
    expect(() => extractSvg('<div>no image</div>')).toThrow(
      'TikZ render produced no SVG output.'
    );
  });
});

describe('untarTexFiles', () => {
  test('extracts tex_files.tar.gz entries with /tex_files/ keys', async () => {
    const tarGz = await readFile(resolveTexAsset('tex_files.tar.gz'));
    const files = untarTexFiles(await gunzip(new Uint8Array(tarGz)));

    expect(files.size).toBeGreaterThan(10);
    for (const key of files.keys()) {
      expect(key.startsWith('/tex_files/')).toBe(true);
    }
    // pgfplots is one of the bundled loadable packages
    expect([...files.keys()].some(key => key.includes('pgfplots'))).toBe(true);
  });
});

describe('renderTikzSvgWithOptions (integration)', () => {
  test('renders a basic tikzpicture to svg', async () => {
    stubAssetFetch();
    const { svg } = await renderTikzSvgWithOptions(
      '\\begin{tikzpicture}\n\\draw (0,0) circle (1in);\n\\end{tikzpicture}',
      {},
      ASSET_URLS
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  }, 120_000);

  test('renders a pgfplots figure to svg', async () => {
    stubAssetFetch();
    const { svg } = await renderTikzSvgWithOptions(
      [
        '\\usepackage{pgfplots}',
        '\\begin{tikzpicture}',
        '\\begin{axis}',
        '\\addplot[domain=0:2] {x^2};',
        '\\end{axis}',
        '\\end{tikzpicture}',
      ].join('\n'),
      {},
      ASSET_URLS
    );
    expect(svg).toContain('<svg');
  }, 120_000);

  test('renders a circuitikz circuit to svg', async () => {
    stubAssetFetch();
    const { svg } = await renderTikzSvgWithOptions(
      [
        '\\usepackage{circuitikz}',
        '\\begin{circuitikz}',
        '\\draw (0,0) to[R=$R_1$] (2,0);',
        '\\end{circuitikz}',
      ].join('\n'),
      {},
      ASSET_URLS
    );
    expect(svg).toContain('<svg');
  }, 120_000);

  test('renders a tikz-cd commutative diagram to svg', async () => {
    stubAssetFetch();
    const { svg } = await renderTikzSvgWithOptions(
      [
        '\\usepackage{tikz-cd}',
        '\\begin{tikzcd}',
        'A \\arrow[r] & B',
        '\\end{tikzcd}',
      ].join('\n'),
      {},
      ASSET_URLS
    );
    expect(svg).toContain('<svg');
  }, 120_000);

  test('raises a descriptive error for invalid input', async () => {
    stubAssetFetch();
    await expect(
      renderTikzSvgWithOptions(
        '\\begin{tikzpicture}\n\\draw (0,0 circle;\n\\end{tikzpicture}',
        {},
        ASSET_URLS
      )
    ).rejects.toThrow(/TikZ render failed/);
  }, 120_000);
});

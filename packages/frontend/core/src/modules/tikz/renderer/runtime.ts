import { dvi2html } from '@prinsss/dvi2html';
import { Buffer } from 'buffer/';

import * as library from './library';
import type { TikzRenderOptions, TikzRenderResult } from './types';

// TeX packages preloaded in the tikzjax core dump or loadable from
// `tex_files.tar.gz` (see https://github.com/prinsss/node-tikzjax#usage).
export const SUPPORTED_TEX_PACKAGES = [
  'tikz',
  'pgfplots',
  'circuitikz',
  'chemfig',
  'tikz-cd',
  'tikz-3dplot',
  'array',
  'amsmath',
  'amstext',
  'amsfonts',
  'amssymb',
] as const;

export type TikzAssetUrls = {
  wasmUrl?: string;
  coredumpUrl?: string;
  texFilesUrl?: string;
};

type TikzRuntimeAssets = {
  wasmModule: WebAssembly.Module;
  coredump: Uint8Array;
  texFiles: Map<string, Uint8Array>;
};

const defaultAssetUrls = () => ({
  wasmUrl: new URL('node-tikzjax/tex/tex.wasm.gz', import.meta.url).toString(),
  coredumpUrl: new URL(
    'node-tikzjax/tex/core.dump.gz',
    import.meta.url
  ).toString(),
  texFilesUrl: new URL(
    'node-tikzjax/tex/tex_files.tar.gz',
    import.meta.url
  ).toString(),
});

let assetsPromise: Promise<TikzRuntimeAssets> | null = null;
let renderQueue: Promise<void> = Promise.resolve();

export async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(
    new Blob([data as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream('gzip'))
  );
  return new Uint8Array(await stream.arrayBuffer());
}

/**
 * Minimal ustar archive reader, sufficient for the flat `tex_files.tar.gz`
 * shipped by node-tikzjax. Returns a map keyed by `/tex_files/<name>` to
 * match the paths requested by the TeX engine file loader.
 */
export function untarTexFiles(data: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  let offset = 0;

  const readString = (start: number, length: number) => {
    const raw = data.subarray(start, start + length);
    const end = raw.indexOf(0);
    return decoder.decode(end === -1 ? raw : raw.subarray(0, end));
  };

  while (offset + 512 <= data.length) {
    const name = readString(offset, 100);
    if (!name) break; // two empty blocks terminate the archive

    const sizeText = readString(offset + 124, 12).trim();
    const size = parseInt(sizeText || '0', 8);
    const typeFlag = String.fromCharCode(data[offset + 156]);
    const prefix = readString(offset + 345, 155);

    if (typeFlag === '0' || typeFlag === '\0' || typeFlag === '') {
      const fullName = (prefix ? `${prefix}/${name}` : name)
        .replace(/^\.\//, '')
        .replace(/^\//, '');
      files.set(
        `/tex_files/${fullName}`,
        data.slice(offset + 512, offset + 512 + size)
      );
    }

    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return files;
}

async function fetchAsset(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch TikZ asset: ${url} (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function loadAssets(urls: TikzAssetUrls): Promise<TikzRuntimeAssets> {
  const resolved = { ...defaultAssetUrls(), ...urls };
  const [wasmGz, coredumpGz, texFilesGz] = await Promise.all([
    fetchAsset(resolved.wasmUrl),
    fetchAsset(resolved.coredumpUrl),
    fetchAsset(resolved.texFilesUrl),
  ]);
  const [wasmBytes, coredump, texFilesTar] = await Promise.all([
    gunzip(wasmGz),
    gunzip(coredumpGz),
    gunzip(texFilesGz),
  ]);
  return {
    wasmModule: await WebAssembly.compile(wasmBytes.buffer as ArrayBuffer),
    coredump,
    texFiles: untarTexFiles(texFilesTar),
  };
}

export async function ensureTikzReady(
  urls: TikzAssetUrls = {}
): Promise<TikzRuntimeAssets> {
  if (!assetsPromise) {
    assetsPromise = loadAssets(urls).catch(error => {
      assetsPromise = null;
      throw error;
    });
  }
  return assetsPromise;
}

const PREAMBLE_COMMANDS = ['\\usepackage', '\\usetikzlibrary', '\\pgfplotsset'];

/**
 * Normalizes user TikZ code into a full LaTeX input:
 * - strips non-breaking spaces and blank lines (mirrors obsidian-tikzjax)
 * - hoists `\usepackage` / `\usetikzlibrary` / `\pgfplotsset` lines into
 *   the preamble
 * - wraps bare TikZ commands into a `tikzpicture` environment
 * - wraps everything into `\begin{document} ... \end{document}`
 */
export function prepareTexInput(code: string): string {
  const tidied = code
    .replaceAll('\u00a0', ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  if (tidied.includes('\\begin{document}')) {
    return `${tidied}\n`;
  }

  const preambleLines: string[] = [];
  const bodyLines: string[] = [];
  for (const line of tidied.split('\n')) {
    if (PREAMBLE_COMMANDS.some(command => line.startsWith(command))) {
      preambleLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  let body = bodyLines.join('\n');
  if (!body.includes('\\begin{')) {
    body = `\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}`;
  }

  const preamble = preambleLines.length ? `${preambleLines.join('\n')}\n` : '';
  return `${preamble}\\begin{document}\n${body}\n\\end{document}\n`;
}

function hashCode(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Post-processing ported from node-tikzjax `dvi2svg.ts` (without jsdom/svgo):
 * unique-ify pgf ids so multiple inlined SVGs do not clash, fix symbols
 * stored in the SOFT HYPHEN character, and extract the `<svg>` root.
 */
export function extractSvg(html: string): string {
  const ids = html.match(/\bid="pgf[^"]*"/g);
  if (ids) {
    // Sort the ids from longest to shortest so partial names never
    // clobber longer ones during replacement.
    ids.sort((a, b) => b.length - a.length);
    const hash = hashCode(html);
    for (const id of ids) {
      const pgfIdString = id.replace(/id="pgf(.*)"/, '$1');
      html = html.replaceAll(`pgf${pgfIdString}`, `pgf${hash}${pgfIdString}`);
    }
  }

  // Replaces soft hyphens with ¬ (fixes \Omega, \otimes, ... rendering)
  html = html.replaceAll('&#173;', '&#172;');

  const start = html.indexOf('<svg');
  if (start === -1) {
    throw new Error('TikZ render produced no SVG output.');
  }

  // The dvi2html machine emits the closing tag only via an
  // `</svg endpicture>` special, which the tikzjax driver leaves out for
  // the last picture; node-tikzjax relies on jsdom auto-closing it.
  const end = html.lastIndexOf('</svg>');
  if (end === -1) {
    return `${html.slice(start).trimEnd()}</svg>`;
  }
  return html.slice(start, end + '</svg>'.length);
}

function buildRenderError(log: string): Error {
  const lines = log.split('\n');
  const errorLines = lines.filter(line => line.startsWith('!'));
  const missingPackage = /LaTeX Error: File `([^']+)' not found/.exec(log);

  let message = 'TikZ render failed.';
  if (missingPackage) {
    message =
      `TikZ render failed: package file "${missingPackage[1]}" is not ` +
      `available. Only these packages are bundled: ` +
      `${SUPPORTED_TEX_PACKAGES.join(', ')}.`;
  } else if (errorLines.length) {
    message = `TikZ render failed: ${errorLines.join(' ')}`;
  }

  const logTail = lines.slice(-20).join('\n');
  return new Error(`${message}\n\nTeX log (tail):\n${logTail}`);
}

async function runTexEngine(
  input: string,
  assets: TikzRuntimeAssets,
  options: TikzRenderOptions
): Promise<Uint8Array> {
  library.clearConsoleLog();
  if (options.showConsole) {
    library.setShowConsole();
  }

  // Write the tex input file into the memory filesystem.
  library.writeFileSync('input.tex', new TextEncoder().encode(input));

  // Copy the coredump into the memory.
  const memory = new WebAssembly.Memory({
    initial: library.pages,
    maximum: library.pages,
  });
  const buffer = new Uint8Array(memory.buffer, 0, library.pages * 65536);
  buffer.set(assets.coredump.slice(0));

  library.setMemory(memory.buffer);
  library.setInput(' input.tex \n\\end\n');
  library.setFileLoader(name => {
    const file = assets.texFiles.get(name);
    if (!file) {
      return Promise.reject(new Error(`Could not find file ${name}`));
    }
    return Promise.resolve(file.slice(0));
  });

  const instance = await WebAssembly.instantiate(assets.wasmModule, {
    library: library as unknown as WebAssembly.ModuleImports,
    env: { memory },
  });

  try {
    await library.executeAsync(instance.exports);
    const dvi = library.readFileSync('input.dvi');
    library.deleteEverything();
    return dvi;
  } catch (error) {
    const log = library.getConsoleLog();
    library.deleteEverything();
    console.error('TikZ TeX engine failed:', error);
    throw buildRenderError(log);
  }
}

async function dviToSvg(dvi: Uint8Array): Promise<string> {
  let html = '';
  async function* streamBuffer() {
    yield Buffer.from(dvi);
  }
  await dvi2html(streamBuffer(), {
    write(chunk: unknown) {
      html += String(chunk);
    },
  });
  return extractSvg(html);
}

function enqueueTikzRender<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task);
  renderQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function renderTikzSvgWithOptions(
  code: string,
  options: TikzRenderOptions = {},
  urls: TikzAssetUrls = {}
): Promise<TikzRenderResult> {
  // The TeX engine is not reentrant: renders are strictly serialized.
  return enqueueTikzRender(async () => {
    const assets = await ensureTikzReady(urls);
    const input = prepareTexInput(code);
    const dvi = await runTexEngine(input, assets, options);
    const svg = await dviToSvg(dvi);
    return { svg };
  });
}

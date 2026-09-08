// Runtime library for the web2js-compiled TeX engine (tex.wasm).
//
// Adapted from node-tikzjax (https://github.com/prinsss/node-tikzjax)
// `src/library.js`, which itself derives from:
// - https://github.com/artisticat1/tikzjax/blob/output-single-file/src/library.js
// - https://github.com/kisonecat/tikzjax/blob/master/src/library.js
// Licensed under the LaTeX Project Public License v1.3c:
// https://github.com/kisonecat/tikzjax/blob/master/LICENSE.md
//
// Modifications for AFFiNE:
// - converted to TypeScript, Node `Buffer` replaced with `Uint8Array`
// - console output is captured into a retrievable log buffer instead of
//   being printed, so render errors can surface the TeX log

import { tfmData } from '@prinsss/dvi2html';

type TexFile = {
  filename: string;
  position: number;
  position2: number;
  erstat: number;
  eoln: boolean;
  eof?: boolean;
  content: Uint8Array;
  descriptor?: number;
  stdin?: boolean;
  stdout?: boolean;
};

type StdStub = { stdout: true };

type WasmExports = {
  main: () => void;
  asyncify_start_unwind: (addr: number) => void;
  asyncify_stop_unwind: () => void;
  asyncify_start_rewind: (addr: number) => void;
  asyncify_stop_rewind: () => void;
};

type FileLoader = (name: string) => Promise<Uint8Array>;

type DeferredPromise = Promise<void> & {
  resolve: () => void;
  reject: (reason?: unknown) => void;
};

const textEncoder = new TextEncoder();

let filesystem: Record<string, Uint8Array> = {};
let files: Partial<TexFile>[] = [];
let showConsole = false;
let consoleBuffer = '';
let capturedLog: string[] = [];
let memory: ArrayBuffer | null = null;
let inputBuffer: string | null = null;
let callback: (() => void) | null = null;
let wasmExports: WasmExports | null = null;
let view: Int32Array | null = null;
let fileLoader: FileLoader | null = null;
let finished: DeferredPromise | null = null;

export const pages = 1100;
const DATA_ADDR = (pages - 100) * 1024 * 64;
const END_ADDR = pages * 1024 * 64;

let windingDepth = 0;
let sleeping = false;

function startUnwind() {
  if (view) {
    view[DATA_ADDR >> 2] = DATA_ADDR + 8;
    view[(DATA_ADDR + 4) >> 2] = END_ADDR;
  }
  wasmExports?.asyncify_start_unwind(DATA_ADDR);
  windingDepth = windingDepth + 1;
}

function startRewind() {
  wasmExports?.asyncify_start_rewind(DATA_ADDR);
  wasmExports?.main();
}

function stopRewind() {
  windingDepth = windingDepth - 1;
  wasmExports?.asyncify_stop_rewind();
}

function deferredPromise(): DeferredPromise {
  let _resolve!: () => void;
  let _reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  }) as DeferredPromise;
  promise.resolve = _resolve;
  promise.reject = _reject;
  return promise;
}

export function deleteEverything() {
  files = [];
  filesystem = {};
  memory = null;
  inputBuffer = null;
  callback = null;
  showConsole = false;
  finished = null;
  wasmExports = null;
  view = null;
  sleeping = false;
  windingDepth = 0;
  consoleBuffer = '';
}

export function clearConsoleLog() {
  capturedLog = [];
  consoleBuffer = '';
}

export function getConsoleLog() {
  return consoleBuffer.length
    ? [...capturedLog, consoleBuffer].join('\n')
    : capturedLog.join('\n');
}

export function writeFileSync(filename: string, buffer: Uint8Array) {
  filesystem[filename] = buffer;
}

export function readFileSync(filename: string): Uint8Array {
  for (const f of files) {
    if (f.filename === filename) {
      return (f.content as Uint8Array).slice(0, f.position);
    }
  }
  throw new Error(`Could not find file ${filename}`);
}

function openSync(filename: string, mode: string): number {
  const initialSleepState = sleeping;
  if (sleeping) {
    stopRewind();
    sleeping = false;
  }

  let buffer: Uint8Array = new Uint8Array();
  if (filesystem[filename]) {
    buffer = filesystem[filename];
  } else if (filename.endsWith('.tfm')) {
    buffer = Uint8Array.from(tfmData(filename.replace(/\.tfm$/, '')));
  } else if (mode === 'r') {
    // If this file has been opened before without an error, that means it was
    // written to. In that case assume the file can now be opened, so fall
    // through and create a fake file below. Otherwise attempt to find it.
    const descriptor = files.findIndex(
      element => element.filename === filename && !element.erstat
    );
    if (descriptor === -1) {
      if (initialSleepState || /\.(aux|log|dvi)$/.test(filename)) {
        // If we are returning from sleep and the file is still not in the
        // filesystem, or it is an aux, log, or dvi file, then report it as
        // not found.
        files.push({ filename, erstat: 1 });
        return files.length - 1;
      } else {
        // Pause the web assembly execution, and attempt to load the file.
        startUnwind();
        sleeping = true;
        setTimeout(() => {
          (async () => {
            try {
              const data = await fileLoader?.(`/tex_files/${filename}`);
              if (data) {
                filesystem[filename] = data;
              }
            } catch {
              // leave the file missing; the engine will report it
            }
            startRewind();
          })().catch(console.error);
        }, 0);
        return -1;
      }
    }
  }

  files.push({
    filename,
    position: 0,
    position2: 0,
    erstat: 0,
    eoln: false,
    content: buffer,
    descriptor: files.length,
  });
  return files.length - 1;
}

function writeSync(
  file: Partial<TexFile>,
  buffer: Uint8Array,
  pointer?: number,
  length?: number
) {
  if (pointer === undefined) pointer = 0;
  if (length === undefined) length = buffer.length - pointer;

  let content = file.content as Uint8Array;
  while (length > content.length - (file.position as number)) {
    const b = new Uint8Array(1 + content.length * 2);
    b.set(content);
    content = b;
    file.content = b;
  }

  content
    .subarray(file.position as number)
    .set(buffer.subarray(pointer, pointer + length));
  file.position = (file.position as number) + length;
}

function readSync(
  file: Partial<TexFile>,
  buffer: Uint8Array,
  pointer: number,
  length: number,
  seek: number
): number {
  const content = file.content as Uint8Array;
  if (pointer === undefined) pointer = 0;
  if (length === undefined) length = buffer.length - pointer;
  if (length > content.length - seek) length = content.length - seek;

  buffer.subarray(pointer).set(content.subarray(seek, seek + length));
  return length;
}

function writeToConsole(x: string) {
  consoleBuffer += x;
  if (consoleBuffer.includes('\n')) {
    const lines = consoleBuffer.split('\n');
    consoleBuffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.length) {
        capturedLog.push(line);
        if (showConsole) {
          console.log(line);
        }
      }
    }
  }
}

export function setShowConsole() {
  showConsole = true;
}

// setup
export function setMemory(m: ArrayBuffer) {
  memory = m;
  view = new Int32Array(m);
}

export function setInput(input: string, cb?: () => void) {
  inputBuffer = input;
  if (cb) callback = cb;
}

export function setFileLoader(c: FileLoader) {
  fileLoader = c;
}

export async function executeAsync(_wasmExports: unknown) {
  wasmExports = _wasmExports as WasmExports;
  finished = deferredPromise();
  wasmExports.main();
  wasmExports.asyncify_stop_unwind();
  return finished;
}

// provide time back to tex
export function getCurrentMinutes() {
  const d = new Date();
  return 60 * d.getHours() + d.getMinutes();
}

export function getCurrentDay() {
  return new Date().getDate();
}

export function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

export function getCurrentYear() {
  return new Date().getFullYear();
}

function bytesToString(buffer: Uint8Array): string {
  let result = '';
  for (const byte of buffer) {
    result += String.fromCharCode(byte);
  }
  return result;
}

// print
export function printString(descriptor: number, x: number) {
  const file: Partial<TexFile> | StdStub =
    descriptor < 0 ? { stdout: true } : files[descriptor];
  const length = new Uint8Array(memory as ArrayBuffer, x, 1)[0];
  const buffer = new Uint8Array(memory as ArrayBuffer, x + 1, length);
  const string = bytesToString(buffer);

  if (file.stdout) {
    writeToConsole(string);
    return;
  }

  writeSync(file as Partial<TexFile>, buffer);
}

export function printBoolean(descriptor: number, x: number) {
  const file: Partial<TexFile> | StdStub =
    descriptor < 0 ? { stdout: true } : files[descriptor];
  const result = x ? 'TRUE' : 'FALSE';

  if (file.stdout) {
    writeToConsole(result);
    return;
  }

  writeSync(file as Partial<TexFile>, textEncoder.encode(result));
}

export function printChar(descriptor: number, x: number) {
  const file: Partial<TexFile> | StdStub =
    descriptor < 0 ? { stdout: true } : files[descriptor];
  if (file.stdout) {
    writeToConsole(String.fromCharCode(x));
    return;
  }

  const b = new Uint8Array(1);
  b[0] = x;
  writeSync(file as Partial<TexFile>, b);
}

export function printInteger(descriptor: number, x: number) {
  const file: Partial<TexFile> | StdStub =
    descriptor < 0 ? { stdout: true } : files[descriptor];
  if (file.stdout) {
    writeToConsole(x.toString());
    return;
  }

  writeSync(file as Partial<TexFile>, textEncoder.encode(x.toString()));
}

export function printFloat(descriptor: number, x: number) {
  printInteger(descriptor, x);
}

export function printNewline(descriptor: number, _x: number) {
  const file: Partial<TexFile> | StdStub =
    descriptor < 0 ? { stdout: true } : files[descriptor];
  if (file.stdout) {
    writeToConsole('\n');
    return;
  }

  writeSync(file as Partial<TexFile>, textEncoder.encode('\n'));
}

export function reset(length: number, pointer: number) {
  const buffer = new Uint8Array(memory as ArrayBuffer, pointer, length);
  let filename = bytesToString(buffer);

  while (filename.endsWith('\0')) {
    filename = filename.slice(0, -1);
  }
  if (filename.startsWith('{')) {
    filename = filename.replace(/^{/g, '');
    filename = filename.replace(/}.*/g, '');
  }
  if (filename.startsWith('"')) {
    filename = filename.replace(/^"/g, '');
    filename = filename.replace(/".*/g, '');
  }
  filename = filename.replace(/ +$/g, '');
  filename = filename.replace(/^\*/, '');
  filename = filename.replace(/^TeXfonts:/, '');
  if (filename === 'TeXformats:TEX.POOL') filename = 'tex.pool';

  if (filename === 'TTY:') {
    files.push({
      filename: 'stdin',
      stdin: true,
      position: 0,
      position2: 0,
      erstat: 0,
      eoln: false,
      content: textEncoder.encode(inputBuffer ?? ''),
    });
    return files.length - 1;
  }

  return openSync(filename, 'r');
}

export function rewrite(length: number, pointer: number) {
  const buffer = new Uint8Array(memory as ArrayBuffer, pointer, length);
  let filename = bytesToString(buffer);

  filename = filename.replace(/ +$/g, '');
  if (filename.startsWith('"')) {
    filename = filename.replace(/^"/g, '');
    filename = filename.replace(/".*/g, '');
  }

  if (filename === 'TTY:') {
    files.push({
      filename: 'stdout',
      stdout: true,
      erstat: 0,
    });
    return files.length - 1;
  }

  return openSync(filename, 'w');
}

export function close(descriptor: number) {
  // The original implementation closes the underlying file descriptor,
  // which is a no-op for the in-memory filesystem.
  void files[descriptor];
}

export function eof(descriptor: number) {
  const file = files[descriptor];
  return file.eof ? 1 : 0;
}

export function erstat(descriptor: number) {
  const file = files[descriptor];
  return file.erstat;
}

export function eoln(descriptor: number) {
  const file = files[descriptor];
  return file.eoln ? 1 : 0;
}

export function inputln(
  descriptor: number,
  bypass_eoln: number,
  bufferp: number,
  firstp: number,
  lastp: number,
  _max_buf_stackp: number,
  buf_size: number
): boolean {
  const file = files[descriptor];
  const buffer = new Uint8Array(memory as ArrayBuffer, bufferp, buf_size);
  const first = new Uint32Array(memory as ArrayBuffer, firstp, 4);
  const last = new Uint32Array(memory as ArrayBuffer, lastp, 4);
  const content = file.content as Uint8Array;

  // cf. Matthew 19:30
  last[0] = first[0];

  // Input the first character of the line into |f^|
  if (bypass_eoln && !file.eof && file.eoln) {
    file.position2 = (file.position2 as number) + 1;
  }

  let endOfLine = content.indexOf(10, file.position2);
  if (endOfLine < 0) endOfLine = content.length;

  if ((file.position2 as number) >= content.length) {
    if (file.stdin) {
      if (callback) callback();
      tex_final_end();
    }
    file.eof = true;
    return false;
  } else {
    buffer.subarray(first[0]).set(content.subarray(file.position2, endOfLine));
    last[0] = first[0] + endOfLine - (file.position2 as number);

    while (buffer[last[0] - 1] === 32) last[0] = last[0] - 1;

    file.position2 = endOfLine;
    file.eoln = true;
  }

  return true;
}

export function get(descriptor: number, pointer: number, length: number) {
  const file = files[descriptor];
  const buffer = new Uint8Array(memory as ArrayBuffer);

  if (file.stdin) {
    if ((file.position as number) >= (inputBuffer?.length ?? 0)) {
      buffer[pointer] = 13;
      file.eof = true;
      if (callback) callback();
      tex_final_end();
    } else {
      buffer[pointer] = (inputBuffer as string)[
        file.position as number
      ].charCodeAt(0);
    }
  } else {
    if (file.descriptor) {
      if (
        readSync(file, buffer, pointer, length, file.position as number) === 0
      ) {
        buffer[pointer] = 0;
        file.eof = true;
        file.eoln = true;
        return;
      }
    } else {
      file.eof = true;
      file.eoln = true;
      return;
    }
  }

  file.eoln = false;
  if (buffer[pointer] === 10) file.eoln = true;
  if (buffer[pointer] === 13) file.eoln = true;

  file.position = (file.position as number) + length;
}

export function put(descriptor: number, pointer: number, length: number) {
  const file = files[descriptor];
  const buffer = new Uint8Array(memory as ArrayBuffer);
  writeSync(file, buffer, pointer, length);
}

export function tex_final_end() {
  if (consoleBuffer.length) writeToConsole('\n');
  if (finished) finished.resolve();
}

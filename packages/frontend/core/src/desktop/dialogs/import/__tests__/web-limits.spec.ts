import { expect, test } from 'vitest';

import {
  preflightWebMultiZipImport,
  preflightWebZipImport,
  WebImportLimitError,
  webImportLimits,
} from '../web-limits';

type ZipFixtureEntry = {
  name: string;
  content: string;
};

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

class ByteWriter {
  private readonly bytes: number[] = [];

  get length() {
    return this.bytes.length;
  }

  u16(value: number) {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff);
  }

  u32(value: number) {
    this.bytes.push(
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff
    );
  }

  raw(data: Uint8Array) {
    for (const byte of data) {
      this.bytes.push(byte);
    }
  }

  toUint8Array() {
    return new Uint8Array(this.bytes);
  }
}

/**
 * Builds a real, valid zip file using the STORE (no compression) method so
 * the fixture stays independent from any zip library.
 */
function buildZipFile(entries: ZipFixtureEntry[], fileName = 'test.zip'): File {
  const encoder = new TextEncoder();
  const writer = new ByteWriter();
  const centralRecords: {
    nameBytes: Uint8Array;
    crc: number;
    size: number;
    localHeaderOffset: number;
  }[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);
    const localHeaderOffset = writer.length;

    // Local file header
    writer.u32(0x04034b50);
    writer.u16(20); // version needed
    writer.u16(0); // flags
    writer.u16(0); // method: STORE
    writer.u16(0); // mod time
    writer.u16(0); // mod date
    writer.u32(crc);
    writer.u32(dataBytes.length); // compressed size
    writer.u32(dataBytes.length); // uncompressed size
    writer.u16(nameBytes.length);
    writer.u16(0); // extra length
    writer.raw(nameBytes);
    writer.raw(dataBytes);

    centralRecords.push({
      nameBytes,
      crc,
      size: dataBytes.length,
      localHeaderOffset,
    });
  }

  const centralDirectoryOffset = writer.length;
  for (const record of centralRecords) {
    // Central directory file header
    writer.u32(0x02014b50);
    writer.u16(20); // version made by
    writer.u16(20); // version needed
    writer.u16(0); // flags
    writer.u16(0); // method: STORE
    writer.u16(0); // mod time
    writer.u16(0); // mod date
    writer.u32(record.crc);
    writer.u32(record.size); // compressed size
    writer.u32(record.size); // uncompressed size
    writer.u16(record.nameBytes.length);
    writer.u16(0); // extra length
    writer.u16(0); // comment length
    writer.u16(0); // disk number start
    writer.u16(0); // internal attributes
    writer.u32(0); // external attributes
    writer.u32(record.localHeaderOffset);
    writer.raw(record.nameBytes);
  }
  const centralDirectorySize = writer.length - centralDirectoryOffset;

  // End of central directory record
  writer.u32(0x06054b50);
  writer.u16(0); // disk number
  writer.u16(0); // central directory disk
  writer.u16(centralRecords.length); // entries on this disk
  writer.u16(centralRecords.length); // total entries
  writer.u32(centralDirectorySize);
  writer.u32(centralDirectoryOffset);
  writer.u16(0); // comment length

  return new File([writer.toUint8Array()], fileName, {
    type: 'application/zip',
  });
}

test('preflightWebZipImport accepts a zip within limits', async () => {
  const zip = buildZipFile([
    { name: 'a.md', content: '# a' },
    { name: 'assets/pic.png', content: 'binary-ish' },
  ]);
  await expect(preflightWebZipImport(zip)).resolves.toBeUndefined();
});

test('preflightWebMultiZipImport accepts multiple zips within limits', async () => {
  const zipA = buildZipFile(
    [
      { name: 'a.md', content: '# a' },
      { name: 'notes/b.md', content: '# b' },
    ],
    'a.zip'
  );
  const zipB = buildZipFile([{ name: 'c.md', content: '# c' }], 'b.zip');
  await expect(
    preflightWebMultiZipImport([zipA, zipB])
  ).resolves.toBeUndefined();
});

test('preflightWebMultiZipImport accepts an empty file list', async () => {
  await expect(preflightWebMultiZipImport([])).resolves.toBeUndefined();
});

test('preflightWebMultiZipImport rejects when aggregate document count exceeds the limit', async () => {
  const limits = { ...webImportLimits, maxDocumentCount: 3 };
  const zipA = buildZipFile(
    [
      { name: 'a1.md', content: '# a1' },
      { name: 'a2.md', content: '# a2' },
    ],
    'a.zip'
  );
  const zipB = buildZipFile(
    [
      { name: 'b1.md', content: '# b1' },
      { name: 'b2.md', content: '# b2' },
    ],
    'b.zip'
  );

  // Each zip individually satisfies the per-zip limit (2 <= 3), but the
  // aggregate count (4) exceeds it.
  await expect(preflightWebMultiZipImport([zipA], limits)).resolves.toBe(
    undefined
  );
  await expect(
    preflightWebMultiZipImport([zipA, zipB], limits)
  ).rejects.toThrow(WebImportLimitError);
  await expect(
    preflightWebMultiZipImport([zipA, zipB], limits)
  ).rejects.toThrow(/too many documents/);
});

test('preflightWebMultiZipImport still enforces per-zip limits', async () => {
  const zipWithNestedZip = buildZipFile(
    [
      { name: 'a.md', content: '# a' },
      { name: 'inner.zip', content: 'fake nested zip' },
    ],
    'nested.zip'
  );
  const normalZip = buildZipFile([{ name: 'b.md', content: '# b' }], 'b.zip');

  await expect(
    preflightWebMultiZipImport([normalZip, zipWithNestedZip])
  ).rejects.toThrow(/nested zip/);
});

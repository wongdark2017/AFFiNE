import { expect, test } from 'vitest';

import { compareDocTitles, normalizeDocTitle } from './compare-doc-titles';

test('normalizeDocTitle maps empty titles to Untitled', () => {
  expect(normalizeDocTitle('', 'Untitled')).toBe('Untitled');
  expect(normalizeDocTitle('   ', 'Untitled')).toBe('Untitled');
  expect(normalizeDocTitle('Notes', 'Untitled')).toBe('Notes');
});

test('compareDocTitles sorts empty titles with Untitled', () => {
  expect(compareDocTitles('', 'Alpha', 'Untitled')).toBeGreaterThan(0);
  expect(compareDocTitles('Zebra', '', 'Untitled')).toBeGreaterThan(0);
});

test('compareDocTitles supports descending order', () => {
  expect(compareDocTitles('A', 'B', 'Untitled', true)).toBeGreaterThan(0);
});

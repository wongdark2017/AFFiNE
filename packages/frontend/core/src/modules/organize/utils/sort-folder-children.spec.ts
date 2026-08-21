import { expect, test } from 'vitest';

import {
  compareDisplayNames,
  sortIdsByDisplayName,
} from './sort-folder-children';

test('compareDisplayNames uses numeric-aware order', () => {
  expect(compareDisplayNames('文档2', '文档10')).toBeLessThan(0);
  expect(compareDisplayNames('Doc 10', 'Doc 2')).toBeGreaterThan(0);
});

test('compareDisplayNames is case-insensitive', () => {
  expect(compareDisplayNames('Alpha', 'alpha')).toBe(0);
});

test('sortIdsByDisplayName orders by display name', () => {
  expect(
    sortIdsByDisplayName([
      { id: 'b', name: 'Beta' },
      { id: 'c', name: '文档10' },
      { id: 'a', name: '文档2' },
    ])
  ).toEqual(['b', 'a', 'c']);
});

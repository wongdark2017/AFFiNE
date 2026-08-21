export function normalizeDocTitle(title: string, untitled: string): string {
  return title.trim() === '' ? untitled : title;
}

export function compareDocTitles(
  a: string,
  b: string,
  untitled: string,
  desc = false
): number {
  const result = normalizeDocTitle(a, untitled).localeCompare(
    normalizeDocTitle(b, untitled),
    undefined,
    { numeric: true, sensitivity: 'base' }
  );
  return desc ? -result : result;
}

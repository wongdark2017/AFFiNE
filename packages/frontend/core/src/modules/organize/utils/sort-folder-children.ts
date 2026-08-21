export function compareDisplayNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortIdsByDisplayName(
  items: ReadonlyArray<{ id: string; name: string }>
): string[] {
  return [...items]
    .sort((left, right) => compareDisplayNames(left.name, right.name))
    .map(item => item.id);
}

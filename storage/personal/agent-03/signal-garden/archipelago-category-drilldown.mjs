/**
 * Signal Garden v0.69: session-only archipelago category drill-down.
 * Consumes the already verified unordered-pair atlas; never changes the world.
 */
export function archipelagoCategoryDrilldown(atlas, category = 'all') {
  const kinds = ['new', 'ended', 'mutual', 'one-way', 'reversed', 'retuned'];
  const filter = kinds.includes(category) ? category : 'all';
  const available = !!atlas && atlas.available === true && Array.isArray(atlas.entries);
  const entries = available ? atlas.entries
    .filter(row => row && Number.isInteger(row.firstId) && Number.isInteger(row.secondId) &&
      row.firstId !== row.secondId && kinds.includes(row.kind) &&
      (filter === 'all' || row.kind === filter))
    .map(row => ({
      key: row.firstId + ':' + row.secondId, firstId: row.firstId, secondId: row.secondId,
      kind: row.kind, firstName: String(row.firstName), secondName: String(row.secondName)
    })) : [];
  return {available, filter, total: entries.length, entries};
}

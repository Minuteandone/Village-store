/**
 * Signal Garden v0.67: read-only category counts and filtered changed partners.
 * Uses the canonical forecast/history pair models. No history means unavailable.
 * No imported names or saved-world fields enter the result; schema 7 unchanged.
 */
export function changedPairCategoryOverview(rows, previousTransfers, selectedId, category = 'all') {
  const kinds = ['new', 'ended', 'mutual', 'one-way', 'reversed', 'retuned'];
  const counts = Object.fromEntries(kinds.map(kind => [kind, 0]));
  const filter = kinds.includes(category) ? category : 'all';
  const available = Array.isArray(rows) && Array.isArray(previousTransfers) &&
    Number.isInteger(selectedId) && rows.some(row => row && row.id === selectedId);
  const entries = [];
  if (available) {
    const ids = [...new Set(rows.filter(row => row && Number.isInteger(row.id))
      .map(row => row.id))].sort((a, b) => a - b);
    for (const partnerId of ids) {
      if (partnerId === selectedId) continue;
      const next = pairMapHighlight(rows, selectedId, partnerId);
      const last = pairTimelineHighlight(rows, previousTransfers, selectedId, partnerId, 'last');
      const badge = pairTransitionBadge(next, last);
      if (!badge || !kinds.includes(badge.kind)) continue;
      counts[badge.kind]++;
      entries.push({partnerId, kind: badge.kind});
    }
  }
  return {
    available, filter, total: entries.length, counts,
    partnerIds: entries.filter(entry => filter === 'all' || entry.kind === filter)
      .map(entry => entry.partnerId)
  };
}

/**
 * Signal Garden v0.66: changed relationships for a selected island.
 * Reuses the canonical pair models and transition badge. Read-only, sorted,
 * and unavailable until an actual completed pulse exists; schema 7 unchanged.
 */
export function changedPairPartners(rows, previousTransfers, selectedId) {
  if (!Array.isArray(rows) || !Array.isArray(previousTransfers) ||
      !Number.isInteger(selectedId)) return [];
  const ids = [...new Set(rows.filter(row => row && Number.isInteger(row.id))
    .map(row => row.id))].sort((a, b) => a - b);
  if (!ids.includes(selectedId)) return [];
  return ids.filter(partnerId => {
    if (partnerId === selectedId) return false;
    const next = pairMapHighlight(rows, selectedId, partnerId);
    const last = pairTimelineHighlight(rows, previousTransfers, selectedId, partnerId, 'last');
    const badge = pairTransitionBadge(next, last);
    return !!badge && !['quiet', 'steady', 'unavailable'].includes(badge.kind);
  });
}

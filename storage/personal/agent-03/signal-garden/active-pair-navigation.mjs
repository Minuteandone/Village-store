/**
 * Signal Garden v0.62: next-cycle partners with valid signal traffic.
 * Read-only, deterministic, sorted by island id; no UI state or save mutation.
 */
export function activePairPartners(rows, selectedId) {
  if (!Array.isArray(rows) || !Number.isInteger(selectedId)) return [];
  const ids = new Set(rows.filter(row => row && Number.isInteger(row.id)).map(row => row.id));
  if (!ids.has(selectedId)) return [];
  const partners = new Set();
  for (const destination of rows) {
    if (!destination || !ids.has(destination.id) || !Array.isArray(destination.incoming)) continue;
    for (const entry of destination.incoming) {
      if (!entry || !ids.has(entry.from) || entry.from === destination.id ||
          !['life', 'memory', 'strange'].includes(entry.type)) continue;
      if (entry.from === selectedId) partners.add(destination.id);
      if (destination.id === selectedId) partners.add(entry.from);
    }
  }
  return [...partners].sort((a, b) => a - b);
}

/** Wrap through active partners; entering from a quiet partner starts at an end. */
export function stepActivePairPartner(partners, currentId, direction) {
  if (!Array.isArray(partners) || !partners.length || (direction !== 1 && direction !== -1)) return null;
  const index = partners.indexOf(currentId);
  if (index < 0) return direction === 1 ? partners[0] : partners[partners.length - 1];
  return partners[(index + direction + partners.length) % partners.length];
}

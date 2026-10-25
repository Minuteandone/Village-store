/**
 * Signal Garden v0.70: read-only stepping through filtered archipelago pairs.
 * Uses the already-validated atlas drill-down entries; never mutates them.
 * Missing/empty history returns null rather than fabricating relationships.
 */
export function stepArchipelagoPair(entries, currentKey, direction) {
  if (!Array.isArray(entries) || !Number.isFinite(direction) || direction === 0) return null;
  const keys = [];
  const seen = new Set();
  for (const row of entries) {
    if (!row || !Number.isInteger(row.firstId) || !Number.isInteger(row.secondId) ||
        row.firstId >= row.secondId || typeof row.key !== 'string' ||
        row.key !== row.firstId + ':' + row.secondId || seen.has(row.key)) continue;
    seen.add(row.key);
    keys.push(row.key);
  }
  if (!keys.length) return null;
  const at = keys.indexOf(currentKey);
  if (at < 0) return direction > 0 ? keys[0] : keys[keys.length - 1];
  return keys[(at + (direction > 0 ? 1 : -1) + keys.length) % keys.length];
}

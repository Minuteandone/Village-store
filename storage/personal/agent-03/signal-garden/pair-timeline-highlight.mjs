/**
 * Signal Garden v0.64: inspect a selected pair's last completed migration
 * or next-cycle forecast on the map. Session-only, read-only, schema 7.
 * Names remain plain text; the UI must use textContent.
 */
export function pairTimelineHighlight(rows, previousTransfers, selectedId, partnerId, phase) {
  if (phase !== 'last' && phase !== 'next') return null;
  if (phase === 'last' && !Array.isArray(previousTransfers)) return null;
  if (phase === 'next') return pairMapHighlight(rows, selectedId, partnerId);
  if (!Array.isArray(rows)) return null;
  const byId = new Map(rows.filter(row => row && Number.isInteger(row.id)).map(row => [row.id, row]));
  if (!byId.has(selectedId) || !byId.has(partnerId) || selectedId === partnerId) return null;
  const historic = rows.filter(row => row && Number.isInteger(row.id)).map(row => ({
    id: row.id, name: row.name, incoming: []
  }));
  const destinations = new Map(historic.map(row => [row.id, row]));
  for (const transfer of previousTransfers) {
    if (!transfer || !Number.isInteger(transfer.from) || !Number.isInteger(transfer.to) ||
        transfer.from === transfer.to || !destinations.has(transfer.from) ||
        !destinations.has(transfer.to) || !['life', 'memory', 'strange'].includes(transfer.type)) continue;
    destinations.get(transfer.to).incoming.push({from: transfer.from, type: transfer.type});
  }
  const focus = pairMapHighlight(historic, selectedId, partnerId);
  if (!focus) return null;
  return {
    ...focus,
    description: 'Map pair timeline (last completed pulse): ' +
      focus.description.replace(/^Map pair focus: /, '')
        .replace(/forecast/g, 'last pulse').replace(/next cycle/g, 'last cycle')
  };
}

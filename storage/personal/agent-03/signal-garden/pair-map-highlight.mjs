/**
 * Signal Garden v0.63: read-only selected-pair forecast for the visual map.
 * Validates endpoints and families; never modifies rows or saved state.
 */
export function pairMapHighlight(rows, selectedId, partnerId) {
  if (!Array.isArray(rows) || !Number.isInteger(selectedId) ||
      !Number.isInteger(partnerId) || selectedId === partnerId) return null;
  const valid = rows.filter(row => row && Number.isInteger(row.id));
  const a = valid.find(row => row.id === selectedId);
  const b = valid.find(row => row.id === partnerId);
  if (!a || !b) return null;
  const families = ['life', 'memory', 'strange'];
  function traffic(destination, sourceId) {
    return families.filter(type => Array.isArray(destination.incoming) &&
      destination.incoming.some(entry => entry && entry.from === sourceId && entry.type === type));
  }
  const forward = traffic(b, selectedId);
  const backward = traffic(a, partnerId);
  const kind = forward.length && backward.length ? 'mutual' :
    forward.length ? 'outbound' : backward.length ? 'inbound' : 'quiet';
  const summary = kind === 'mutual'
    ? 'Mutual forecast: send ' + forward.join(', ') + '; receive ' + backward.join(', ') + '.'
    : kind === 'outbound'
      ? 'Outgoing-only forecast: send ' + forward.join(', ') + '.'
      : kind === 'inbound'
        ? 'Incoming-only forecast: receive ' + backward.join(', ') + '.'
        : 'Quiet forecast: no signals between these islands next cycle.';
  return {
    source: selectedId, target: partnerId, kind, forward, backward,
    description: 'Map pair focus: ' + String(a.name) + ' ↔ ' + String(b.name) + '. ' + summary
  };
}

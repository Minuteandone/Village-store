/**
 * Signal Garden v0.65: read-only relationship transition badge.
 * Inputs are canonical pair-map forecasts for the next and last pulse.
 * No mutation, save changes, or HTML interpretation; schema 7 unchanged.
 */
export function pairTransitionBadge(nextFocus, lastFocus) {
  const families = ['life', 'memory', 'strange'];
  function normalize(focus) {
    if (!focus || !Number.isInteger(focus.source) || !Number.isInteger(focus.target) ||
        focus.source === focus.target || !Array.isArray(focus.forward) ||
        !Array.isArray(focus.backward)) return null;
    const forward = families.filter(type => focus.forward.includes(type));
    const backward = families.filter(type => focus.backward.includes(type));
    const direction = forward.length && backward.length ? 'mutual' :
      forward.length ? 'outbound' : backward.length ? 'inbound' : 'quiet';
    return {source: focus.source, target: focus.target, forward, backward, direction};
  }
  const next = normalize(nextFocus);
  if (!next) return null;
  const last = normalize(lastFocus);
  if (!last || last.source !== next.source || last.target !== next.target) {
    return {
      kind: 'unavailable', label: 'Await first pulse',
      description: 'Pair transition: awaiting the first completed pulse. Next forecast: ' +
        describe(next) + '.'
    };
  }
  const identical = last.forward.join(',') === next.forward.join(',') &&
    last.backward.join(',') === next.backward.join(',');
  let kind, label;
  if (last.direction === 'quiet' && next.direction !== 'quiet') {
    kind = 'new'; label = 'New exchange';
  } else if (last.direction !== 'quiet' && next.direction === 'quiet') {
    kind = 'ended'; label = 'Exchange ended';
  } else if (last.direction === 'quiet' && next.direction === 'quiet') {
    kind = 'quiet'; label = 'Quiet in both';
  } else if (identical) {
    kind = 'steady'; label = 'Steady exchange';
  } else if (last.direction !== 'mutual' && next.direction === 'mutual') {
    kind = 'mutual'; label = 'Becoming mutual';
  } else if (last.direction === 'mutual' && next.direction !== 'mutual') {
    kind = 'one-way'; label = 'Becoming one-way';
  } else if ((last.direction === 'outbound' && next.direction === 'inbound') ||
             (last.direction === 'inbound' && next.direction === 'outbound')) {
    kind = 'reversed'; label = 'Direction reversed';
  } else {
    kind = 'retuned'; label = 'Families retuned';
  }
  return {
    kind, label,
    description: 'Pair transition: ' + label + '. Last pulse: ' +
      describe(last) + '. Next forecast: ' + describe(next) + '.'
  };
  function describe(focus) {
    if (focus.direction === 'quiet') return 'quiet';
    const parts = [];
    if (focus.forward.length) parts.push('send ' + focus.forward.join(', '));
    if (focus.backward.length) parts.push('receive ' + focus.backward.join(', '));
    return focus.direction + ' (' + parts.join('; ') + ')';
  }
}

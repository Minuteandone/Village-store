/**
 * Signal Garden v0.68: read-only archipelago-wide change atlas.
 * Counts unordered pairs exactly once using canonical last/next pair models.
 * Render its text via textContent; save schema 7 remains unchanged.
 */
export function archipelagoChangeAtlas(rows, previousTransfers, cycle) {
  const kinds = ['new','ended','mutual','one-way','reversed','retuned'];
  const labels = {new:'New exchanges',ended:'Ended exchanges',mutual:'Becoming mutual',
    'one-way':'Becoming one-way',reversed:'Reversed direction',retuned:'Retuned families'};
  const counts = Object.fromEntries(kinds.map(kind => [kind,0]));
  const prefix = 'Cycle ' + cycle + ' archipelago change atlas (last pulse → next forecast): ';
  if (!Array.isArray(rows) || !Array.isArray(previousTransfers))
    return {available:false,pairCount:0,total:0,counts,steady:0,quiet:0,entries:[],
      text:prefix+'complete a pulse to compare relationships across all islands.'};
  const byId = new Map();
  for (const row of rows) if (row && Number.isInteger(row.id) && !byId.has(row.id)) byId.set(row.id,row);
  const ids = [...byId.keys()].sort((a,b)=>a-b);
  const entries = [];
  let steady = 0, quiet = 0;
  for (let i=0;i<ids.length;i++) for (let j=i+1;j<ids.length;j++) {
    const firstId=ids[i], secondId=ids[j];
    const next=pairMapHighlight(rows,firstId,secondId);
    const last=pairTimelineHighlight(rows,previousTransfers,firstId,secondId,'last');
    const badge=pairTransitionBadge(next,last);
    if (!badge) continue;
    if (badge.kind==='steady') {steady++;continue;}
    if (badge.kind==='quiet') {quiet++;continue;}
    if (!kinds.includes(badge.kind)) continue;
    counts[badge.kind]++;
    entries.push({firstId,secondId,kind:badge.kind,
      firstName:String(byId.get(firstId).name??('Island '+firstId)),
      secondName:String(byId.get(secondId).name??('Island '+secondId))});
  }
  const pairCount=ids.length*(ids.length-1)/2;
  const tally=kinds.map(kind=>labels[kind].toLowerCase()+' '+counts[kind]).join(', ');
  const details=kinds.filter(kind=>counts[kind]).map(kind=>labels[kind]+': '+
    entries.filter(entry=>entry.kind===kind).map(entry=>entry.firstName+' ↔ '+entry.secondName).join('; ')+'.').join(' ');
  const text=prefix+entries.length+' changed of '+pairCount+' island pairs; '+
    tally+'; steady '+steady+', quiet '+quiet+'. '+
    (details||'No changed relationships across the archipelago.');
  return {available:true,pairCount,total:entries.length,counts,steady,quiet,entries,text};
}

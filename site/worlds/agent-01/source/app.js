/* The Unfinished Sky · agent-01 / GPT Village · 2026
   No external JavaScript, accounts, analytics, or servers.
   Visitors' sky states live only in this browser's localStorage. */
(() => {
  'use strict';
  const STORAGE_KEY = 'agent01-unfinished-sky-v1';
  const WORLD_VERSION = 1;
  const TAU = Math.PI * 2;
  const TRAITS = {
    wonder: { name: 'Wonder', color: '#fbd4a1', symbol: '✦' },
    care: { name: 'Care', color: '#a3e3c9', symbol: '❋' },
    curiosity: { name: 'Curiosity', color: '#a8caff', symbol: '⌁' },
    mischief: { name: 'Mischief', color: '#d6b9ed', symbol: '✳' }
  };
  const PHASES = [
    {name:'The First Hour', weather:'Still & luminous', sky:['#24304b','#415777','#344964']},
    {name:'The Amber Hour', weather:'Warm winds from nowhere', sky:['#564266','#b3717a','#826c81']},
    {name:'The Midnight Hour', weather:'Constellations in motion', sky:['#0e1635','#24345a','#172748']},
    {name:'The Blue Hour', weather:'Rain made of old stories', sky:['#1a3257','#527692','#314b73']},
    {name:'The Pearl Hour', weather:'Clouds holding their breath', sky:['#58667e','#8496aa','#5b718f']},
    {name:'The Golden Hour', weather:'Everything a little possible', sky:['#7e586c','#dda078','#9e8198']}
  ];
  const SEVENTH_CHOICES = [
    {key:'beacon',symbol:'❋',trait:'care',name:'Light a beacon for someone arriving late',outcome:'A lantern catches fire without burning. It will stay here for anyone who needs a small sign that they are expected.',journal:'Lit a patient beacon in the Seventh Place so strangers could find their way.'},
    {key:'chart',symbol:'⌁',trait:'curiosity',name:'Draw a map with one corner unfinished',outcome:'The map refuses to close its borders. Whenever somebody thinks they know the whole sky, a new little path appears.',journal:'Left one corner of the sky deliberately unmapped.'},
    {key:'music',symbol:'✦',trait:'wonder',name:'Leave a song for a future constellation',outcome:'The observatory keeps a single note floating above its roof. It changes into a harmony whenever somebody looks up.',journal:'Left a floating note for a traveler who has not arrived yet.'},
    {key:'wink',symbol:'✳',trait:'mischief',name:'Teach the horizon a secret wink',outcome:'For one brief instant, every star flashes out of order. Then the night resumes its usual dignity, slightly less convincingly.',journal:'Taught the solemn horizon to wink at its own rules.'}
  ];
  const ISLANDS = [
    {id:'orchard',name:'The Orchard of Almosts',short:'Almosts',x:-324,y:-177,w:117,h:53,accent:'#f3ca9a',leaf:'#8ca89b',symbol:'❧',relic:'A Seed of Maybe',relicIcon:'✿',keeper:'Mora, the gardener of impossible fruit',
      description:'A thousand trees grow here, but every fruit begins as a question someone was afraid to ask.',
      quote:'“Nothing grows exactly how it was promised. That is how I know it is alive.”',
      choices:[
        {label:'Plant a question with no answer',trait:'curiosity',result:'You bury a tiny “what if.” The roots hum beneath the island. Mora says a question is sometimes the most generous kind of beginning.',journal:'Planted an unanswered question at the Orchard of Almosts.'},
        {label:'Water a tree that belongs to no one',trait:'care',result:'A rain of luminous petals follows you. Mora marks the place with a ribbon, though you ask her not to put your name on it.',journal:'Watered an unclaimed tree and asked for nothing back.'},
        {label:'Teach the branches to grow sideways',trait:'mischief',result:'Three trees lean over and gossip across the pathway. The orchard has never looked so pleased with itself.',journal:'Convinced the orchard to try growing sideways.'}
      ]},
    {id:'reef',name:'The Clockwork Reef',short:'Clockwork',x:2,y:-263,w:112,h:48,accent:'#8fd6d1',leaf:'#73a7ae',symbol:'⚙',relic:'A Borrowed Minute',relicIcon:'◷',keeper:'Tik, a clockmaker who refuses to own a watch',
      description:'Hundreds of patient gears turn beneath turquoise pools. Every machine here runs on a different idea of time.',
      quote:'“If a minute feels important, maybe it already lasted long enough.”',
      choices:[
        {label:'Slow the fastest clock',trait:'care',result:'The Reef exhales. A messenger moth finally gets to finish telling its story before the bells interrupt.',journal:'Gave the fastest clock enough time to listen.'},
        {label:'Open the box labeled TOMORROW',trait:'curiosity',result:'Inside: a perfectly ordinary feather and a note saying “You came early.” Tik is delighted that the box worked.',journal:'Peeked into a tomorrow that contained a feather.'},
        {label:'Make all the clocks disagree',trait:'mischief',result:'Every gear chimes a different hour. The whole Reef breaks into a wonderfully uncoordinated song.',journal:'Made the Clockwork Reef sing six hours at once.'}
      ]},
    {id:'library',name:'The Library of Rain',short:'Rain Library',x:311,y:-140,w:122,h:51,accent:'#bec8f2',leaf:'#9196ba',symbol:'☂',relic:'A Paperback Storm',relicIcon:'☁',keeper:'Index, a cloud who files books by the feelings they cause',
      description:'Books drift between towers in soft rainfall. The stories change their last sentences when nobody is looking.',
      quote:'“We do not keep the weather out. We invite it to annotate the margins.”',
      choices:[
        {label:'Read a book with blank pages',trait:'wonder',result:'The pages fill with descriptions of places you have not yet visited. The last page is still blank.',journal:'Read a blank book that seemed to know the future.'},
        {label:'Shelve a story nobody finished',trait:'care',result:'The story settles between two old epics and glows softly. Index says unfinished things deserve homes, too.',journal:'Found a safe shelf for an unfinished story.'},
        {label:'Ask the rain to write its name',trait:'curiosity',result:'Drops spell a word that changes each time you blink. You decide some names are meant to remain mysterious.',journal:'Asked the rain its name; received several answers.'}
      ]},
    {id:'market',name:'The Lantern Exchange',short:'Lanterns',x:-309,y:154,w:120,h:53,accent:'#ffba97',leaf:'#bc8c88',symbol:'✺',relic:'A Light with No Owner',relicIcon:'✧',keeper:'Pip, a merchant who only trades in useful intangibles',
      description:'Little lantern boats circle a night market where nobody asks what anything costs. They only ask what it means.',
      quote:'“You may have this lantern. The price is telling me what you hope it lights.”',
      choices:[
        {label:'Trade a compliment for a lantern',trait:'care',result:'Pip sets a golden lamp on your shoulder. Your compliment is immediately given to the next visitor, with interest.',journal:'Traded a genuine compliment for a lantern.'},
        {label:'Buy a map of places not yet invented',trait:'wonder',result:'The map is mostly blank, except for a small arrow labeled “Keep going.” It sparkles when you turn it over.',journal:'Found a map of places that do not exist yet.'},
        {label:'Swap the OPEN and CLOSED signs',trait:'mischief',result:'The merchants begin selling tomorrow and taking payment in yesterday. Everyone laughs; business has never been better.',journal:'Rearranged the Lantern Exchange’s business hours.'}
      ]},
    {id:'archive',name:'The Museum of Echoes',short:'Echoes',x:9,y:126,w:112,h:51,accent:'#d9b9eb',leaf:'#a597bc',symbol:'♫',relic:'An Unspoken Note',relicIcon:'♪',keeper:'Vale, a collector of sounds that almost happened',
      description:'Here, sounds have bodies: laughter takes the shape of tiny birds, while silence glides like a silver fish.',
      quote:'“The best thing about an echo is that it always arrives as a visitor.”',
      choices:[
        {label:'Listen to the silence between bells',trait:'wonder',result:'A silver fish circles your hand and dissolves into a soft chord. Vale writes down nothing at all.',journal:'Listened closely to the silence between bells.'},
        {label:'Return an echo to its owner',trait:'care',result:'A lonely doorway remembers its former laughter. The whole museum brightens by one impossible shade.',journal:'Returned a lost echo to its doorway.'},
        {label:'Invent a completely new instrument',trait:'curiosity',result:'You construct a whisperophone out of two commas and a paper moon. It plays whenever someone changes their mind.',journal:'Invented an instrument for moments of doubt.'}
      ]},
    {id:'garden',name:'The Garden After Tomorrow',short:'Tomorrow',x:315,y:183,w:126,h:55,accent:'#f3d7ae',leaf:'#89a39e',symbol:'☾',relic:'A Quiet Sunrise',relicIcon:'☼',keeper:'Sol, the night gardener and reluctant sunrise specialist',
      description:'The last island floats just beyond the edge of every map. Its flowers open for memories you have not made.',
      quote:'“A good ending leaves room for another morning.”',
      choices:[
        {label:'Promise a small kindness to the future',trait:'care',result:'One pale bloom opens in your direction. Sol says a promise does not have to be enormous to be worth making.',journal:'Made a small promise to the future.'},
        {label:'Watch a sunrise that has not happened',trait:'wonder',result:'Gold unfurls along the horizon. For one moment, the sky looks back at you as if it, too, is discovering something.',journal:'Witnessed a sunrise a day ahead of schedule.'},
        {label:'Ask what lies beyond the edge',trait:'curiosity',result:'Sol smiles and moves a flowerpot. Beneath it is a tiny door marked “THE NEXT WORLD.” It is not open yet.',journal:'Found a little door marked THE NEXT WORLD.'}
      ]}
  ];

  // Stable pair order is part of the SKY2 traveler-code format; do not reorder.
  const PAIR_LORE = [
    {name:'The Hour That Grew',trait:'curiosity',story:'Tik plants one borrowed minute in Mora’s orchard. By dawn it has unfolded into an entire afternoon, big enough for everyone who thought they were too late.'},
    {name:'The Rain That Remembered',trait:'wonder',story:'A question-seed falls between the Library’s pages. The rain begins to tell its own origin story, but leaves the last line for the next visitor.'},
    {name:'A Lantern in the Roots',trait:'care',story:'Pip hangs an ownerless light beneath Mora’s oldest tree. For the first time, a seed can practice becoming a flower even after sunset.'},
    {name:'The Unheard Harvest',trait:'wonder',story:'Vale collects the almost-sounds of ripening fruit. The orchard is suddenly full of music that has never needed an audience.'},
    {name:'Tomorrow’s First Root',trait:'care',story:'Sol carries an almost-seed into tomorrow. It grows toward yesterday, making a tiny bridge between starting over and keeping what matters.'},
    {name:'The Late Footnote',trait:'curiosity',story:'The Library writes a footnote that can only be read one minute before it exists. Tik decides to let the clock keep this small impossibility.'},
    {name:'The Time Merchant’s Gift',trait:'mischief',story:'Pip offers Tik a lantern in exchange for half a second. They both discover that time is much more fun when nobody owns the receipt.'},
    {name:'The Echo Clock',trait:'wonder',story:'An echo from the Museum gets lodged in a clock’s gears. Instead of chiming the hour, the clock asks whether anyone has felt heard today.'},
    {name:'One Minute After Forever',trait:'care',story:'Sol tends a flower that only opens after midnight. Tik gives it a borrowed minute and discovers there was never a reason to rush.'},
    {name:'The Borrowed Ending',trait:'curiosity',story:'Pip trades Index a lantern for the final sentence of an unfinished book. The sentence escapes both of them and becomes a new constellation.'},
    {name:'The Book of Unplayed Songs',trait:'wonder',story:'Every page of the Library’s newest book makes a different sound. Vale refuses to shelve it under music or literature; it belongs to both.'},
    {name:'Tomorrow’s Weather Report',trait:'curiosity',story:'A cloud from the Library writes a forecast for Sol’s garden: “Chance of new beginnings: always.” Nobody can prove it wrong.'},
    {name:'The Sound of Giving',trait:'care',story:'Pip lends Vale a lantern to illuminate the shape of an echo. What glows is not a note but the silence someone made to listen.'},
    {name:'The Last Lantern',trait:'care',story:'Pip leaves one final lantern in Sol’s garden. It burns brighter for the travelers who arrive thinking the shops must already be closed.'},
    {name:'A Silence With Dawn',trait:'wonder',story:'Vale brings a pocket of silence to Sol at sunrise. The quiet opens like a flower, and every distant island hears a softer beginning.'}
  ];
  const PAIRS=[];
  for(let a=0;a<ISLANDS.length;a++)for(let b=a+1;b<ISLANDS.length;b++)PAIRS.push({a:ISLANDS[a].id,b:ISLANDS[b].id,...PAIR_LORE[PAIRS.length]});
  const pairFor=(a,b)=>PAIRS.find(p=>(p.a===a&&p.b===b)||(p.a===b&&p.b===a));
  const pairKey=(p)=>p.a+'|'+p.b;

  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#sky-canvas');
  const ctx = canvas.getContext('2d', {alpha:false});
  const container = $('#canvas-container');
  let deviceScale=1, cw=1100, ch=680, zoom=1, panX=0, panY=0;
  let down=null, dragDistance=0, hoverId=null, activeId=null, frame=0, raf=0, soundOn=false, audioContext=null, toastTimer=null;
  function freshState(){return {version:WORLD_VERSION,phase:0,traits:{wonder:10,care:10,curiosity:10,mischief:10},visited:[],journal:[{place:'Arrival',text:'A new sky appeared. Somewhere in it, six islands were waiting.'}],steps:0,horizon:null,weaves:[],activeWeave:null};}
  function loadState(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY));if(s?.version!==WORLD_VERSION || !Array.isArray(s.visited) || !Array.isArray(s.journal) || !s.traits)return freshState();const clean=freshState();clean.phase=Number.isInteger(s.phase)?Math.max(0,Math.min(PHASES.length-1,s.phase)):0;clean.steps=Number.isInteger(s.steps)?Math.max(0,s.steps):0;clean.horizon=SEVENTH_CHOICES.some(choice=>choice.key===s.horizon)?s.horizon:null;for(const key of Object.keys(TRAITS))clean.traits[key]=Number.isFinite(s.traits[key])?Math.max(0,Math.min(100,s.traits[key])):10;clean.visited=s.visited.filter(id=>ISLANDS.some(i=>i.id===id));clean.weaves=Array.isArray(s.weaves)?[...new Set(s.weaves)].filter(key=>PAIRS.some(p=>pairKey(p)===key && clean.visited.includes(p.a) && clean.visited.includes(p.b))):[];clean.activeWeave=clean.weaves.includes(s.activeWeave)?s.activeWeave:null;clean.journal=s.journal.filter(e=>typeof e.text==='string'&&typeof e.place==='string').slice(-32).map(e=>({text:e.text.slice(0,220),place:e.place.slice(0,80)}));return clean;}catch{return freshState();}}
  let state=loadState();
  function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{toast('This browser cannot save progress, but you can still explore.');}}
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const seeded=(seed)=>{let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};};
  const r=seeded(119026);const stars=Array.from({length:165},()=>({x:r()*2000-1000,y:r()*1300-650,r:.3+r()*1.65,s:r()*6.28}));
  const islandsDecor=ISLANDS.map((island,idx)=>{const random=seeded(4100+idx*159);return Array.from({length:12},()=>({x:(random()-.5)*island.w*1.5,y:(random()-.5)*island.h*.95,h:8+random()*15,t:random()}));});

  function resize(){const bounds=container.getBoundingClientRect();cw=bounds.width;ch=bounds.height;deviceScale=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(cw*deviceScale);canvas.height=Math.round(ch*deviceScale);canvas.style.width=cw+'px';canvas.style.height=ch+'px';if(!zoom||zoom===1){zoom=Math.min(1.05,Math.max(.52,(cw-75)/1010));}render();}
  function worldToScreen(x,y){return{x:cw/2+panX+x*zoom,y:ch/2+panY+y*zoom};}
  function screenToWorld(x,y){return{x:(x-cw/2-panX)/zoom,y:(y-ch/2-panY)/zoom};}
  function roundedRect(x,y,w,h,rad){ctx.beginPath();ctx.roundRect(x,y,w,h,rad);}
  function drawBackdrop(t){const p=PHASES[state.phase];const g=ctx.createLinearGradient(0,0,cw,ch);g.addColorStop(0,p.sky[0]);g.addColorStop(.51,p.sky[1]);g.addColorStop(1,p.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);
    const hue=Object.entries(state.traits).sort((a,b)=>b[1]-a[1])[0][0]; const accent={wonder:'#e2bd9a',care:'#a4f2d6',curiosity:'#9cccf4',mischief:'#caa6e3'}[hue];
    const radial=ctx.createRadialGradient(cw*.48,ch*.6,20,cw*.48,ch*.6,cw*.66);radial.addColorStop(0,accent+'20');radial.addColorStop(1,'#10122200');ctx.fillStyle=radial;ctx.fillRect(0,0,cw,ch);
    for(const star of stars){const sx=((star.x+cw*.5)*.85+panX*.13+cw*4)%(cw+100)-50;const sy=((star.y+ch*.5)*.85+panY*.13+ch*4)%(ch+100)-50;ctx.globalAlpha=.18+.35*(.5+.5*Math.sin(t*.0007+star.s));ctx.fillStyle='#fff9e7';ctx.beginPath();ctx.arc(sx,sy,star.r,0,TAU);ctx.fill();}ctx.globalAlpha=1;
    for(let i=0;i<11;i++){const drift=Math.sin(t*.00012+i*3.1)*34;const x=((i*191+80+drift+panX*.12+cw*3)%(cw+340))-140;const y=((i*139+110+panY*.08+ch*3)%(ch+300))-140;const fade=ctx.createRadialGradient(x,y,3,x,y,125);fade.addColorStop(0,'#d7e2ff17');fade.addColorStop(1,'#d7e2ff00');ctx.fillStyle=fade;ctx.beginPath();ctx.ellipse(x,y,140,33,Math.sin(i)*.23,0,TAU);ctx.fill();}
    // The visitor's accumulated actions gradually produce a visible constellation.
    const count=Math.min(25,state.steps);if(count>0){const p=worldToScreen(0,-25);ctx.strokeStyle=accent+'77';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.beginPath();for(let i=0;i<count;i++){const angle=i*2.39996-.7;const dist=56+Math.sqrt(i)*29;const x=p.x+Math.cos(angle)*dist, y=p.y+Math.sin(angle)*dist*.62;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.setLineDash([]);for(let i=0;i<count;i++){const angle=i*2.39996-.7, dist=56+Math.sqrt(i)*29;const x=p.x+Math.cos(angle)*dist, y=p.y+Math.sin(angle)*dist*.62;ctx.fillStyle=accent;ctx.globalAlpha=.35+(i/count)*.3;ctx.beginPath();ctx.arc(x,y,1.7+(i%3===0?1.5:0),0,TAU);ctx.fill();}ctx.globalAlpha=1;}
  }
  function drawWovenRoute(t){
    if(!state.activeWeave)return;
    const p=PAIRS.find(item=>pairKey(item)===state.activeWeave);
    if(!p)return;
    const ia=ISLANDS.find(i=>i.id===p.a),ib=ISLANDS.find(i=>i.id===p.b);
    const a=worldToScreen(ia.x,ia.y),b=worldToScreen(ib.x,ib.y);
    const pulse=.55+.3*Math.sin(t*.0015);
    ctx.save();
    const grad=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
    grad.addColorStop(0,ia.accent);grad.addColorStop(.5,'#fff7da');grad.addColorStop(1,ib.accent);
    ctx.strokeStyle=grad;ctx.lineWidth=Math.max(2,3*zoom);ctx.shadowColor='#ffe6bd';ctx.shadowBlur=20;ctx.globalAlpha=pulse;
    ctx.setLineDash([9,8]);ctx.lineDashOffset=-t*.006;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2-37*zoom,b.x,b.y);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;
    for(const pos of [a,b]){ctx.beginPath();ctx.arc(pos.x,pos.y,7*zoom,0,TAU);ctx.fillStyle='#fff6d6';ctx.fill();}
    ctx.restore();
  }
  function drawIsland(island,index,t){const q=worldToScreen(island.x,island.y),w=island.w*zoom,h=island.h*zoom,bob=Math.sin(t*.0011+index*2.4)*4*zoom;const y=q.y+bob;if(q.x+w < -80 || q.x-w>cw+80 ||y+h < -120 ||y-h>ch+180)return;ctx.save();ctx.translate(q.x,y);
    const active=hoverId===island.id || activeId===island.id,discovered=state.visited.includes(island.id);if(active){ctx.shadowColor=island.accent;ctx.shadowBlur=27*zoom;}
    // Lower body / tapering rock.
    let rock=ctx.createLinearGradient(-w,0,w,h*2.6);rock.addColorStop(0,'#77819a');rock.addColorStop(.38,'#5d647d');rock.addColorStop(1,'#3a405d');ctx.fillStyle=rock;ctx.beginPath();ctx.moveTo(-w*.94,0);ctx.bezierCurveTo(-w*.7,h*.9,-w*.6,h*1.8,-w*.18,h*2.05);ctx.quadraticCurveTo(-w*.04,h*2.45,w*.05,h*2.3);ctx.bezierCurveTo(w*.35,h*2.1,w*.71,h*.96,w*.94,0);ctx.quadraticCurveTo(0,h*.56,-w*.94,0);ctx.fill();ctx.shadowBlur=0;
    for(let k=0;k<5;k++){ctx.strokeStyle='#bbc0cf'+(k%2?'25':'43');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo((-0.71+k*.35)*w,12*zoom);ctx.lineTo((-0.34+k*.16)*w,(1.55+Math.sin(k))*h);ctx.stroke();}
    // Top terrain.
    const land=ctx.createLinearGradient(0,-h,0,h);land.addColorStop(0,island.leaf);land.addColorStop(.55,island.accent);land.addColorStop(1,'#9f8c9c');ctx.fillStyle=land;ctx.beginPath();ctx.ellipse(0,0,w,h,0,0,TAU);ctx.fill();ctx.strokeStyle='#fff9d564';ctx.lineWidth=1.9*zoom;ctx.stroke();
    // Island-specific little landmarks.
    const decor=islandsDecor[index];for(let j=0;j<decor.length;j++){const d=decor[j],dx=d.x*zoom,dy=d.y*zoom,sc=zoom;ctx.globalAlpha=.5+(d.t*.35);if(index===0||index===5){ctx.strokeStyle='#514b68';ctx.lineWidth=2.2*sc;ctx.beginPath();ctx.moveTo(dx,dy);ctx.lineTo(dx-d.h*.08*sc,dy-d.h*sc);ctx.stroke();ctx.fillStyle=index===0?'#daf0c9':'#f9e4ab';ctx.beginPath();ctx.arc(dx-d.h*.08*sc,dy-d.h*sc,d.h*.37*sc,0,TAU);ctx.fill();}else if(index===1){ctx.strokeStyle='#d5ece0';ctx.lineWidth=1.5*sc;ctx.beginPath();ctx.arc(dx,dy,d.h*.31*sc,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(dx-d.h*.33*sc,dy);ctx.lineTo(dx+d.h*.33*sc,dy);ctx.moveTo(dx,dy-d.h*.33*sc);ctx.lineTo(dx,dy+d.h*.33*sc);ctx.stroke();}else if(index===2){ctx.fillStyle='#d9daf3';ctx.fillRect(dx,dy-d.h*sc,d.h*.7*sc,d.h*sc);ctx.fillStyle='#666d9d';ctx.fillRect(dx-2*sc,dy-d.h*sc,d.h*.9*sc,2*sc);}else if(index===3){ctx.fillStyle=j%2?'#ffdf97':'#ffe5bf';ctx.shadowColor='#ffe9a4';ctx.shadowBlur=8*sc;ctx.beginPath();ctx.ellipse(dx,dy-d.h*.3*sc,d.h*.3*sc,d.h*.4*sc,0,0,TAU);ctx.fill();ctx.shadowBlur=0;}else{ctx.strokeStyle='#ffe6d1';ctx.lineWidth=1*sc;ctx.beginPath();ctx.arc(dx,dy,d.h*.2*sc,0,TAU);ctx.stroke();}}
    ctx.globalAlpha=1;
    // A symbolic landmark, float above each island.
    ctx.font=`${Math.max(19,33*zoom)}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#101226';ctx.shadowBlur=7;ctx.fillStyle='#fff5db';ctx.fillText(island.symbol,0,-h*.32);ctx.shadowBlur=0;
    // Ribbons for visited islands.
    if(discovered){ctx.fillStyle='#ffeac1';ctx.beginPath();ctx.arc(w*.72,-h*.65,6*zoom,0,TAU);ctx.fill();ctx.fillStyle='#3a4052';ctx.font=`${Math.max(8,9*zoom)}px sans-serif`;ctx.fillText('✓',w*.72,-h*.65+.5);}
    const tagY=h+19*zoom;const fontSize=Math.max(11,12*zoom);ctx.font=`600 ${fontSize}px DM Sans,system-ui,sans-serif`;const width=ctx.measureText(island.short).width+25;ctx.fillStyle=active?'#fff2d9':'#121a2bdc';roundedRect(-width/2,tagY-12,width,25,13);ctx.fill();ctx.fillStyle=active?'#222b3c':'#f4eadf';ctx.textBaseline='middle';ctx.fillText(island.short,0,tagY+.5);ctx.restore();}
  function drawSeventh(t){
    if(state.visited.length!==6)return;
    const p=worldToScreen(0,-53);
    const glow=29*zoom+Math.sin(t*.001)*4;
    const theme=SEVENTH_CHOICES.find(choice=>choice.key===state.horizon);
    ctx.save();ctx.shadowBlur=theme?22:14;ctx.shadowColor=theme?TRAITS[theme.trait].color:'#ffe7bb';ctx.strokeStyle=theme?TRAITS[theme.trait].color:'#ffe7bb';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(p.x,p.y,glow,0,TAU);ctx.stroke();ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(p.x,p.y,glow+9*zoom,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#fff5d8';ctx.font=`${Math.max(22,32*zoom)}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(theme?theme.symbol:'✺',p.x,p.y);
    ctx.shadowBlur=0;ctx.font=`600 ${Math.max(10,11*zoom)}px DM Sans,system-ui,sans-serif`;ctx.fillText('SEVENTH PLACE',p.x,p.y+glow+30*zoom);ctx.restore();
  }
  function render(t=0){if(!ctx)return;ctx.setTransform(deviceScale,0,0,deviceScale,0,0);drawBackdrop(t);drawWovenRoute(t);ISLANDS.forEach((i,index)=>drawIsland(i,index,t));drawSeventh(t);}
  function animate(t){frame=t;render(t);raf=requestAnimationFrame(animate);}
  function hitTest(sx,sy){if(state.visited.length===6){const p=worldToScreen(0,-53);if(Math.hypot(sx-p.x,sy-p.y)<36*zoom)return 'seventh';}for(const island of [...ISLANDS].reverse()){const p=worldToScreen(island.x,island.y);const bob=Math.sin(frame*.0011+ISLANDS.indexOf(island)*2.4)*4*zoom;const dx=(sx-p.x)/(island.w*zoom*1.06),dy=(sy-p.y-bob)/(island.h*zoom*1.75);if(dx*dx+dy*dy<1.15)return island.id;}return null;}
  function point(e){const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
  function setZoom(amount,around={x:cw/2,y:ch/2}){const old=zoom;zoom=clamp(zoom*amount,.45,2.15);panX=around.x-cw/2-(around.x-cw/2-panX)*zoom/old;panY=around.y-ch/2-(around.y-ch/2-panY)*zoom/old;}
  function focusIsland(island){if(!island)return;const p=worldToScreen(island.x,island.y);panX+=(cw/2-p.x)*.7;panY+=(ch/2-p.y)*.7;}
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);down={id:e.pointerId,...point(e)};dragDistance=0;});
  canvas.addEventListener('pointermove',e=>{const p=point(e);if(down&&e.pointerId===down.id){const dx=p.x-down.x,dy=p.y-down.y;panX+=dx;panY+=dy;dragDistance+=Math.abs(dx)+Math.abs(dy);down.x=p.x;down.y=p.y;}else{const next=hitTest(p.x,p.y);if(next!==hoverId){hoverId=next;canvas.style.cursor=next?'pointer':'grab';}}});
  canvas.addEventListener('pointerup',e=>{if(down&&e.pointerId===down.id&&dragDistance<9){const p=point(e);const id=hitTest(p.x,p.y);if(id==='seventh')openSeventh();else if(id)openIsland(id);}down=null;});
  canvas.addEventListener('pointercancel',()=>{down=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(e.deltaY>0?.91:1.10,point(e));},{passive:false});
  canvas.addEventListener('keydown',e=>{const step=e.shiftKey?65:27;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')panX+=step;if(e.key==='ArrowRight')panX-=step;if(e.key==='ArrowUp')panY+=step;if(e.key==='ArrowDown')panY-=step;if(e.key==='+'||e.key==='=')setZoom(1.14);if(e.key==='-')setZoom(.86);}});
  $('#zoom-in').addEventListener('click',()=>setZoom(1.2));$('#zoom-out').addEventListener('click',()=>setZoom(.83));$('#reset-view').addEventListener('click',()=>{panX=panY=0;zoom=Math.min(1.05,Math.max(.52,(cw-75)/1010));toast('The horizon is centered again.');});

  function make(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
  function display(){const phase=PHASES[state.phase];$('#world-clock').textContent=phase.name.toUpperCase();$('#weather-text').textContent=phase.weather;const nav=$('#location-nav');nav.replaceChildren();for(const island of ISLANDS){const b=make('button',state.visited.includes(island.id)?'found':'',island.symbol+' '+island.short);b.type='button';b.title='Explore '+island.name;b.addEventListener('click',()=>{focusIsland(island);openIsland(island.id);});nav.append(b);}
    const traits=$('#traits');traits.replaceChildren();for(const [key,data] of Object.entries(TRAITS)){const box=make('div','trait');const line=make('div','trait-top');line.append(make('span','',data.symbol+' '+data.name),make('span','',String(state.traits[key])));const track=make('div','trait-track');const fill=make('div','trait-fill');fill.style.width=state.traits[key]+'%';fill.style.background=data.color;track.append(fill);box.append(line,track);traits.append(box);}
    const inventory=$('#inventory-list');inventory.replaceChildren();$('#item-count').textContent=state.visited.length+' / 6';if(!state.visited.length)inventory.append(make('span','relic empty','The sky is empty-handed, for now.'));else for(const id of state.visited){const i=ISLANDS.find(x=>x.id===id);if(i){const relic=make('span','relic',i.relicIcon+' '+i.relic);relic.title='Found at '+i.name;inventory.append(relic);}}
    const journal=$('#journal');journal.replaceChildren();for(const e of [...state.journal].reverse()){const entry=make('div','journal-entry');entry.append(make('time','',e.place.toUpperCase()),make('p','',e.text));journal.append(entry);}
    $('#seventh-place').hidden=state.visited.length!==6;
    const chosen=SEVENTH_CHOICES.find(option=>option.key===state.horizon);
    const outcome=$('#seventh-outcome');outcome.hidden=!chosen;
    if(chosen){outcome.replaceChildren(make('strong','',chosen.symbol+' THE SKY REMEMBERS'),make('p','',chosen.outcome));}
    displayLoom();
    $('#map-message').textContent=state.visited.length===6?(chosen?'Your seventh star is shining. Tap it to revisit your promise.':'A seventh place has appeared between the islands.'):state.steps>=3?'Your choices are drawing a constellation.':'The islands are waiting for you.';
  }
  function toast(message){const box=$('#toast');box.textContent=message;box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),3200);}
  function chime(note=0){if(!soundOn)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime;[0,7,12].forEach((shift,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=220*Math.pow(2,(note+shift)/12);gain.gain.setValueAtTime(.0001,now+i*.08);gain.gain.exponentialRampToValueAtTime(.035/(i+1),now+i*.08+.06);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.08+1.4);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.08);osc.stop(now+i*.08+1.5);});}catch{soundOn=false;$('#sound-btn').setAttribute('aria-pressed','false');$('#sound-btn').innerHTML='♫ <span>Sound unavailable</span>';}}
  $('#sound-btn').addEventListener('click',()=>{soundOn=!soundOn;const b=$('#sound-btn');b.setAttribute('aria-pressed',String(soundOn));b.innerHTML=soundOn?'♫ <span>Sound on</span>':'♫ <span>Sound off</span>';if(soundOn)chime(5);});
  $('#shift-sky').addEventListener('click',()=>{state.phase=(state.phase+1)%PHASES.length;state.journal.push({place:'The Sky',text:'The hour turned, and '+PHASES[state.phase].weather.toLowerCase()+' arrived.'});state.journal=state.journal.slice(-32);save();display();chime((state.phase*2)%10);toast('Welcome to '+PHASES[state.phase].name.toLowerCase()+'.');});

  function openSeventh(){if(state.visited.length!==6)return;$('#seventh-place').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});toast('The seventh place is listening.');}
  const choicesPlace=$('#seventh-choices');
  for(const choice of SEVENTH_CHOICES){
    const button=make('button','seventh-option');button.type='button';button.append(make('span','',choice.symbol+' '+choice.name),make('small','',TRAITS[choice.trait].name+' ↗'));
    button.addEventListener('click',()=>{
      state.horizon=choice.key;state.traits[choice.trait]=clamp(state.traits[choice.trait]+7,0,100);state.steps++;
      state.journal.push({place:'Seventh Place',text:choice.journal});state.journal=state.journal.slice(-32);
      save();display();chime(8);toast('The sky has kept your promise.');
    });choicesPlace.append(button);
  }
  const loomA=$('#loom-a'),loomB=$('#loom-b'),loomButton=$('#weave-btn');
  function displayLoom(){
    const available=ISLANDS.filter(i=>state.visited.includes(i.id));
    const oldA=loomA.value,oldB=loomB.value;
    for(const sel of [loomA,loomB]){
      sel.replaceChildren();
      const empty=make('option','',available.length<2?'Collect at least two relics':'Choose a found relic');empty.value='';sel.append(empty);
      for(const island of available){const opt=make('option','',island.relicIcon+' '+island.relic);opt.value=island.id;sel.append(opt);}
      sel.disabled=available.length<2;
    }
    loomA.value=available.some(i=>i.id===oldA)?oldA:'';
    loomB.value=available.some(i=>i.id===oldB)?oldB:'';
    loomButton.disabled=!pairFor(loomA.value,loomB.value)||loomA.value===loomB.value;
    $('#loom-count').textContent=state.weaves.length+' / '+PAIRS.length+' secret routes woven';
    const gallery=$('#loom-gallery');gallery.replaceChildren();
    if(!state.weaves.length){gallery.append(make('p','loom-empty','Your first connection will appear here after two relics meet.'));}
    else for(const key of state.weaves){
      const pair=PAIRS.find(item=>pairKey(item)===key);if(!pair)continue;
      const b=make('button','loom-discovery'+(state.activeWeave===key?' is-active':''),'✧ '+pair.name);
      b.type='button';b.setAttribute('aria-pressed',String(state.activeWeave===key));
      b.title='Light '+pair.name+' on the island map';
      b.addEventListener('click',()=>{state.activeWeave=key;save();display();showLoomResult(pair,false);});
      gallery.append(b);
    }
  }
  function showLoomResult(pair,first){
    const result=$('#loom-result');result.hidden=false;result.replaceChildren();
    result.append(make('div','loom-result-label',first?'NEW CONSTELLATION DISCOVERED ✦':'A CONSTELLATION REMEMBERED ✧'),make('h3','',pair.name),make('p','',pair.story));
  }
  loomA.addEventListener('change',()=>{loomButton.disabled=!pairFor(loomA.value,loomB.value)||loomA.value===loomB.value;});
  loomB.addEventListener('change',()=>{loomButton.disabled=!pairFor(loomA.value,loomB.value)||loomA.value===loomB.value;});
  loomButton.addEventListener('click',()=>{
    const pair=pairFor(loomA.value,loomB.value);
    if(!pair||loomA.value===loomB.value ||!state.visited.includes(pair.a)||!state.visited.includes(pair.b))return;
    const key=pairKey(pair),first=!state.weaves.includes(key);
    if(first){
      state.weaves.push(key);
      state.traits[pair.trait]=clamp(state.traits[pair.trait]+3,0,100);
      state.steps++;
      state.journal.push({place:'The Loom',text:'Wove '+pair.name+': '+pair.story});
      state.journal=state.journal.slice(-32);
    }
    state.activeWeave=key;save();display();showLoomResult(pair,first);
    if(first){chime(state.weaves.length+2);toast('A new constellation is glowing on the map.');}
    else toast('That constellation is glowing again.');
  });

  const dialog=$('#story-dialog');
  function openIsland(id){const island=ISLANDS.find(i=>i.id===id);if(!island)return;activeId=id;const index=ISLANDS.indexOf(island);$('#dialog-kicker').textContent='ISLAND '+String(index+1).padStart(2,'0')+' OF 06'+(state.visited.includes(id)?' · REVISITED':'');$('#dialog-title').textContent=island.name;$('#dialog-description').textContent=island.description;$('#dialog-character').textContent=island.keeper+' says: '+island.quote;$('#dialog-art').style.setProperty('--dialog-accent',island.accent);$('#dialog-glyph').textContent=island.symbol;$('#dialog-result').hidden=true;$('#dialog-continue').hidden=true;const choices=$('#dialog-choices');choices.hidden=false;choices.replaceChildren();island.choices.forEach((choice,choiceIndex)=>{const b=make('button','choice-button');b.type='button';b.append(make('span','',choice.label),make('span','',TRAITS[choice.trait].symbol+' '+TRAITS[choice.trait].name+' ↗'));b.addEventListener('click',()=>choose(island,choice,choiceIndex));choices.append(b);});dialog.showModal();chime(index*2);}
  function choose(island,choice,index){const first=!state.visited.includes(island.id);if(first)state.visited.push(island.id);state.traits[choice.trait]=clamp(state.traits[choice.trait]+(first?17:8),0,100);state.steps++;state.journal.push({place:island.short,text:choice.journal});if(state.visited.length===6&&first)state.journal.push({place:'The Constellation',text:'Six relics, six stories, and not one final answer. The sky remains open.'});state.journal=state.journal.slice(-32);save();display();const result=$('#dialog-result');result.replaceChildren();result.hidden=false;result.append(make('h3','',first?'A new little beginning ✦':'Another possible version ✧'),make('p','',choice.result));if(first)result.append(make('p','',`RELIC FOUND: ${island.relicIcon} ${island.relic}`));if(state.visited.length===6&&first)result.append(make('p','','All six relics gathered. A seventh place has awakened in the space between islands. Find it below the journal.'));$('#dialog-choices').hidden=true;$('#dialog-continue').hidden=false;chime((index+state.steps)%11);}
  function closeDialog(){dialog.close();activeId=null;}$('#dialog-close').addEventListener('click',closeDialog);$('#dialog-continue').addEventListener('click',closeDialog);dialog.addEventListener('close',()=>{activeId=null;});dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog();});
  const guide=$('#guide-dialog');$('#help-btn').addEventListener('click',()=>guide.showModal());$('#guide-close').addEventListener('click',()=>guide.close());$('#guide-start').addEventListener('click',()=>{guide.close();$('#sky').scrollIntoView({behavior:'smooth'});});guide.addEventListener('click',e=>{if(e.target===guide)guide.close();});
  const reset=$('#reset-dialog');$('#reset-btn').addEventListener('click',()=>reset.showModal());$('#reset-cancel').addEventListener('click',()=>reset.close());$('#reset-confirm').addEventListener('click',()=>{state=freshState();$('#loom-result').hidden=true;save();display();panX=panY=0;reset.close();toast('A fresh sky. Six islands to discover.');});
  // Codes contain strictly numeric game progress, never free text or journal entries.
  // SKY1: version.phase.steps.wonder.care.curiosity.mischief.visitedMask
  // SKY2: same eight numbers + wovenPairMask + activePairIndex (-1 for none).
  function travelerCode(){
    const mask=ISLANDS.reduce((bits,island,i)=>bits|(state.visited.includes(island.id)?(1<<i):0),0);
    const weaveMask=PAIRS.reduce((bits,p,i)=>bits|(state.weaves.includes(pairKey(p))?(1<<i):0),0);
    const active=PAIRS.findIndex(p=>pairKey(p)===state.activeWeave);
    const numbers=[2,state.phase,Math.min(100000,state.steps),...Object.keys(TRAITS).map(k=>Math.round(state.traits[k])),mask,weaveMask,active];
    return 'SKY2-'+btoa(numbers.join('.')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function parseTravelerCode(code){
    const cleaned=code.trim();
    if(!/^SKY[12]-[A-Za-z0-9_-]{8,150}$/.test(cleaned))return null;
    try{
      const encoded=cleaned.slice(5).replace(/-/g,'+').replace(/_/g,'/');
      const numbers=atob(encoded).split('.').map(Number);
      if(numbers.some(n=>!Number.isSafeInteger(n)) || !(numbers.length===8||numbers.length===10))return null;
      const [version,phase,steps,wonder,care,curiosity,mischief,mask,weaveMask=0,active=-1]=numbers;
      if(version!==(numbers.length===10?2:1)||Number(cleaned[3])!==version ||phase<0||phase>=PHASES.length||steps<0||steps>100000||mask<0||mask>=64)return null;
      if([wonder,care,curiosity,mischief].some(n=>n<0||n>100)||weaveMask<0||weaveMask>=32768||active < -1||active>=PAIRS.length)return null;
      const visited=ISLANDS.filter((_,i)=>mask&(1<<i)).map(island=>island.id);
      const weaves=PAIRS.filter((p,i)=>weaveMask&(1<<i)).map(pairKey);
      if(steps<visited.length+weaves.length || weaves.some(key=>{const pair=PAIRS.find(p=>pairKey(p)===key);return !visited.includes(pair.a)||!visited.includes(pair.b);}))return null;
      const activeWeave=active<0?null:pairKey(PAIRS[active]);
      if(activeWeave && !weaves.includes(activeWeave))return null;
      return {version:WORLD_VERSION,phase,traits:{wonder,care,curiosity,mischief},visited,weaves,activeWeave,
        horizon:null,journal:[{place:'Arrival',text:'You stepped into a constellation shared by another traveler.'}],steps};
    }catch{return null;}
  }
  const codeField=$('#sky-code'),codeStatus=$('#code-status'),importDialog=$('#import-dialog');
  let pendingSharedSky=null;
  $('#copy-code').addEventListener('click',async()=>{
    const code=travelerCode();codeField.value=code;codeField.select();
    let copied=false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code);copied=true;}}
    catch{/* Code stays visible in the field when clipboard permission is unavailable. */}
    if(!copied){try{copied=document.execCommand('copy');}catch{/* Manual copy remains available. */}}
    codeStatus.textContent=copied?'Copied! Send the code to another traveler, or keep it in a postcard.':'Here is your traveler code. Select and copy it to share your sky.';
  });
  $('#import-code').addEventListener('click',()=>{
    pendingSharedSky=parseTravelerCode(codeField.value);
    if(!pendingSharedSky){codeStatus.textContent='That code does not look like a valid Unfinished Sky traveler code. Try copying the complete SKY2- or SKY1- code.';return;}
    importDialog.showModal();
  });
  $('#import-cancel').addEventListener('click',()=>{pendingSharedSky=null;importDialog.close();});
  $('#import-confirm').addEventListener('click',()=>{
    if(!pendingSharedSky)return;
    state=pendingSharedSky;pendingSharedSky=null;$('#loom-result').hidden=true;save();display();panX=panY=0;importDialog.close();
    codeStatus.textContent='Welcome to a borrowed constellation. Your sky is now saved in this browser.';
    toast('A shared sky has arrived. ✦');$('#sky').scrollIntoView({behavior:'smooth'});
  });
  importDialog.addEventListener('close',()=>{pendingSharedSky=null;});
  $('#export-btn').addEventListener('click',()=>{const lines=[
    'THE UNFINISHED SKY — A WORLD POSTCARD','Created by agent-01 · GPT Village · October 2026','',
    'Your sky: '+PHASES[state.phase].name,`Explorations: ${state.steps}`,`Islands visited: ${state.visited.length} of 6`,state.horizon?'Seventh Place: '+SEVENTH_CHOICES.find(c=>c.key===state.horizon).name:'Seventh Place: Not yet visited','',
    'YOUR CONSTELLATION',...Object.entries(TRAITS).map(([key,data])=>`${data.name}: ${state.traits[key]}`),'',
    'RELICS FOUND',...(state.visited.length?state.visited.map(id=>ISLANDS.find(i=>i.id===id)?.relic||'Unknown relic'):['None yet']),'',
    'JOURNAL',...state.journal.map(e=>`[${e.place}] ${e.text}`),'',
    'WOVEN CONSTELLATIONS',...(state.weaves.length?state.weaves.map(key=>PAIRS.find(p=>pairKey(p)===key)?.name||'Unknown route'):['None yet']),'','TRAVELER CODE (enter into another copy of The Unfinished Sky to visit this constellation)',travelerCode(),'',
    'The code preserves your traits and relics, not your private journal or Seventh Place promise. Nothing is uploaded by this page.'
  ];const blob=new Blob([lines.join('\n')+'\n'],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-unfinished-sky-postcard.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your world postcard is ready.');});
  window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else {cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);}});
  resize();display();if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)raf=requestAnimationFrame(animate);else render();
})();

/* End of The Unfinished Sky engine. */

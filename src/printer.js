import { esc, money, short } from './lib.js';

// Receipt printer under the cloud (ported from AppZapper's Zap Slip). The black bar is the printer:
// "Print receipt" feeds a thermal slip out of the slot (stepped height + whirr), pull/tap tears it off,
// a stamp thunks on, then "Make a share card" draws a 1080x1350 PNG. No card/account details on the slip.
// who = header line (e.g. "@brianball"); safe = html for the "why it's safe" panel (optional).
export function printer(s, { who = '', safe = '' } = {}) {
  const rows = [];
  for (const p of s.plans.filter(p => p.price > 0)) rows.push([p.name.toUpperCase(), money(p.price)]);
  const paid = s.meters.filter(m => m.cost > 0);
  for (const m of paid) rows.push([short(m.service), money(m.cost)]);
  const free = s.meters.length - paid.length;
  if (free) rows.push([`${free}× inside free tier`, '$0.00']);
  const total = s.base + s.overage;
  const data = { who, period: s.periodStart, rows, total: money(total), renew: s.domains?.length ? money(s.renew12) : '', stamp: s.overage > 0 ? 'PAID' : total > 0 ? 'NO OVERAGE ✓' : 'FREE ✓' };
  const row = (a, b, c = '') => `<div class="pr-row ${c}"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
  const html = `<div class="printer" id="printer">
<div class="pr-bar">${safe ? '<button type="button" class="pr-safe" id="safeBtn" aria-expanded="false" aria-controls="safe"><i class="led"></i><span>READ-ONLY · WHY IT\'S SAFE</span></button>' : '<span class="pr-safe" style="cursor:default"><i class="led"></i><span>READ-ONLY · CF COST</span></span>'}
<button type="button" class="pr-go" id="prGo">🧾 Print receipt</button></div>
<div class="pr-slot" id="prSlot"></div>
<div class="pr-feed" id="prFeed"><div class="pr-slip" id="prSlip" tabindex="0" aria-label="Receipt">
<div class="pr-wm">CF COST</div>
<div class="pr-c pr-sm">*** CLOUDFLARE SPEND RECEIPT ***</div>
${who ? `<div class="pr-c pr-b">${esc(who)}</div>` : ''}
<div class="pr-c pr-sm">PERIOD FROM ${esc(s.periodStart)}</div>
<div class="pr-hr"></div>
${rows.map(r => row(r[0], r[1])).join('')}
<div class="pr-hr"></div>
${row('TOTAL / MO', money(total), 'pr-big')}
${data.renew ? row('Domain renewals, next 12 mo', data.renew, 'pr-sm') : ''}
<div class="pr-hr"></div>
<div class="pr-stampwrap"><div class="pr-stamp${s.overage > 0 ? '' : ' ok'}">${esc(data.stamp)}</div></div>
<div class="pr-bars"></div>
<div class="pr-c pr-b">THANK YOU FOR SHIPPING</div>
<div class="pr-c pr-sm">cfcost.com · see yours</div>
<div class="pr-perf"></div>
</div></div>
<div class="pr-hint" id="prHint">Sound on.</div>
<div class="pr-after" id="prAfter" hidden><button type="button" class="pr-png" id="prPng">Make a share card</button>
<div id="prShare" hidden><img id="prImg" alt="This receipt as an image"><p class="pr-hint">Long-press or right-click to save, then post it.</p></div></div>
${safe}
</div>`;
  const js = `(()=>{const $=id=>document.getElementById(id),S=$('prSlip'),D=${JSON.stringify(data).replace(/</g, '\\u003c')};
let state='idle',ac;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const A=()=>ac||(ac=new (window.AudioContext||window.webkitAudioContext)());
function noise(d){const a=A(),b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1;const s=a.createBufferSource();s.buffer=b;return s}
function snd(f){try{f()}catch(_){}}
function whirr(d){snd(()=>{const a=A(),t=a.currentTime,o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter();o.type='sawtooth';o.frequency.value=92;f.type='bandpass';f.frequency.value=1400;f.Q.value=2;o.connect(f).connect(g).connect(a.destination);g.gain.setValueAtTime(0,t);for(let i=0;i<d*22;i++){const s=t+i/22;g.gain.setValueAtTime(.09,s);g.gain.setValueAtTime(.02,s+.03)}g.gain.setValueAtTime(0,t+d);o.start(t);o.stop(t+d+.05)})}
function rip(){snd(()=>{const a=A(),t=a.currentTime,n=noise(.45),f=a.createBiquadFilter(),g=a.createGain();f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(900,t);f.frequency.exponentialRampToValueAtTime(4200,t+.4);g.gain.setValueAtTime(.0001,t);for(let i=0;i<14;i++)g.gain.setValueAtTime(.12+Math.random()*.25,t+i*.03),g.gain.setValueAtTime(.03,t+i*.03+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.45);n.connect(f).connect(g).connect(a.destination);n.start(t)})}
function thunk(){snd(()=>{const a=A(),t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(38,t+.18);g.gain.setValueAtTime(.6,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.3)})}
(function(){const b=S.querySelector('.pr-bars');let seed=7;for(const ch of D.total+D.period)seed=(seed*31+ch.charCodeAt(0))>>>0;for(let i=0;i<46;i++){seed=(seed*1103515245+12345)>>>0;const e=document.createElement('i');e.style.width=(1+(seed>>16)%3)+'px';e.style.marginRight=(1+((seed>>8)%3))+'px';b.appendChild(e)}})();
function print(){if(state==='printing')return;state='printing';const f=$('prFeed');f.classList.remove('torn');S.style.transform='';S.querySelector('.pr-stamp').classList.remove('on');$('prAfter').hidden=true;$('prShare').hidden=true;
 f.style.transition='none';f.style.height='0px';f.offsetHeight;const h=S.scrollHeight,dur=reduce?0:Math.min(3.2,h/170);
 $('prSlot').classList.add('live');$('prGo').disabled=true;$('prHint').textContent='Printing…';whirr(dur);
 f.style.transition='height '+dur+'s steps('+Math.max(1,Math.round(h/14))+')';f.style.height=h+'px';
 setTimeout(()=>{state='printed';$('prSlot').classList.remove('live');S.classList.add('grab');$('prHint').textContent='Pull it down (or tap it) to tear it off ↓'},dur*1000+80)}
function tear(){if(state!=='printed')return;state='torn';rip();S.classList.remove('grab');S.style.transform='';$('prFeed').classList.add('torn');$('prHint').textContent='';
 setTimeout(()=>{S.querySelector('.pr-stamp').classList.add('on');thunk();$('prAfter').hidden=false;$('prGo').disabled=false;$('prGo').textContent='🧾 Print it again';$('prHint').textContent='Fresh off the press.'},650)}
let y0=null,moved=false;
S.addEventListener('pointerdown',e=>{if(state!=='printed')return;y0=e.clientY;moved=false;S.setPointerCapture(e.pointerId)});
S.addEventListener('pointermove',e=>{if(y0==null)return;const dy=Math.max(0,e.clientY-y0),m=Math.min(dy,90);if(dy>4)moved=true;S.style.transform='translateY('+m*.5+'px) rotate('+m*-.03+'deg)';if(dy>90){y0=null;tear()}});
S.addEventListener('pointerup',()=>{if(y0==null)return;y0=null;if(!moved)tear();else if(state==='printed')S.style.transform=''});
S.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='Enter')tear()});
$('prGo').onclick=print;
const sb=$('safeBtn'),sp=$('safe');if(sb&&sp)sb.onclick=()=>{sp.hidden=!sp.hidden;sb.setAttribute('aria-expanded',!sp.hidden)};
$('prPng').onclick=async()=>{try{await document.fonts.ready}catch(_){}const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.fillStyle='#f38020';x.fillRect(0,0,W,H);const rs=D.rows.slice(0,11),more=D.rows.length>rs.length;
 const ph=330+(rs.length+(more?1:0))*44+(D.renew?44:0)+60+130+90,pw=660,px=(W-pw)/2,py=Math.max(150,(H-ph)/2+20);x.save();x.translate(W/2,py+ph/2);x.rotate(-.025);x.translate(-W/2,-(py+ph/2));
 x.shadowColor='#0007';x.shadowBlur=60;x.shadowOffsetY=30;x.fillStyle='#fdfbf5';x.beginPath();x.moveTo(px,py+10);for(let i=0;i<=25;i++)x.lineTo(px+i*pw/25,py+(i%2?0:10));x.lineTo(px+pw,py+ph);x.lineTo(px,py+ph);x.fill();x.shadowColor='transparent';
 let y=py+100;const ink='#22201c',MONO='"DM Mono",ui-monospace,monospace';
 const C=(t,f,col)=>{x.font=f;x.fillStyle=col||ink;x.textAlign='center';x.fillText(t,W/2,y,pw-80);y+=f.includes('60px')?78:40};
 const L=(a,b,f)=>{x.font=f||'500 26px '+MONO;x.fillStyle=ink;x.textAlign='left';x.fillText(a,px+44,y,pw-260);if(b){x.textAlign='right';x.fillText(b,px+pw-44,y)}y+=44};
 const hr=()=>{x.setLineDash([8,6]);x.strokeStyle='#22201c99';x.lineWidth=2;x.beginPath();x.moveTo(px+44,y-22);x.lineTo(px+pw-44,y-22);x.stroke();x.setLineDash([]);y+=16};
 C('CF COST','60px "Bowlby One", Impact, sans-serif');C('CLOUDFLARE SPEND RECEIPT','500 22px '+MONO,'#6d6a62');if(D.who)C(D.who,'500 28px '+MONO);C('PERIOD FROM '+D.period,'500 20px '+MONO,'#6d6a62');hr();
 for(const r of rs)L(r[0].length>26?r[0].slice(0,25)+'…':r[0],r[1]);if(more)L('+'+(D.rows.length-rs.length)+' more');hr();
 L('TOTAL / MO',D.total,'700 38px '+MONO);if(D.renew)L('Domains, next 12 mo',D.renew,'500 22px '+MONO);hr();
 x.save();x.translate(W/2,y+30);x.rotate(-.1);const col=D.stamp==='PAID'?'#c2341b':'#1f8a3a';x.strokeStyle=col;x.fillStyle=col;x.globalAlpha=.85;x.lineWidth=6;x.font='40px "Bowlby One", Impact, sans-serif';const sw=x.measureText(D.stamp).width+44;x.strokeRect(-sw/2,-34,sw,68);x.textAlign='center';x.fillText(D.stamp,0,14);x.restore();y+=130;
 C('THANK YOU FOR SHIPPING','700 26px '+MONO);
 x.restore();x.font='60px "Bowlby One", Impact, sans-serif';x.fillStyle='#fff';x.textAlign='center';x.fillText('What does Cloudflare cost you?',W/2,95,W-80);x.font='500 34px '+MONO;x.fillText('cfcost.com',W/2,H-50);
 $('prImg').src=c.toDataURL('image/png');$('prShare').hidden=false};
})();`;
  return { html, js };
}

export const PRINTER_CSS = `.printer{justify-self:center;width:min(560px,100%);display:grid;justify-items:center;--paper:#fdfbf5;--pink:#22201c}
.pr-bar{width:100%;display:flex;align-items:center;gap:12px;background:#111;color:#e9e6df;border-radius:18px 18px 0 0;padding:8px 8px 8px 16px;font:500 12px "DM Mono",ui-monospace,monospace;letter-spacing:.08em}
.pr-safe{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;flex:1;min-width:0;padding:6px 0}
.pr-safe[hidden]{display:none}
.led{width:10px;height:10px;border-radius:50%;background:#3ddc84;box-shadow:0 0 6px #3ddc84,0 0 14px #3ddc84;animation:glow 2.4s ease-in-out infinite;flex:none}
@keyframes glow{50%{box-shadow:0 0 3px #3ddc84,0 0 6px #3ddc84;opacity:.75}}
.pr-go{margin-left:auto;font:500 13px "DM Mono",monospace;color:#111;background:#3ddc84;border:0;border-radius:999px;padding:8px 14px;cursor:pointer;white-space:nowrap;letter-spacing:.02em}
.pr-go[disabled]{opacity:.5;cursor:default}
.pr-safe:focus-visible,.pr-go:focus-visible,.pr-png:focus-visible,.pr-slip:focus-visible{outline:2px solid #3ddc84;outline-offset:3px}
.pr-slot{width:100%;height:18px;background:linear-gradient(#141414,#1e1e1e);border-radius:0 0 18px 18px;position:relative}
.pr-slot::after{content:"";position:absolute;left:12%;right:12%;top:7px;height:4px;border-radius:4px;background:#000;box-shadow:0 0 0 1px #2a2a2a,0 0 14px var(--glow,transparent);transition:box-shadow .4s}
.pr-slot.live{--glow:#3ddc8499}
.pr-feed{margin:-9px auto 0;width:min(84%,400px);height:0;overflow:hidden;position:relative;z-index:2;text-align:left}
.pr-slip{background:var(--paper);color:var(--pink);font:13px/1.55 "DM Mono",ui-monospace,monospace;padding:20px 20px 26px;position:relative;touch-action:none;user-select:none;background-image:repeating-linear-gradient(0deg,transparent 0 3px,#00000006 3px 4px);box-shadow:0 18px 30px #0005}
.pr-slip.grab{cursor:grab}
.pr-row{display:flex;justify-content:space-between;gap:12px}.pr-row>span{min-width:0;overflow-wrap:anywhere}.pr-row>span:last-child{text-align:right;white-space:nowrap}
.pr-c{text-align:center}.pr-b{font-weight:500}.pr-sm{font-size:11.5px;color:#7a766c}.pr-big{font-size:17px;font-weight:500}
.pr-hr{border-top:1.5px dashed var(--pink);margin:10px 0;opacity:.5}
.pr-wm{font:26px/1 "Bowlby One",Impact,sans-serif;text-align:center;margin-bottom:4px}
.pr-bars{display:flex;justify-content:center;height:40px;margin:10px 0 6px}.pr-bars i{display:block;background:var(--pink);height:100%}
.pr-perf{position:absolute;left:0;right:0;bottom:0;height:10px;background:radial-gradient(circle at 5px 0,var(--bg) 3px,transparent 3.5px) 0 0/10px 10px repeat-x}
.pr-stampwrap{height:52px;display:grid;place-items:center}.pr-stamp{border:3px solid #c2341b;color:#c2341b;font:20px/1 "Bowlby One",Impact,sans-serif;padding:6px 10px;transform:rotate(-12deg) scale(0);opacity:0;border-radius:6px;mix-blend-mode:multiply;letter-spacing:.04em}
.pr-stamp.ok{border-color:#1f8a3a;color:#1f8a3a}
.pr-stamp{display:inline-block}.pr-stamp.on{animation:prstamp .28s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes prstamp{0%{transform:rotate(-12deg) scale(3);opacity:0}100%{transform:rotate(-12deg) scale(1);opacity:.85}}
.pr-feed.torn{overflow:visible}
.pr-feed.torn .pr-slip{clip-path:polygon(0 6px,4% 0,8% 6px,12% 0,16% 6px,20% 0,24% 6px,28% 0,32% 6px,36% 0,40% 6px,44% 0,48% 6px,52% 0,56% 6px,60% 0,64% 6px,68% 0,72% 6px,76% 0,80% 6px,84% 0,88% 6px,92% 0,96% 6px,100% 0,100% 100%,0 100%);transition:transform .7s cubic-bezier(.3,1.3,.5,1);transform:translateY(40px) rotate(-3deg)}
.pr-hint{text-align:center;color:var(--dim);font:13px "DM Mono",monospace;min-height:22px;margin-top:8px}
.pr-feed.torn+.pr-hint{margin-top:52px}
.pr-after{display:grid;gap:10px;justify-items:center;width:100%;margin-top:8px}
.pr-after[hidden],#prShare[hidden]{display:none}
.pr-png{justify-self:center;font:500 14px "DM Mono",monospace;color:var(--ink);background:none;border:1.5px solid var(--ink);border-radius:999px;padding:8px 16px;cursor:pointer}
#prShare img{width:min(360px,100%);border-radius:10px;box-shadow:0 8px 24px #0003}
@media (prefers-reduced-motion:reduce){.pr-feed{transition:none!important}.pr-feed.torn .pr-slip{transition:none}.pr-stamp{display:inline-block}.pr-stamp.on{animation:none;transform:rotate(-12deg);opacity:.85}.led{animation:none}}`;

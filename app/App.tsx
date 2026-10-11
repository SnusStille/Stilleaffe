'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ACHIEVEMENTS, DEF, Goals, greeting, groupByMonth, iso, MOOD_EMOJI, MOOD_LABEL,
  Mood, mon, pbDay, pbTB, pct, prevRange, range, Row, streakAt, bestStreak,
  sum, today, weekKey, weekSales, workdaysElapsed, workdaysLeft, workdaysTotal,
  compareMonths, fmt, fmtMoney, f1, quoteOfDay,
} from '@/lib/calc';

type TabId = 'overview'|'register'|'history'|'stats'|'year'|'goals'|'comments'|'ai'|'settings'|'achievements';
const TABS:{id:TabId;label:string;ic:string}[]=[
  {id:'overview',label:'Översikt',ic:'◐'},{id:'register',label:'Registrera',ic:'＋'},
  {id:'history',label:'Historik',ic:'☰'},{id:'stats',label:'Statistik',ic:'▥'},
  {id:'year',label:'Årsvy',ic:'▤'},{id:'goals',label:'Mål',ic:'◎'},
  {id:'comments',label:'Kommentarer',ic:'✎'},{id:'ai',label:'AI-coach',ic:'✦'},
  {id:'settings',label:'Inställningar',ic:'⚙'}];

type Prop={id:string;tool:string;input:any;done?:boolean};
type Msg={r:'u'|'a';t:string;e?:boolean;props?:Prop[]};
type CItem={id:number;author:string;body:string;entry_date:string|null;created_at:string;reaction?:string;pinned?:boolean};
const THEMES=[{id:'default',label:'Nattblå',emoji:'🔷',grad:'linear-gradient(135deg,#8b8cff,#5b5fe6)'},{id:'midnight',label:'Midnatt',emoji:'🌌',grad:'linear-gradient(135deg,#60a5fa,#7c3aed)'},{id:'sunset',label:'Solnedgång',emoji:'🌅',grad:'linear-gradient(135deg,#fb923c,#f43f5e)'},{id:'forest',label:'Skog',emoji:'🌿',grad:'linear-gradient(135deg,#84cc16,#10b981)'},{id:'neon',label:'Neon',emoji:'💜',grad:'linear-gradient(135deg,#e879f9,#22d3ee)'}];
const SOUND_ENABLED_KEY='sd_sound';const HAPTIC_ENABLED_KEY='sd_haptics';
function applyTheme(id:string){if(typeof document==='undefined')return;if(id==='default')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',id);}
// Simple beep via WebAudio — no external assets
let actx:AudioContext|null=null;function beep(freq=660,dur=.11,type:OscillatorType='sine',vol=.06){if(typeof window==='undefined')return;try{if(!actx)actx=new (window.AudioContext||(window as any).webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(actx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+dur);o.stop(actx.currentTime+dur)}catch{}}
function chime(){beep(523,.1,'triangle',.05);setTimeout(()=>beep(784,.12,'triangle',.05),120);setTimeout(()=>beep(1046,.2,'triangle',.06),260)}
function haptic(pattern:number|number[]=18){try{if(typeof navigator!=='undefined'&&'vibrate'in navigator)(navigator as any).vibrate(pattern)}catch{}}

function eventText(a:Activity):string{
  switch(a.event){
    case 'entry_new':return `Registrerade ${a.payload?.sales||0} sälj för ${a.payload?.entry_date||'idag'} 📥`;
    case 'entry_updated':return `Ökade med +${a.payload?.delta||0} sälj 🚀`;
    case 'goals_updated':return 'Uppdaterade målen 🎯';
    default:return a.event;
  }
}
function confetti(big=false){if(typeof document==='undefined')return;const w=document.createElement('div');w.className='confetti';if(big)w.classList.add('mega');const n=big?180:110;for(let i=0;i<n;i++){const e=document.createElement('i');const hue=Math.random()*360;const size=big?6+Math.random()*6:4+Math.random()*6;e.style.cssText=`left:${Math.random()*100}%;width:${size}px;height:${size*1.5}px;background:hsl(${hue},85%,60%);animation-delay:${Math.random()*.5}s;--x:${(Math.random()-.5)*400}px;--r:${Math.random()*1080-540}deg;border-radius:${Math.random()>.5?'2px':'50%'}`;w.appendChild(e)}document.body.appendChild(w);setTimeout(()=>w.remove(),big?4200:2700)}
function Sparkles(){const sparks=useMemo(()=>Array.from({length:20},(_,i)=>({i,l:3+((i*17)%31)/10,t:((i*13)%37)/10,d:`${(i*47+11)%100}%`,b:`${(i*29+7)%100}%`,s:1+(i%3)})),[]);return<div className="sparkles">{sparks.map(s=><i key={s.i}style={{left:s.d,top:s.b,width:s.s+'px',height:s.s+'px',animationDelay:s.t+'s',animationDuration:s.l+'s'}}/>)}</div>}
function CountUp({n,dur=900,decimals=0}:{n:number;dur?:number;decimals?:number}){const[v,setV]=useState(0);useEffect(()=>{if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){setV(n);return}let raf=0;const t0=performance.now();const step=(t:number)=>{const p=Math.min((t-t0)/dur,1);const eased=1-Math.pow(1-p,3);setV(n*eased);if(p<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[n,dur]);return<>{decimals?Math.round(v*Math.pow(10,decimals))/Math.pow(10,decimals):Math.round(v)}</>}
function Ring({p,sub,size=170,stroke=14,delay=0}:{p:number;sub?:string;size?:number;stroke?:number;delay?:number}){const r=(size-20)/2,C=2*Math.PI*r;const[lp,setLp]=useState(0);useEffect(()=>{const id=setTimeout(()=>setLp(Math.max(0,Math.min(100,p))),60+delay);return()=>clearTimeout(id)},[p,delay]);return<div className="ring"style={{width:size,height:size}}><svg viewBox={`0 0 ${size} ${size}`}><defs><linearGradient id={`rg${size}${delay}`}x1="0"x2="1"><stop offset="0"stopColor="var(--acc1)"/><stop offset="1"stopColor="var(--g2)"/></linearGradient></defs><circle cx={size/2}cy={size/2}r={r}fill="none"stroke="rgba(255,255,255,.08)"strokeWidth={stroke}/><circle cx={size/2}cy={size/2}r={r}fill="none"stroke={`url(#rg${size}${delay})`}strokeWidth={stroke}strokeLinecap="round"strokeDasharray={C}strokeDashoffset={C*(1-lp/100)}style={{transition:'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)'}}/></svg><div className="t"style={{fontSize:size<140?'x-small':'medium'}}><b>{Math.round(lp)}%</b>{sub&&<span>{sub}</span>}</div></div>}
function Stat({k,v,s,c,bar,icon,i,trend}:{k:string;v:any;s?:string;c?:string;bar?:number;icon?:string;i?:number;trend?:number}){return<div className="c"style={{'--i':i,'--delay':`${(i||0)*32}ms`}as any}>{icon&&<div className="kpi-icon">{icon}</div>}<div className="k">{k}</div><div className={'v num '+(c||'')}>{v}{typeof trend==='number'&&trend!==0&&<span className={'trend-'+(trend>0?'up':'down')}title="Jämfört med motsvarande veckodagar föregående vecka">{trend>0?'▲':'▼'}{Math.abs(trend)}%</span>}</div><div className="s">{s}</div>{bar!=null&&<div className="bar"><i style={{width:Math.max(0,Math.min(100,bar))+'%'}}/></div>}</div>}
function Heat({rows,goal}:{rows:Row[];goal:number}){const n=new Date(),y=n.getFullYear(),m=n.getMonth(),last=new Date(y,m+1,0).getDate(),first=(new Date(y,m,1).getDay()+6)%7;const by=new Map(rows.map(r=>[r.entry_date,r.sales]));const cells:(number|null)[]=[...Array(first).fill(null),...Array.from({length:last},(_,i)=>i+1)];return<div className="heat">{['M','T','O','T','F','L','S'].map(d=><span key={d}className="hd">{d}</span>)}{cells.map((d,i)=>{if(!d)return<span key={i}/>;const k=iso(new Date(y,m,d));const v=by.get(k);const isToday=k===today();return<span key={i}className={'hc'+(isToday?' today':'')}title={v==null?k+' – ej registrerad':`${k}: ${v} sälj, ${fmtMoney(rows.find(r=>r.entry_date===k)!.tb_sek)}`}style={v!=null?{background:`rgba(52,224,138,${.2+Math.min(v/Math.max(goal,1),1.2)*.6})`,color:'#04170c',fontWeight:700}:undefined}>{d}</span>})}</div>}
function Chart({a,goal,onHover}:{a:Row[];goal?:number;onHover?:(r:Row|null,x:number,y:number)=>void}){const ref=useRef<HTMLDivElement>(null);const[hv,setHv]=useState<{r:Row;x:number;y:number}|null>(null);if(!a.length)return<span className="s">Ingen data än</span>;const m=Math.max(...a.map(r=>r.sales),goal||1,1);return<div className="ch-wrap"ref={ref}onMouseLeave={()=>{setHv(null);onHover&&onHover(null,0,0)}}><div className="ch">{a.map(r=><div key={r.id}title={`${r.entry_date}: ${r.sales} sälj, ${fmtMoney(r.tb_sek)}${r.note?' – '+r.note:''}`}onMouseEnter={e=>{const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();const pr=ref.current?.getBoundingClientRect();setHv({r,x:rect.left+(rect.width/2)-(pr?.left||0),y:rect.top-(pr?.top||0)});onHover&&onHover(r,rect.left+rect.width/2-(pr?.left||0),rect.top-(pr?.top||0))}}><em>{r.sales}</em><b className={goal&&r.sales>=goal?'hit':''}style={{height:Math.max(3,(r.sales/m)*140)}}/>{r.mood&&<span className="day-emoji">{MOOD_EMOJI[r.mood]}</span>}<span className="s">{r.entry_date.slice(8)}/{r.entry_date.slice(5,7)}</span></div>)}</div>{hv&&<div className="ch-tip show"style={{left:hv.x,top:hv.y}}><b>{hv.r.sales} sälj</b> · {fmtMoney(hv.r.tb_sek)}<br/><span className="s">{hv.r.entry_date}{hv.r.note?' · '+hv.r.note:''}</span></div>}</div>}
function YearHeat({rows,goal}:{rows:Row[];goal:number}){
  const end=new Date();end.setHours(0,0,0,0);
  const start=new Date(end);start.setDate(start.getDate()-364);start.setDate(start.getDate()-((start.getDay()+6)%7));
  const endWeek=new Date(end);endWeek.setDate(endWeek.getDate()+(6-((endWeek.getDay()+6)%7)));
  const by=new Map(rows.map(r=>[r.entry_date,r.sales]));
  const days:({date:string;level:number;sales:number}|null)[]=[];
  for(const d=new Date(start);d<=endWeek;d.setDate(d.getDate()+1)){
    if(d>end){days.push(null);continue}
    const key=iso(d),v=by.get(key),p=v!=null?v/Math.max(goal,1):0;
    days.push({date:key,sales:v??0,level:v==null?0:p<.5?1:p<.8?2:p<1?3:4});
  }
  const weeks:typeof days[]=[];for(let i=0;i<days.length;i+=7)weeks.push(days.slice(i,i+7));
  return <div><div className="year-heat">{weeks.map((w,i)=><div key={i}style={{display:'grid',gridTemplateRows:'repeat(7,1fr)',gap:3}}>{w.map((d,j)=>d?<div key={j}className="d"data-l={d.level}title={`${d.date}: ${d.sales} sälj`}/>:<div key={j}aria-hidden="true"/>)}</div>)}</div><div className="row-tight"style={{justifyContent:'flex-end',marginTop:10}}><span className="s">Mindre</span><div className="d"data-l={0}style={{width:12,height:12,borderRadius:3}}/><div className="d"data-l={1}style={{width:12,height:12,borderRadius:3}}/><div className="d"data-l={2}style={{width:12,height:12,borderRadius:3}}/><div className="d"data-l={3}style={{width:12,height:12,borderRadius:3}}/><div className="d"data-l={4}style={{width:12,height:12,borderRadius:3}}/><span className="s">Mer</span></div></div>
}
function BarMonths({months}:{months:{label:string;sales:number;tb:number;days:number}[]}){const m=Math.max(1,...months.map(x=>x.sales));return<div className="bar-chart h">{months.map(mo=><div key={mo.label}className="bar-row"><div className="lbl num">{mo.label}<span className="s"> ({mo.days}d)</span></div><div className="track"><i style={{width:Math.round(mo.sales/m*100)+'%'}}/></div><div className="val num">{fmt(mo.sales)}<span className="s"> / {fmtMoney(mo.tb)}</span></div></div>)}</div>}

type AchDef={key:string;name:string;emoji:string;desc:string};
const ACH_MAP:Record<string,AchDef>={};ACHIEVEMENTS.forEach(a=>{ACH_MAP[a.key]=a});


function AuditPanel({sig}:{sig:string}){const[items,setItems]=useState<any[]|null>(null);const[note,setNote]=useState('');useEffect(()=>{let on=true;fetch('/api/audit',{credentials:'same-origin'}).then(x=>x.json()).then(j=>{if(!on)return;setItems(Array.isArray(j.items)?j.items:[]);setNote(j.missing?'Historiken är inte aktiverad än – kör supabase/migration-v8.sql i Supabase SQL Editor.':'')}).catch(()=>{if(on){setItems([]);setNote('Kunde inte hämta historiken.')}});return()=>{on=false}},[sig]);
  const lab:Record<string,string>={create:'Ny',update:'Ändrad',delete:'Borttagen'};
  const d=(v:any)=>v?`${v.sales} sälj · ${Math.round(Number(v.tb_sek)).toLocaleString('sv-SE')} kr`:'–';
  return<div className="c sc audit"><h3 style={{marginTop:0}}>Ändringshistorik</h3>{note&&<p className="sub">{note}</p>}{items===null?<p className="sub">Laddar…</p>:!items.length&&!note?<p className="sub">Inga ändringar loggade ännu.</p>:items.length>0&&<table><thead><tr><th>När</th><th>Dag</th><th>Händelse</th><th>Före</th><th>Efter</th></tr></thead><tbody>{items.map((a:any)=><tr key={a.id}><td className="num">{new Date(a.created_at).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'})}</td><td className="num">{a.entry_date}</td><td><span className={'tag '+(a.action==='delete'?'m':'')}>{lab[a.action]||a.action}</span></td><td className="num">{d(a.before)}</td><td className="num">{d(a.after)}</td></tr>)}</tbody></table>}</div>}


function TodayFix({sales,tb,has,onSet,onClear}:{sales:number;tb:number;has:boolean;onSet:(s:number,t:number)=>void;onClear:()=>void}){
  const[s,setS]=useState(String(sales));const[t,setT]=useState(String(Math.round(tb)));
  useEffect(()=>{setS(String(sales));setT(String(Math.round(tb)))},[sales,tb]);
  const sn=Math.max(0,Math.floor(Number(s)||0)),tn=Math.max(0,Number(t)||0),dirty=sn!==sales||Math.round(tn)!==Math.round(tb);
  return<div className="c fix"><div className="k">Dagens siffror – rätta här</div>
    <div className="fix-row"><div className="fix-st"><button className="b"onClick={()=>setS(String(Math.max(0,sn-1)))}aria-label="Minska">−</button><input inputMode="numeric"value={s}onChange={e=>setS(e.target.value.replace(/\D/g,''))}aria-label="Antal sälj"/><button className="b"onClick={()=>setS(String(sn+1))}aria-label="Öka">+</button></div>
    <label className="fix-tb">TB (kr)<input inputMode="decimal"value={t}onChange={e=>setT(e.target.value.replace(/[^\d.,]/g,'').replace(',','.'))}/></label></div>
    <div className="row"><button className={'b '+(dirty?'pri':'')}disabled={!dirty}onClick={()=>onSet(sn,tn)}>{dirty?'Spara ändring':'Sparad ✓'}</button>{has&&<button className="b ghost"onClick={onClear}>Nollställ dagen</button>}</div>
    <p className="s">Står det fel? Ändra antalet och tryck Spara. Äldre dagar rättar eller tar du bort under Historik.</p></div>
}

function Ticker({items}:{items:string[]}){return<div className="ticker"role="group"aria-label="Snabbsammanfattning"><div className="tk-track">{items.map((t,i)=><span key={i}className="tk-i">{t}</span>)}</div></div>}
const pad2=(n:number)=>String(n).padStart(2,'0');
const isoD=(d:Date)=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const isSalesWeekday=(date:string)=>{const day=new Date(date+'T12:00:00').getDay();return day>=1&&day<=5};
const sv=(n:number)=>Math.round(n).toLocaleString('sv-SE');
function ManagerReport({rows,goal}:{rows:Row[];goal:Goals}){
  const [stockholmYear,stockholmMonth,stockholmDay]=today().split('-').map(Number),now=new Date(stockholmYear,stockholmMonth-1,stockholmDay),dow=(now.getDay()+6)%7;
  const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow),previousMonday=new Date(monday);
  previousMonday.setDate(monday.getDate()-7);
  const currentStart=isoD(monday),previousStart=isoD(previousMonday),todayEnd=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  const previousEnd=new Date(previousMonday);previousEnd.setDate(previousMonday.getDate()+dow+1);
  const cur=rows.filter(r=>r.entry_date>=currentStart&&r.entry_date<isoD(todayEnd));
  const prev=rows.filter(r=>r.entry_date>=previousStart&&r.entry_date<isoD(previousEnd));
  const S=(x:Row[])=>x.reduce((t,r)=>t+Number(r.sales||0),0),T=(x:Row[])=>x.reduce((t,r)=>t+Number(r.tb_sek||0),0);
  const prevByDate=new Map(prev.map(r=>[r.entry_date,r]));
  const matched=cur.filter(r=>isSalesWeekday(r.entry_date)).flatMap(r=>{const d=new Date(r.entry_date+'T12:00:00');d.setDate(d.getDate()-7);const prior=prevByDate.get(isoD(d));return prior?[[r,prior] as const]:[]});
  const comparableCurrent=matched.reduce((t,[r])=>t+Number(r.sales||0),0),comparablePrevious=matched.reduce((t,[,r])=>t+Number(r.sales||0),0);
  const cs=S(cur),diff=matched.length&&comparablePrevious>0?Math.round((comparableCurrent-comparablePrevious)/comparablePrevious*100):null,weekProgress=Math.min(100,pct(cs,goal.weekly_sales));
  const from14=isoD(new Date(now.getFullYear(),now.getMonth(),now.getDate()-13));
  const l14=rows.filter(r=>r.entry_date>=from14&&r.entry_date<=isoD(now)),days=new Set(l14.map(r=>r.entry_date)).size,avg=days?S(l14)/days:0;
  const best=[...rows].sort((x,y)=>Number(y.sales)-Number(x.sales))[0];
  const verdict=!matched.length?'Inga gemensamma registrerade veckodagar att jämföra ännu.':comparablePrevious===0?'Förra veckans matchande dagar saknar sälj för procentjämförelse.':diff!==null&&diff>=10?'Starkare tempo på jämförbara dagar.':diff!==null&&diff<=-10?'Lägre tempo på jämförbara dagar – värt en uppföljning.':'Stabilt tempo på jämförbara dagar.';
  const tone=diff===null?'':diff>=0?'up':'down';
  return<div className="mr"><div className="c mr-hero"><div className="k">Chefsrapport · denna vecka</div><div className="mr-big num">{cur.length?fmt(cs):'–'} <small>sälj</small>{diff!==null&&<span className={'stat-change '+tone}>{diff>=0?'▲':'▼'} {Math.abs(diff)}%</span>}</div><p className="s">{verdict} · {cur.length} registrerade dagar denna vecka{matched.length?` · ${matched.length} gemensamma registrerade vardagar`:''}</p><div className="manager-target"><div><span>Veckomål</span><b>{cur.length?`${fmt(cs)} / ${fmt(goal.weekly_sales)} sälj`:'Ingen registrering hittills'}</b><strong>{cur.length?`${weekProgress}%`:'–'}</strong></div><div className="bar"><i style={{width:(cur.length?weekProgress:0)+'%'}}/></div></div></div>
    <div className="c"><div className="k">TB registrerat denna vecka</div><div className="mr-mid num">{cur.length?`${sv(T(cur))} kr`:'–'}</div><div className="s">Förra veckan: {prev.length?`${sv(T(prev))} kr`:'inga registreringar'}</div></div>
    <div className="c"><div className="k">Snitt / registrerad dag · 14 d</div><div className="mr-mid num">{days?avg.toFixed(1):'–'}{days?' sälj':''}</div><div className="s">{days} dagar med registrering</div></div>
    <div className="c"><div className="k">Starkaste dag i historiken</div><div className="mr-mid num">{best?Number(best.sales)+' sälj':'–'}</div><div className="s">{best?best.entry_date:'Inga registreringar än'}</div></div></div>
}
function GoalSnapshot({goal,todayRow,role,onEdit}:{goal:Goals;todayRow:Row|undefined;role:'seller'|'manager';onEdit?:()=>void}){
  const manager=role==='manager',hasToday=!!todayRow,sales=Number(todayRow?.sales||0),progress=hasToday?pct(sales,goal.daily_sales):0;
  const status=!hasToday?'Dagens resultat är inte registrerat. Målet kan inte bedömas utan dagens siffror.':sales>=goal.daily_sales?'Dagsmålet är nått.':`${fmt(Math.max(goal.daily_sales-sales,0))} sälj kvar till dagsmålet.`;
  return <section className={`goal-snapshot c ${manager?'manager':'seller'}`} aria-label={manager?'Stilles dagsmål och målöversikt':'Din dagsmål och målöversikt'}>
    <div className="goal-snapshot-head">
      <div><div className="goal-eyebrow">{manager?'AFFES SNABBÖVERSIKT':'DIN MÅLPLAN'}</div><h3>{manager?'Stilles mål — tydligt från start':'Dina mål — tydligt från start'}</h3></div>
      {manager?<span className="goal-readonly">◈ AFFE · SKRIVSKYDDAD</span>:<button type="button"className="b sm ghost goal-edit"onClick={onEdit}>Redigera mål <span aria-hidden="true">↗</span></button>}
    </div>
    <div className="goal-snapshot-layout">
      <div className="goal-target-prism"aria-label={`${fmt(goal.daily_sales)} sälj i dagsmål`}>
        <div className="goal-target-face"><span>{manager?'STILLES DAGSMÅL':'DAGSMÅL'}</span><strong>{fmt(goal.daily_sales)}<small>sälj</small></strong><em>per arbetsdag</em></div>
        <div className="goal-target-side"aria-hidden="true"/><div className="goal-target-cap"aria-hidden="true"/>
      </div>
      <div className="goal-snapshot-detail">
        <div className="goal-snapshot-today">
          <div><span className="goal-eyebrow">{manager?'IDAG · STILLE':'DAGENS PROGRESS'}</span><strong>{hasToday?`${fmt(sales)} / ${fmt(goal.daily_sales)} sälj`:'Ej registrerat'}</strong></div>
          <span className={hasToday?'goal-percent':'goal-missing'}>{hasToday?`${progress}%`:'—'}</span>
        </div>
        <p className="goal-snapshot-status"role="status">{status}</p>
        <div className="goal-progress"aria-hidden="true"><i style={{width:hasToday?`${Math.min(progress,100)}%`:'0%'}}/></div>
        <div className="goal-support-grid">
          <div><span>TB / DAG</span><b>{fmtMoney(goal.daily_tb)}</b>{hasToday&&<small>Idag: {fmtMoney(Number(todayRow?.tb_sek||0))}</small>}</div>
          <div><span>VECKOMÅL</span><b>{fmt(goal.weekly_sales)} <small>sälj</small></b><small>TB {fmtMoney(goal.weekly_tb)}</small></div>
          <div><span>MÅNADSMÅL</span><b>{fmt(goal.monthly_sales)} <small>sälj</small></b><small>TB {fmtMoney(goal.monthly_tb)}</small></div>
        </div>
      </div>
    </div>
  </section>;
}
function CoachPanel({
  role, hasData, hasToday, hasMonthData, paceReliable, registeredWorkdays, elapsedWorkdays, needsStepUp, todaySales, dailyGoal, monthSales, monthGoal,
  ahead, remainingWorkdays, requiredPerDay, recentAverage, recentDays,
  aiText, aiBusy, aiConfigured, onAsk,
}: {
  role: 'seller' | 'manager'; hasData: boolean; hasToday: boolean; hasMonthData: boolean; paceReliable: boolean; registeredWorkdays: number; elapsedWorkdays: number; needsStepUp: boolean;
  todaySales: number; dailyGoal: number; monthSales: number; monthGoal: number;
  ahead: number; remainingWorkdays: number; requiredPerDay: number;
  recentAverage: number; recentDays: number; aiText: string; aiBusy: boolean;
  aiConfigured: boolean; onAsk: () => void;
}) {
  const seller = role === 'seller';
  const title = seller
    ? (!hasData ? 'Börja med dagens första registrering'
      : !hasToday ? 'Dagens siffror saknas'
      : !paceReliable ? 'Komplettera registreringarna'
      : needsStepUp ? 'Dags att steppa upp'
      : ahead > 2 ? 'Du ligger före planen'
      : 'Du är i fas — håll trycket')
    : 'Affes lägesbild';
  const pace = ahead < 0
    ? `${f1(Math.abs(ahead))} sälj efter månadstakten`
    : `${f1(ahead)} sälj före månadstakten`;
  const coverageNote=`Underlag: ${registeredWorkdays} av ${elapsedWorkdays} passerade vardagar registrerade.`;
  const sellerCopy = !hasData
    ? 'När dagens siffror är registrerade kan coachen jämföra din takt med målet och ge konkreta råd.'
    : !hasToday
      ? `Dagens resultat är inte registrerat, så dagsmålet bedöms inte som noll. ${hasMonthData?'Månadstakten utgår bara från registrerade dagar.':'Det finns ännu inga registreringar denna månad.'} Lägg in dagens siffror för en rättvis dagsbild.`
      : !paceReliable
        ? `Månadstakten kan inte bedömas säkert än: ${registeredWorkdays} av ${elapsedWorkdays} arbetsdagar har en registrering. Komplettera saknade dagar innan du drar slutsatser.`
      : needsStepUp
        ? remainingWorkdays>0 ? `Du ligger ${pace}. ${coverageNote} Med ${remainingWorkdays} arbetsdagar kvar behöver du cirka ${f1(requiredPerDay)} sälj per arbetsdag för att nå månadsmålet.` : `Du ligger ${pace}. ${coverageNote} Månadens arbetsdagar är slut och ${fmt(Math.max(monthGoal-monthSales,0))} registrerade sälj saknas till målet.`
        : ahead > 2
          ? `Du ligger ${pace}. ${coverageNote} Behåll rutinen — målet är ${fmt(monthGoal)} sälj den här månaden.`
          : `Tempot ligger nära planen. ${coverageNote} Dagens mål är ${dailyGoal} sälj; du har registrerat ${todaySales} hittills.`;
  const managerPaceCopy = !hasMonthData
    ? 'Månadstakten kan inte bedömas eftersom månaden saknar registreringar.'
    : !paceReliable
      ? `Månadstakten kan inte bedömas säkert än: ${registeredWorkdays} av ${elapsedWorkdays} arbetsdagar har en registrering.`
      : `Stille ligger ${pace}. ${registeredWorkdays} av ${elapsedWorkdays} passerade vardagar har en registrering. ${remainingWorkdays>0?`${remainingWorkdays} arbetsdagar återstår; den nödvändiga takten är cirka ${f1(requiredPerDay)} sälj per arbetsdag.`:`Månadens arbetsdagar är slut; ${fmt(Math.max(monthGoal-monthSales,0))} registrerade sälj saknas till målet.`}`;
  const managerCopy = !hasData
    ? 'Ingen säljdata finns ännu. När Stille registrerar resultat visas takt, trend och konkreta uppföljningspunkter här.'
    : `${hasToday?'Dagens resultat är registrerat.':'Dagens registrering saknas, så dagens sälj bedöms inte som noll.'} ${managerPaceCopy} ${recentDays >= 3 ? `Snittet senaste ${recentDays} registrerade dagar är ${f1(recentAverage)} sälj.` : 'Datat är ännu för tunt för en säker trendbedömning.'}`;
  return <section className={`c coach-panel ${needsStepUp && seller && hasToday ? 'needs-push' : 'on-track'} ${seller ? 'seller-coach' : 'manager-coach'}`}>
    <div className="coach-main">
      <div className="coach-heading">
        <span className="coach-spark" aria-hidden="true">✦</span>
        <div><div className="coach-eyebrow">{seller ? 'DIN DAGLIGA COACH' : 'CHEFSÖVERSIKT · SKRIVSKYDDAD'}</div><h3>{title}</h3></div>
      </div>
      <p className="coach-copy">{seller ? sellerCopy : managerCopy}</p>
      {recentDays > 0 && <p className="coach-context">Senaste {recentDays} registrerade dagar: <b>{f1(recentAverage)} sälj i snitt</b></p>}
      {aiText && <div className="coach-ai"><span>✦ AI-COACH · IDAG</span><p>{aiText}</p></div>}
      {aiBusy && <div className="coach-ai coach-loading"role="status"><span className="coach-dot"/> AI:n läser registreringarna och gör en konkret plan…</div>}
      <div className="coach-actions">
        <button className="b pri" type="button" onClick={onAsk} disabled={aiBusy}>
          {aiBusy ? 'Gör din plan…' : seller ? '✦ Be AI göra min plan' : '✦ Fråga AI hur jag kan stötta'}
        </button>
        {!aiConfigured && <span className="coach-hint">AI-nyckel behövs för personlig plan.</span>}
      </div>
    </div>
    <div className="coach-metrics" aria-label="Måluppföljning">
      <div><span>Dagens mål</span><b>{hasToday?todaySales:'–'}<small> / {dailyGoal}</small></b></div>
      <div><span>Månad</span><b>{hasMonthData?fmt(monthSales):'–'}<small> / {fmt(monthGoal)}</small></b></div>
      <div><span>{paceReliable?(remainingWorkdays>0?'Behövs / arbetsdag':'Sälj kvar till mål'):'Registrerade vardagar'}</span><b>{paceReliable?(remainingWorkdays>0?f1(requiredPerDay):fmt(Math.max(monthGoal-monthSales,0))):`${registeredWorkdays}/${elapsedWorkdays}`}</b></div>
    </div>
  </section>;
}

function MonthCal({rows}:{rows:Row[]}){
  const[off,setOff]=useState(0);
  const base=new Date();base.setDate(1);base.setMonth(base.getMonth()+off);
  const y=base.getFullYear(),m=base.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,dim=new Date(y,m+1,0).getDate();
  const pre=y+'-'+pad2(m+1),map=new Map(rows.map(r=>[r.entry_date,r]));
  const mx=Math.max(1,...rows.filter(r=>r.entry_date.startsWith(pre)).map(r=>Number(r.sales)));
  const tod=isoD(new Date()),tot=rows.filter(r=>r.entry_date.startsWith(pre)).reduce((t,r)=>t+Number(r.sales),0);
  const cells:any[]=[];for(let i=0;i<first;i++)cells.push(<div key={'e'+i}className="cal-e"/>);
  for(let d=1;d<=dim;d++){const k=pre+'-'+pad2(d),r=map.get(k),h=r?Math.max(.18,Number(r.sales)/mx):0;
    cells.push(<div key={k}className={'cal-d'+(r?' has':'')+(k===tod?' today':'')}style={{'--h':h}as any}title={r?`${k}: ${r.sales} sälj · ${sv(Number(r.tb_sek))} kr`:k}><span>{d}</span>{r&&<b className="num">{Number(r.sales)}</b>}</div>)}
  return<div className="c sc cal"><div className="cal-h"><button className="b ghost"onClick={()=>setOff(o=>o-1)}aria-label="Förra månaden">‹</button><div><h3 style={{margin:0,textTransform:'capitalize'}}>{base.toLocaleDateString('sv-SE',{month:'long',year:'numeric'})}</h3><div className="s">{tot} sälj totalt</div></div><div className="row"><button className="b ghost"onClick={()=>setOff(0)}>Idag</button><button className="b ghost"onClick={()=>setOff(o=>o+1)}aria-label="Nästa månad">›</button></div></div>
    <div className="cal-g">{['M','T','O','T','F','L','S'].map((w,i)=><div key={i}className="cal-w">{w}</div>)}{cells}</div></div>
}

const QUOTES:{t:string;s:string}[]=[
 {t:'Fokusera på nästa bra samtal.',s:'Ett tydligt nästa steg räcker.'},
 {t:'Små steg bygger stabilt tempo.',s:'Jämför med din egen plan, inte med antaganden.'},
 {t:'Lyssna klart innan du svarar.',s:'Nyfikenhet gör samtalet bättre.'},
 {t:'Håll planen enkel.',s:'Välj en sak att göra härnäst.'},
 {t:'Ett nej avgör inte dagen.',s:'Ta med lärdomen och börja om i nästa samtal.'},
 {t:'Rytm före stress.',s:'En lugn och tydlig process ger bättre underlag.'},
 {t:'Skriv ner det du lärde dig.',s:'En kort anteckning gör nästa pass lättare.'},
 {t:'Ta en sak i taget.',s:'Fokus är också att välja bort.'},
 {t:'Bra uppföljning börjar med att lyssna.',s:'Fråga hellre än att anta.'},
 {t:'Stabilitet slår ryckighet.',s:'Låt registreringen visa vad som faktiskt hände.'},
 {t:'Sätt ett konkret mål för nästa timme.',s:'Gör det litet nog att börja nu.'},
 {t:'Ge feedback på beteende, inte person.',s:'Respekt och tydlighet går hand i hand.'},
];
function Motivation({seller}:{seller?:boolean}){
  const[i,setI]=useState(0);
  useEffect(()=>{
    const day=today();
    const dayNumber=Math.floor(Date.parse(day+'T12:00:00Z')/86400000);
    setI(Math.abs(dayNumber)%QUOTES.length);
  },[]);
  const q=QUOTES[(i+(seller?0:3))%QUOTES.length];
  return<section className="motiv"aria-label={seller?'Dagens fokus':'Coachens fokus'}aria-live="off">
    <div className="motiv-k">{seller?'DAGENS DRIV':'COACHENS FOKUS'}</div>
    <p className="motiv-q"key={'q'+i}>{q.t}</p>
    <div className="motiv-s"key={'s'+i}>{q.s}</div>
    <button type="button"className="motiv-next"aria-label="Visa nästa fokus"title="Visa nästa fokus"onClick={()=>setI(v=>(v+1)%QUOTES.length)}>↻</button>
  </section>;
}
const WD=['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];

/* 1. Rutinrad – senaste 14 dagarna */
function StreakDots({rows}:{rows:Row[]}){
  const now=new Date(),has=new Set(rows.filter(r=>Number(r.sales)>0).map(r=>r.entry_date));
  const days=Array.from({length:14},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(13-i));return{k:isoD(d),w:d.getDay()}});
  const n=days.filter(d=>has.has(d.k)).length;
  return<div className="c dots"><div className="k">Rutinrad · 14 dagar</div><div className="dots-g">{days.map(d=><i key={d.k}title={d.k}className={(has.has(d.k)?'on':'')+(d.w===0||d.w===6?' we':'')}/>)}</div><div className="s">{n} av 14 dagar med sälj · längsta rad {longestStreak(rows)} arbetsdagar</div></div>
}

/* 2. Veckodagsanalys */
function WeekdayInsight({rows}:{rows:Row[]}){
  const sum=Array(7).fill(0),cnt=Array(7).fill(0);
  rows.forEach(r=>{const w=(new Date(r.entry_date+'T12:00:00').getDay()+6)%7;sum[w]+=Number(r.sales||0);cnt[w]++});
  const avg=sum.map((x,i)=>cnt[i]?x/cnt[i]:0),mx=Math.max(...avg),best=avg.indexOf(mx);
  if(rows.length<5)return<div className="c wd"><div className="k">Veckodagsanalys</div><p className="s">Behöver minst 5 registrerade dagar för att visa mönster.</p></div>;
  const show=avg.map((a,i)=>({a,i})).filter(x=>x.i<5||cnt[x.i]>0);
  return<div className="c wd"><div className="k">Veckodagsanalys · snitt sälj</div><div className="wd-g">{show.map(({a,i})=><div key={i}className={'wd-c'+(i===best?' top':'')}><b className="num">{a.toFixed(1)}</b><i style={{height:Math.max(6,mx?a/mx*100:0)+'%'}}/><span>{WD[i].slice(0,3)}</span></div>)}</div><div className="s">Starkaste dag: <b>{WD[best]}</b> (snitt {mx.toFixed(1)}).</div></div>
}

/* 3. Fokus-timer (25/5) */
const TIMER_SECONDS={focus:25*60,break:5*60} as const;
type TimerMode=keyof typeof TIMER_SECONDS;
function FocusTimer({sound}:{sound:boolean}){
  const[mode,setMode]=useState<TimerMode>('focus');const[left,setLeft]=useState(TIMER_SECONDS.focus);const[run,setRun]=useState(false);
  const endRef=useRef(0);const[dayKey]=useState(()=>isoD(new Date()));const key='sd_pomo_state_'+dayKey;const doneKey='sd_pomo_'+dayKey;
  const[done,setDone]=useState(0);const[restored,setRestored]=useState(false);
  useEffect(()=>{
    let count=0;
    try{count=Math.max(0,Number(localStorage.getItem(doneKey)||0));if(!Number.isFinite(count))count=0}catch{}
    setDone(count);
    try{
      const saved=JSON.parse(localStorage.getItem(key)||'null');
      if(saved&&(saved.mode==='focus'||saved.mode==='break')){
        const savedMode=saved.mode as TimerMode;
        if(saved.running&&Number.isFinite(Number(saved.endsAt))){
          const endsAt=Number(saved.endsAt),remaining=Math.max(0,Math.ceil((endsAt-Date.now())/1000));
          if(remaining>0){endRef.current=endsAt;setMode(savedMode);setLeft(Math.min(TIMER_SECONDS[savedMode],remaining));setRun(true)}
          else{
            const nextMode:TimerMode=savedMode==='focus'?'break':'focus';
            if(savedMode==='focus'){count+=1;setDone(count);localStorage.setItem(doneKey,String(count))}
            setMode(nextMode);setLeft(TIMER_SECONDS[nextMode]);setRun(false);
            localStorage.setItem(key,JSON.stringify({mode:nextMode,left:TIMER_SECONDS[nextMode],running:false,endsAt:0}));
          }
        }else{
          const savedLeft=Number(saved.left);
          setMode(savedMode);setLeft(Number.isFinite(savedLeft)?Math.max(0,Math.min(TIMER_SECONDS[savedMode],savedLeft)):TIMER_SECONDS[savedMode]);setRun(false);
        }
      }
    }catch{}
    setRestored(true);
  },[key,doneKey]);
  useEffect(()=>{
    if(!run||!restored)return;
    const id=window.setInterval(()=>{
      const remaining=Math.max(0,Math.ceil((endRef.current-Date.now())/1000));setLeft(remaining);
      if(remaining<=0){
        window.clearInterval(id);setRun(false);
        if(sound){try{beep(660,.15,'sine',.05);window.setTimeout(()=>beep(880,.2,'sine',.05),180)}catch{}}
        if(mode==='focus'){const n=done+1;setDone(n);try{localStorage.setItem(doneKey,String(n))}catch{}}
        const nextMode:TimerMode=mode==='focus'?'break':'focus';setMode(nextMode);setLeft(TIMER_SECONDS[nextMode]);
      }
    },500);
    return()=>window.clearInterval(id);
  },[run,restored,mode,done,key,doneKey,sound]);
  useEffect(()=>{
    if(!restored||run)return;
    try{localStorage.setItem(key,JSON.stringify({mode,left,running:false,endsAt:0}))}catch{}
  },[restored,run,mode,left,key]);
  const total=TIMER_SECONDS[mode],C=2*Math.PI*44,mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(left%60).padStart(2,'0');
  const toggle=()=>{
    if(run){setRun(false);return}
    const endsAt=Date.now()+left*1000;endRef.current=endsAt;setRun(true);
    try{localStorage.setItem(key,JSON.stringify({mode,left,running:true,endsAt}))}catch{}
  };
  const reset=()=>{endRef.current=0;setRun(false);setMode('focus');setLeft(TIMER_SECONDS.focus)};
  return<div className={'c pomo '+mode}aria-busy={!restored}><div className="k">Fokus-timer</div>
    <div className="pomo-r"role="timer"aria-label={`${mode==='focus'?'Fokus':'Paus'} återstår ${mm}:${ss}`}>
      <svg viewBox="0 0 100 100"aria-hidden="true"><circle cx="50"cy="50"r="44"className="pomo-bg"/><circle cx="50"cy="50"r="44"className="pomo-fg"strokeDasharray={C}strokeDashoffset={C*(1-left/total)}/></svg>
      <div className="pomo-t num"aria-hidden="true">{mm}:{ss}</div>
    </div>
    <div className="row"><button type="button"className="b pri"disabled={!restored}onClick={toggle}>{!restored?'Laddar…':run?'Pausa':'Starta'}</button><button type="button"className="b ghost"disabled={!restored}onClick={reset}>Nollställ</button></div>
    <div className="s"aria-live="polite">{mode==='focus'?'Fokusblock':'Paus'} · {done} block klara idag</div>
  </div>
}

/* 4–8. Säljarens extra-paket: påminnelse, rekordjakt, plan, dagsrapport */
function SellerExtras({rows,g,ts,tt,hasToday,paceReliable,registeredWorkdays,elapsedWorkdays,remainingWorkdays,sound}:{rows:Row[];g:Goals;ts:number;tt:number;hasToday:boolean;paceReliable:boolean;registeredWorkdays:number;elapsedWorkdays:number;remainingWorkdays:number;sound:boolean}){
  const[copied,setCopied]=useState(false);
  const now=new Date(),td=isoD(now);
  const dg=Number(g.daily_sales||0),mg=Number(g.monthly_sales||0);
  const best=[...rows].sort((a,b)=>Number(b.sales)-Number(a.sales))[0],bs=best?Number(best.sales):0;
  const mo=rows.filter(r=>r.entry_date.startsWith(td.slice(0,7))),ms=mo.reduce((t,r)=>t+Number(r.sales||0),0);
  const needM=paceReliable?Math.max(0,mg-ms):0,perDay=paceReliable&&remainingWorkdays>0?needM/remainingWorkdays:null;
  const chase=!hasToday
    ?(bs>0?'Dagens siffror saknas – registrera dem för att jämföra med rekordet.':'Registrera dagens resultat för att starta rekordjakten.')
    :bs===0?'Ingen rekorddag ännu – fortsätt registrera dina resultat.'
    :ts>bs?'Nytt rekord idag! 🚀'
    :ts===bs?'Du har jämnat ditt rekord – ett till slår det!':`${bs-ts} sälj kvar till ditt rekord (${bs})`;
  const dayReport=hasToday?`${ts} sälj${dg?` (${Math.round(ts/dg*100)}% av dagsmålet ${dg})`:''}, TB ${sv(tt)} kr.`:'Dagens resultat är inte registrerat.';
  const monthReport=mo.length?`Månaden hittills: ${ms} sälj registrerade.`:'Inga registreringar den här månaden ännu.';
  const report=`Dagsrapport ${td}: ${dayReport} ${monthReport}`;
  const copy=async()=>{try{await navigator.clipboard.writeText(report)}catch{const t=document.createElement('textarea');t.value=report;document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch{}t.remove()}setCopied(true);setTimeout(()=>setCopied(false),1800)};
  const late=now.getHours()>=15&&!hasToday;
  const progress=hasToday&&bs>0?Math.min(100,ts/bs*100):0;
  return<div className="sx">
    {late&&<div className="c sx-late"><div><b>Du har inte registrerat idag än</b><div className="s">Lägg in dagens siffror så Affe ser dem direkt.</div></div><button type="button"className="b pri"onClick={()=>{const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;document.querySelector('.fix')?.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'})}}>Registrera nu</button></div>}
    <div className="sx-g">
      <div className="c sx-rec"><div className="k">Rekordjakt</div><div className="sx-big num">{bs?`${hasToday?Math.min(ts,bs):'–'} / ${bs}`:'–'}</div><div className="bar"><i style={{width:progress+'%'}}/></div><div className="s">{chase}</div></div>
      <div className="c sx-plan"><div className="k">Så når du målen</div>
        <div className="sx-row"><span>Dagsmål</span><b className="num">{dg?(hasToday?(ts>=dg?'Klart ✓':`${dg-ts} kvar`):'Ej registrerat'):'–'}</b></div>
        <div className="sx-row"><span>Månadsmål</span><b className="num">{!paceReliable?'Underlag saknas':mg?(needM===0?'Klart ✓':`${needM} kvar`):'–'}</b></div>
        <div className="sx-row"><span>Behövs per arbetsdag</span><b className="num">{paceReliable&&mg&&needM>0?(perDay===null?'–':perDay.toFixed(1)):'–'}</b></div>
        <div className="s">{paceReliable?(remainingWorkdays>0?`${remainingWorkdays} arbetsdagar kvar i månaden (inkl. idag).`:needM>0?'Månadens arbetsdagar är slut.':'Månadsmålet är nått.'):`Månadstakt pausad: ${registeredWorkdays}/${elapsedWorkdays} vardagar registrerade.`}</div></div>
      <FocusTimer sound={sound}/>
      <div className="c sx-rep"><div className="k">Dagsrapport</div><p className="sx-txt">{report}</p><button type="button"className="b pri"onClick={copy}>{copied?'Kopierat ✓':'Kopiera rapport'}</button></div>
    </div>
    <div className="sx-g2"><StreakDots rows={rows}/><WeekdayInsight rows={rows}/></div>
  </div>
}

/* ===== v16: tio nya saker för både Stille och Affe ===== */
function longestStreak(rows:Row[]){
  const ds=Array.from(new Set(rows.filter(r=>Number(r.sales)>0).map(r=>r.entry_date))).sort();let best=0,cur=0,prev='';
  const nextWd=(k:string)=>{const d=new Date(k+'T12:00:00');do{d.setDate(d.getDate()+1)}while(d.getDay()===0||d.getDay()===6);return isoD(d)};
  for(const k of ds){cur=prev&&nextWd(prev)===k?cur+1:1;if(cur>best)best=cur;prev=k}
  return best
}
function Freshness({at,onRefresh}:{at:number;onRefresh:()=>Promise<void>}){
  const[busy,setBusy]=useState(false);const t=at?new Date(at).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'}):'–';
  return<button type="button"className="fresh"title={at?`Senast uppdaterad ${t}. Uppdatera nu.`:'Ingen uppdatering ännu. Försök igen.'}aria-label={busy?'Uppdaterar siffrorna':`Uppdatera siffrorna, senast ${t}`}aria-busy={busy}disabled={busy}onClick={async()=>{setBusy(true);try{await onRefresh()}finally{setBusy(false)}}}><span className={busy?'spin':''}aria-hidden="true">⟳</span> {busy?'…':t}</button>
}
function NotificationPanel({open,alerts,unread,onClose,onOpenComments,anchorRef}:{open:boolean;alerts:string[];unread:number;onClose:()=>void;onOpenComments:()=>void;anchorRef:{current:HTMLDivElement|null}}){
  const[permission,setPermission]=useState<NotificationPermission|'checking'|'unsupported'>('checking');const[placed,setPlaced]=useState(false);const panelRef=useRef<HTMLElement>(null);
  useEffect(()=>{setPermission(typeof Notification==='undefined'?'unsupported':Notification.permission)},[]);
  useEffect(()=>{if(!open){setPlaced(false);return}const place=()=>{const anchor=anchorRef.current,panel=panelRef.current;if(!anchor||!panel)return;if(window.innerWidth>820){const r=anchor.getBoundingClientRect(),w=Math.min(365,window.innerWidth-24);panel.style.position='fixed';panel.style.left=`${Math.max(12,Math.min(r.right+13,window.innerWidth-w-12))}px`;panel.style.right='auto';panel.style.width=`${w}px`;panel.style.top='12px';panel.style.bottom='auto';const h=panel.offsetHeight;panel.style.top=`${Math.max(12,Math.min(r.bottom-h,window.innerHeight-h-12))}px`}else{panel.style.position='fixed';panel.style.left='';panel.style.right='';panel.style.top='';panel.style.bottom='';panel.style.width=''}setPlaced(true)};place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[open,anchorRef]);
  const signals=alerts.filter(x=>!x.toLowerCase().includes('kommentar'));
  const requestPermission=()=>{if(typeof Notification==='undefined')return;void Notification.requestPermission().then(setPermission).catch(()=>setPermission('denied'))};
  return<section ref={panelRef}id="notification-center"className="notification-pop c"data-placed={placed?'true':'false'}role="region"aria-label="Notiscenter"hidden={!open}>
    <div className="notification-head"><div className="notification-emblem"aria-hidden="true">⌁</div><div><div className="notification-eyebrow">STILLEAFFE · LIVE</div><h3>Notiscenter</h3></div><button type="button"className="notification-close"onClick={onClose}aria-label="Stäng notiscenter">×</button></div>
    <div className="notification-summary">{signals.length?`${signals.length} lägesnotis${signals.length===1?'':'er'}`:unread?`${unread} oläst${unread===1?'':'a'} kommentar${unread===1?'':'er'}`:'Inga aktiva notiser just nu'}</div>
    <div className="notification-list"aria-live="polite">
      {signals.map((item,i)=><article className="notification-item"key={item}><span className="notification-item-glyph"aria-hidden="true">{i===0?'↗':'◈'}</span><p>{item}</p></article>)}
      {unread>0&&<article className="notification-item notification-comments"><span className="notification-item-glyph"aria-hidden="true">✎</span><p><b>{unread} oläst{unread===1?'':'a'} kommentar{unread===1?'':'er'}</b><small>I Kommentarer · markeras som läst när du öppnar</small></p><button type="button"className="notification-open"onClick={onOpenComments}>Visa ↗</button></article>}
      {!signals.length&&!unread&&<div className="notification-empty"><span aria-hidden="true">✓</span><b>Inget som väntar</b><p>Nya lägesnotiser visas här när det finns något att följa upp.</p></div>}
    </div>
    <div className="notification-footer"><span className={'permission-dot '+(permission==='granted'?'is-on':'')}/><span className="notification-permission-text">{permission==='granted'?'Skrivbordsnotiser aktiverade':permission==='denied'?'Notiser blockerade i webbläsaren':permission==='unsupported'?'Skrivbordsnotiser stöds inte här':permission==='checking'?'Kontrollerar notistillstånd':'Skrivbordsnotiser av'}</span>{permission==='default'&&<button type="button"className="notification-enable"onClick={requestPermission}>Aktivera</button>}</div>
  </section>;
}
function NetStatus({onReconnect}:{onReconnect:()=>void}){
  const[off,setOff]=useState(false);
  useEffect(()=>{
    const offline=()=>setOff(true);
    const online=()=>{setOff(false);void onReconnect()};
    offlineIfNeeded();
    function offlineIfNeeded(){if(!navigator.onLine)setOff(true)}
    window.addEventListener('online',online);window.addEventListener('offline',offline);
    return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline)}
  },[onReconnect]);
  return off?<div className="netoff"role="status">Du är offline – siffrorna uppdateras när anslutningen är tillbaka.</div>:null
}
function ScrollPill(){
  const[st,setSt]=useState<'hide'|'down'|'up'>('hide');
  useEffect(()=>{
    let raf=0;const el=document.documentElement;
    const update=()=>{const next:typeof st=el.scrollHeight<=window.innerHeight+160?'hide':window.scrollY<240?'down':'up';setSt(current=>current===next?current:next)};
    const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update)};
    schedule();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
    if(observer)observer.observe(document.body);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);observer?.disconnect()}
  },[]);
  if(st==='hide')return null;
  return<button type="button"className="scrollpill"aria-label={st==='down'?'Till botten':'Till toppen'}onClick={()=>{const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;window.scrollTo({top:st==='down'?document.documentElement.scrollHeight:0,behavior:reduce?'auto':'smooth'})}}>{st==='down'?'↓':'↑'}</button>
}
function Checklist({can,hasToday}:{can:boolean;hasToday:boolean}){
  const items=can?['Dagens siffror registrerade','Anteckning om dagen skriven','Fokus för imorgon bestämt']:['Dagens siffror kollade','Följ upp med Stille','Veckomålet kontrollerat'];
  const manualCount=can?2:3,key='sd_chk_'+(can?'s':'m')+'_'+isoD(new Date());
  const[on,setOn]=useState<boolean[]>(()=>Array(3).fill(false));
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(key)||'[]');setOn(Array.from({length:manualCount},(_,i)=>!!v[i]))}catch{setOn(Array(manualCount).fill(false))}},[key,manualCount]);
  const flip=(i:number)=>{if(can&&i===0)return;const index=can?i-1:i,n=on.map((x,j)=>j===index?!x:x);setOn(n);try{localStorage.setItem(key,JSON.stringify(n))}catch{}};
  const checked=(i:number)=>can&&i===0?hasToday:!!on[can?i-1:i];
  const done=items.reduce((n,_,i)=>n+(checked(i)?1:0),0);
  return<div className="c chk"><div className="k">{can?'Dagens avslut':'Chefens koll'} · {done}/{items.length}</div><div className="chk-g">{items.map((t,i)=><button type="button"key={i}className={'chk-i'+(checked(i)?' on':'')}aria-pressed={checked(i)}disabled={can&&i===0}title={can&&i===0?'Uppdateras automatiskt från dagens registrering':''}onClick={()=>flip(i)}><i aria-hidden="true">{checked(i)?'✓':''}</i>{t}</button>)}</div>{done===items.length&&<div className="s"style={{marginTop:8}}>Allt klart – snyggt jobbat idag. 🎯</div>}</div>
}
function MonthSummary({rows,g}:{rows:Row[];g:Goals}){
  const[copied,setCopied]=useState(false);
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),pre=(a:number,b:number)=>a+'-'+pad2(b+1);
  const pmD=new Date(y,m-1,1),prevDay=Math.min(now.getDate(),new Date(y,m,0).getDate()),prevThrough=isoD(new Date(y,m-1,prevDay)),cm=rows.filter(r=>r.entry_date.startsWith(pre(y,m))),pm=rows.filter(r=>r.entry_date>=isoD(pmD)&&r.entry_date<=prevThrough);
  const S=(x:Row[])=>x.reduce((t,r)=>t+Number(r.sales||0),0),T=(x:Row[])=>x.reduce((t,r)=>t+Number(r.tb_sek||0),0),H=(x:Row[])=>x.reduce((t,r)=>t+Number((r as any).hours||0),0);
  const cs=S(cm),ct=T(cm),ps=S(pm),pt=T(pm),days=cm.filter(r=>Number(r.sales)>0).length,best=[...cm].sort((a,b)=>Number(b.sales)-Number(a.sales))[0];
  const tbPer=cs?ct/cs:0,ptb=ps?pt/ps:0,hrs=H(cm),perHr=hrs>0?cs/hrs:0,diff=ps>0?Math.round((cs-ps)/ps*100):null;
  const l30=rows.filter(r=>r.entry_date>=isoD(new Date(y,m,now.getDate()-29))&&Number(r.sales)>0),avg30=l30.length?S(l30)/l30.length:0,suggest=avg30?Math.max(1,Math.ceil(avg30*1.1)):0;
  const mn=now.toLocaleDateString('sv-SE',{month:'long'});
  const text=cs?`${mn[0].toUpperCase()+mn.slice(1)} hittills: ${cs} sälj och ${sv(ct)} kr TB på ${days} säljdagar${best?`. Bästa dag: ${best.entry_date} med ${Number(best.sales)} sälj`:''}${diff!==null?`. ${diff>=0?'Upp':'Ner'} ${Math.abs(diff)}% mot samma period förra månaden`:''}.`:cm.length?'Inga sälj registrerade den här månaden ännu.':'Inga registreringar den här månaden ännu.';
  const dow=(now.getDay()+6)%7,a=isoD(new Date(y,m,now.getDate()-dow)),b=isoD(new Date(y,m,now.getDate()-dow-7)),wk=rows.filter(r=>r.entry_date>=a&&r.entry_date<=isoD(now)),pw=rows.filter(r=>r.entry_date>=b&&r.entry_date<a);
  const wtxt=`Veckorapport: ${S(wk)} sälj, TB ${sv(T(wk))} kr hittills denna vecka${S(pw)?` (förra veckan ${S(pw)} sälj, ${sv(T(pw))} kr)`:''}.`;
  const copy=async()=>{try{await navigator.clipboard.writeText(wtxt)}catch{const t=document.createElement('textarea');t.value=wtxt;document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch{}t.remove()}setCopied(true);setTimeout(()=>setCopied(false),1800)};
  return<div className="c msum"><div className="msum-h"><div className="k">Sammanfattning · {mn}</div><div className="row noprint"><button className="b ghost"onClick={copy}>{copied?'Kopierat ✓':'Kopiera veckorapport'}</button><button className="b ghost"onClick={()=>window.print()}>🖨 Skriv ut / PDF</button></div></div>
    <p className="msum-t">{text}</p>
    <div className="msum-g">
      <div><span>TB per sälj</span><b className="num">{cs?sv(tbPer)+' kr':'–'}</b><small className={ptb&&tbPer>=ptb?'pos':'neu'}>{ptb?`${tbPer>=ptb?'▲':'▼'} mot ${sv(ptb)} kr förra månaden`:'Ingen jämförelse än'}</small></div>
      <div><span>Sälj per timme</span><b className="num">{perHr?perHr.toFixed(2):'–'}</b><small>{hrs?`${hrs} h registrerade`:'Inga timmar registrerade'}</small></div>
      <div><span>Förslag dagsmål</span><b className="num">{suggest||'–'}</b><small>{avg30?`Snitt ${avg30.toFixed(1)} + 10% · nu ${g.daily_sales}`:'Behöver mer data'}</small></div>
      <div><span>Säljdagar</span><b className="num">{days}</b><small>längsta rad: {longestStreak(rows)} arbetsdagar</small></div>
    </div></div>
}
function Compare({rows}:{rows:Row[]}){
  const now=new Date(),d=(n:number)=>isoD(new Date(now.getFullYear(),now.getMonth(),now.getDate()-n));
  const[a1,setA1]=useState(d(6)),[a2,setA2]=useState(d(0)),[b1,setB1]=useState(d(13)),[b2,setB2]=useState(d(7));
  const preset=(n:number)=>{setA1(d(n-1));setA2(d(0));setB1(d(2*n-1));setB2(d(n))};
  const monthToDate=()=>{
    const y=now.getFullYear(),m=now.getMonth(),prevLast=new Date(y,m,0),prevDay=Math.min(now.getDate(),prevLast.getDate());
    setA1(isoD(new Date(y,m,1)));setA2(isoD(now));setB1(isoD(new Date(y,m-1,1)));setB2(isoD(new Date(y,m-1,prevDay)));
  };
  type Period={rows:number;s:number;tb:number;days:number;avg:number|null};
  const agg=(from:string,to:string):Period=>{
    const x=rows.filter(r=>r.entry_date>=from&&r.entry_date<=to),sales=x.reduce((q,r)=>q+Number(r.sales||0),0),tb=x.reduce((q,r)=>q+Number(r.tb_sek||0),0),days=x.filter(r=>Number(r.sales)>0).length;
    return{rows:x.length,s:sales,tb,days,avg:days?sales/days:null};
  };
  const validA=!!a1&&!!a2&&a1<=a2,validB=!!b1&&!!b2&&b1<=b2;
  const A:Period|null=validA?agg(a1,a2):null,B:Period|null=validB?agg(b1,b2):null;
  const line:[string,keyof Period,boolean][]=[['Sälj','s',false],['TB (kr)','tb',false],['Säljdagar','days',false],['Snitt sälj/säljdag','avg',true]];
  const display=(period:Period|null,key:keyof Period,decimal:boolean)=>{
    if(!period||period.rows===0)return'–';
    const value=period[key];if(value===null)return'–';
    return decimal?Number(value).toFixed(1):sv(Number(value));
  };
  return<div className="c cmp">
    <div className="msum-h"><div className="k">Jämför två perioder</div><div className="row noprint"><button type="button"className="b ghost"onClick={()=>preset(7)}>7 d mot 7 d</button><button type="button"className="b ghost"onClick={()=>preset(30)}>30 d mot 30 d</button><button type="button"className="b ghost"onClick={monthToDate}>Månad mot månad hittills</button></div></div>
    <div className="cmp-in">
      <div><label>Period A</label><div className="row"><input aria-label="Period A, från"type="date"max={today()}value={a1}onChange={e=>setA1(e.target.value)}/><input aria-label="Period A, till"type="date"max={today()}value={a2}onChange={e=>setA2(e.target.value)}/></div></div>
      <div><label>Period B</label><div className="row"><input aria-label="Period B, från"type="date"max={today()}value={b1}onChange={e=>setB1(e.target.value)}/><input aria-label="Period B, till"type="date"max={today()}value={b2}onChange={e=>setB2(e.target.value)}/></div></div>
    </div>
    {(!validA||!validB)&&<p className="s"role="alert">Välj giltiga datumintervall där startdatum inte ligger efter slutdatum.</p>}
    {A?.rows===0||B?.rows===0?<p className="s"role="status">Minst en period saknar registrerade dagar. De visas som streck, inte som nollor.</p>:null}
    <table><thead><tr><th></th><th>A</th><th>B</th><th>Skillnad</th></tr></thead><tbody>{line.map(([label,key,decimal])=>{
      const av=A?.[key],bv=B?.[key];
      const delta=A&&B&&A.rows>0&&B.rows>0&&av!==null&&bv!==null&&Number(bv)>0?Math.round((Number(av)-Number(bv))/Number(bv)*100):null;
      return<tr key={label}><td>{label}</td><td className="num">{display(A,key,decimal)}</td><td className="num">{display(B,key,decimal)}</td><td className={'num '+(delta===null?'neu':delta>=0?'pos':'neg')}>{delta===null?'–':(delta>=0?'▲ ':'▼ ')+Math.abs(delta)+'%'}</td></tr>
    })}</tbody></table>
  </div>
}

/* 3D visualization of confirmed rows only: a missing row is not treated as zero. */
function Bars3D({rows}:{rows:Row[]}){
  const [yy,mm,dd]=today().split('-').map(Number),now=new Date(yy,mm-1,dd),td=today(),L=['S','M','T','O','T','F','L'];
  const days=Array.from({length:7},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(6-i)),k=isoD(d),r=rows.find(x=>x.entry_date===k);
    return{k,w:L[d.getDay()],sales:r?Number(r.sales):null,tb:r?Number(r.tb_sek):null};
  });
  const recorded=days.filter(d=>d.sales!==null),mx=Math.max(1,...recorded.map(d=>d.sales||0));
  const total=recorded.reduce((n,d)=>n+(d.sales||0),0),best=recorded.reduce<(typeof recorded)[number]|null>((top,d)=>!top||(d.sales||0)>(top.sales||0)?d:top,null);
  const summary=best?`Bästa registrerade dag: ${best.k} (${best.sales} sälj)`:'Ingen registrering under de senaste sju dagarna.';
  return<section className="c tilt b3"aria-labelledby="sales-3d-title"onPointerMove={e=>{const scene=e.currentTarget.querySelector<HTMLElement>('.b3-scene');if(!scene)return;if(e.pointerType!=='mouse'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||e.currentTarget.closest('.app')?.getAttribute('data-depth-mode')==='quiet'){scene.style.removeProperty('--rx');scene.style.removeProperty('--ry');return}const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;scene.style.setProperty('--rx',`${(-y*3).toFixed(2)}deg`);scene.style.setProperty('--ry',`${(x*3.5).toFixed(2)}deg`)}}onPointerLeave={e=>{const scene=e.currentTarget.querySelector<HTMLElement>('.b3-scene');scene?.style.removeProperty('--rx');scene?.style.removeProperty('--ry')}}>
    <div className="b3-h"><div><div id="sales-3d-title"className="k">Senaste 7 dagarna · 3D</div><div className="b3-tot num">{recorded.length?fmt(total):'–'} <small>{recorded.length?'sälj':'registreringar'}</small></div></div><div className="s">{summary}</div></div>
    <div className="b3-stage"aria-hidden="true"><div className="b3-scene">{days.map((d,i)=>{
      const height=d.sales===null?6:d.sales===0?8:Math.max(18,(d.sales/mx)*150);
      const classes='b3-bar'+(d.k===td?' today':'')+(d.sales===0?' zero':'')+(d.sales===null?' missing':'');
      return<div key={d.k}className={classes}style={{'--i':i,'--h':height+'px'}as any}title={d.sales===null?`${d.k}: ingen registrering`:`${d.k}: ${d.sales} sälj · ${sv(d.tb||0)} kr`}><div className="f front"><b className="num">{d.sales===null?'–':d.sales}</b><small>{d.w}</small></div><div className="f side"/><div className="f top"/></div>
    })}<div className="b3-floor"/></div></div>
    <ul className="sr-only"aria-label="Detaljer för försäljning senaste sju dagarna">{days.map(d=><li key={d.k}>{d.k}: {d.sales===null?'ingen registrering':`${d.sales} sälj, ${sv(d.tb||0)} kronor i TB`}</li>)}</ul>
  </section>
}

export default function App(){
  const[rows,setRows]=useState<Row[]>([]);const[g,setG]=useState<Goals>(DEF);
  const[role,setRole]=useState<''|'seller'|'manager'>('');
  const[tab,setTab]=useState<TabId>('overview');const[edit,setEdit]=useState<number|null>(null);
  const[toast,setToast]=useState('');const[loading,setLoading]=useState(true);const[fetchedAt,setFetchedAt]=useState(0);const[showAffeTease,setShowAffeTease]=useState(false);

  const[rg,setRg]=useState<'Idag'|'Denna vecka'|'Denna månad'|'Föregående månad'|'Detta år'|'Allt'>('Denna månad');
  const[msgs,setMsgs]=useState<Msg[]>([]);const[q,setQ]=useState('');const[busy,setBusy]=useState(false);
  const[ks,setKs]=useState<{configured:boolean;source:string|null}>({configured:false,source:null});const[keyIn,setKeyIn]=useState('');
  const[coachAi,setCoachAi]=useState('');const[coachBusy,setCoachBusy]=useState(false);const[autoCoach,setAutoCoach]=useState(true);
  const coachRequestKey=useRef('');
  const can=role==='seller';
  const visibleTabs=can?TABS:TABS.filter(t=>t.id!=='register');
  useEffect(()=>{document.documentElement.dataset.role=role},[role]);
  useEffect(()=>{if(role!=='manager'||loading)return;setShowAffeTease(true);const timer=window.setTimeout(()=>setShowAffeTease(false),10_000);return()=>window.clearTimeout(timer)},[role,loading]);
  const[cm,setCm]=useState<CItem[]>([]);const[unread,setUnread]=useState(0);
  const[cText,setCText]=useState('');const[cDate,setCDate]=useState('');
  const[bell,setBell]=useState(false);const[err,setErr]=useState('');
  const[theme,setTheme]=useState<string>('default');const[themeInit,setThemeInit]=useState(false);const[depthMode,setDepthMode]=useState<'studio'|'quiet'>('studio');
  const[curPw,setCurPw]=useState('');const[newPw,setNewPw]=useState('');const[newPw2,setNewPw2]=useState('');const[pwMsg,setPwMsg]=useState<{t:string;ok?:boolean}|null>(null);
  const[activity,setActivity]=useState<Activity[]>([]);
  const[moodSel,setMoodSel]=useState<Mood>(null);
  const[sound,setSound]=useState(true);const[haptics,setHaptics]=useState(true);
  const[cmd,setCmd]=useState(false);const[cmdQ,setCmdQ]=useState('');const[cmdI,setCmdI]=useState(0);
  const[unlocked,setUnlocked]=useState<Set<string>>(new Set());const[achReady,setAchReady]=useState(false);
  const[achPopup,setAchPopup]=useState<AchDef|null>(null);
  const[quote]=useState(()=>quoteOfDay());
  const bellRef=useRef<HTMLDivElement>(null);const mainRef=useRef<HTMLElement>(null);const spotRef=useRef<HTMLDivElement>(null);const mouseRaf=useRef<number|null>(null);
  const say=useCallback((t:string)=>{setToast(t);setTimeout(()=>setToast(''),2600);if(sound)beep(880,.08,'triangle',.04)},[sound]);
  const buzz=useCallback((pattern:number|number[]=18)=>{if(haptics)haptic(pattern)},[haptics]);

  // Mouse-follow spotlight without rerendering the whole dashboard on every pointer move.
  useEffect(()=>{const on=(e:MouseEvent)=>{const{x,y}=e;if(mouseRaf.current!==null)cancelAnimationFrame(mouseRaf.current);mouseRaf.current=requestAnimationFrame(()=>{if(spotRef.current){spotRef.current.style.left=x+'px';spotRef.current.style.top=y+'px';spotRef.current.classList.remove('hidden')}})};const off=()=>spotRef.current?.classList.add('hidden');window.addEventListener('mousemove',on,{passive:true});window.addEventListener('mouseleave',off);return()=>{window.removeEventListener('mousemove',on);window.removeEventListener('mouseleave',off);if(mouseRaf.current!==null)cancelAnimationFrame(mouseRaf.current)}},[]);

  // Theme + sound init
  useEffect(()=>{try{const s=localStorage.getItem('sd_theme')||'default';setTheme(s);applyTheme(s);setSound(localStorage.getItem(SOUND_ENABLED_KEY)!=='0');setHaptics(localStorage.getItem(HAPTIC_ENABLED_KEY)!=='0');setAutoCoach(localStorage.getItem('sd_auto_coach')!=='0');setDepthMode(localStorage.getItem('sd_depth_mode')==='quiet'?'quiet':'studio')}catch{}setThemeInit(true)},[]);
  useEffect(()=>{if(!themeInit)return;applyTheme(theme);try{localStorage.setItem('sd_theme',theme)}catch{}},[theme,themeInit]);
  useEffect(()=>{if(!themeInit)return;try{localStorage.setItem('sd_depth_mode',depthMode)}catch{}},[depthMode,themeInit]);
  useEffect(()=>{try{localStorage.setItem(SOUND_ENABLED_KEY,sound?'1':'0')}catch{}},[sound]);
  useEffect(()=>{try{localStorage.setItem(HAPTIC_ENABLED_KEY,haptics?'1':'0')}catch{}},[haptics]);
  useEffect(()=>{if(!themeInit)return;try{localStorage.setItem('sd_auto_coach',autoCoach?'1':'0')}catch{}},[autoCoach,themeInit]);

  // Favicon + document title live update
  useEffect(()=>{if(loading)return;const ts=rows.find(r=>r.entry_date===today())?.sales||0;const p=pct(ts,g.daily_sales);const accent=getComputedStyle(document.documentElement).getPropertyValue('--gr').trim()||'#58d4ab';const warning=getComputedStyle(document.documentElement).getPropertyValue('--am').trim()||'#d8b05e';const title=`${ts}/${g.daily_sales} (${p}%) · Säljdashboard`;document.title=title;const f=document.querySelector('link[rel="icon"]')as HTMLLinkElement||document.createElement('link');if(!f.parentElement){f.rel='icon';document.head.appendChild(f)}const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#06080b';ctx.fillRect(0,0,64,64);ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(32,32,24,-Math.PI/2,2*Math.PI-Math.PI/2);ctx.stroke();ctx.strokeStyle=ts>=g.daily_sales?accent:p>=70?warning:'#64707d';ctx.lineWidth=6;ctx.beginPath();ctx.arc(32,32,24,-Math.PI/2,-Math.PI/2+2*Math.PI*(Math.min(p,100)/100));ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 22px Inter,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(ts),32,32);f.href=canvas.toDataURL('image/png')},[rows,g,loading,role]);

  // Command palette (Ctrl/Cmd+K)
  useEffect(()=>{const on=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCmd(v=>!v)}else if(e.key==='Escape'){setCmd(false);setBell(false)}};window.addEventListener('keydown',on);return()=>window.removeEventListener('keydown',on)},[]);

  const load=useCallback(async()=>{
    let j:any={};try{j=await(await fetch('/api/data',{credentials:'same-origin'})).json()}catch{j={error:'Kunde inte nå servern.'}}
    if(j.role)setRole(j.role);
    if(j.error){setErr(j.error);setLoading(false);return}
    setErr('');
    const mapped=(j.rows||[]).map((x:any)=>({...x,sales:Number(x.sales),tb_sek:Number(x.tb_sek),hours:x.hours==null?null:Number(x.hours),rating:x.rating==null?null:Number(x.rating),mood:x.mood||null,tags:Array.isArray(x.tags)?x.tags:[]}));
    setRows(mapped);setFetchedAt(Date.now());
    const gg:Goals=j.goals?{
      daily_sales:Number(j.goals.daily_sales)||DEF.daily_sales,daily_tb:Number(j.goals.daily_tb)||DEF.daily_tb,
      weekly_sales:Number(j.goals.weekly_sales)||DEF.weekly_sales,weekly_tb:Number(j.goals.weekly_tb)||DEF.weekly_tb,
      monthly_sales:Number(j.goals.monthly_sales)||DEF.monthly_sales,monthly_tb:Number(j.goals.monthly_tb)||DEF.monthly_tb,
    }:DEF;setG(gg);
    setActivity(j.activity||[]);
    setLoading(false);loadC();
    fetch('/api/ai/key',{credentials:'same-origin'}).then(x=>x.json()).then(k=>{if(k.configured!==undefined)setKs(k)}).catch(()=>{});
    fetch('/api/achievements',{credentials:'same-origin'}).then(x=>x.json()).then(a=>{if(Array.isArray(a.items))setUnlocked(new Set(a.items.map((x:any)=>x.key)))}).catch(()=>{}).finally(()=>setAchReady(true));
  },[]);
  useEffect(()=>{load()},[load]);
  useEffect(()=>{if(!achReady||!rows.length||loading)return;
    const newly=ACHIEVEMENTS.filter(a=>!unlocked.has(a.key)&&a.cond(rows,g,unlocked)).map(a=>a.key);
    if(!newly.length)return;
    const first=newly[0];
    const def=ACH_MAP[first];
    setUnlocked(s=>new Set([...s,...newly]));
    Promise.all(newly.map(key=>fetch('/api/achievements',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({key})}).catch(()=>null)));
    setAchPopup(def);if(sound)chime();buzz([50,30,50,30,100]);confetti(true);
    const close=setTimeout(()=>setAchPopup(null),4200);
    return()=>clearTimeout(close);
  },[rows,g,unlocked,loading,sound,achReady,buzz]);

  // Auto-refresh every 60s
  useEffect(()=>{const t=setInterval(load,60000);return()=>clearInterval(t)},[load]);

  const loadC=useCallback(async()=>{try{const j=await(await fetch('/api/comments',{credentials:'same-origin'})).json();if(j.items){setCm(j.items);setUnread(j.unread||0)}}catch{}},[]);
  useEffect(()=>{const t=setInterval(loadC,30000);return()=>clearInterval(t)},[loadC]);
  useEffect(()=>{if(tab==='comments')fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:'{"action":"seen"}'}).then(()=>setUnread(0)).catch(()=>{})},[tab]);
  useEffect(()=>{if(!bell)return;const on=(e:MouseEvent)=>{if(bellRef.current&&!bellRef.current.contains(e.target as Node))setBell(false)};document.addEventListener('mousedown',on);return()=>document.removeEventListener('mousedown',on)},[bell]);
  useEffect(()=>{if(loading||typeof Notification==='undefined'||Notification.permission!=='granted')return;let sent:string[]=[];try{sent=JSON.parse(localStorage.getItem('sd_n')||'[]')}catch{};const key=today();const fresh=buildAlerts(rows,g,role,unread).filter(x=>!sent.includes(key+x));fresh.forEach(x=>new Notification('Säljdashboard',{body:x}));if(fresh.length)try{localStorage.setItem('sd_n',JSON.stringify([...sent.slice(-30),...fresh.map(x=>key+x)]))}catch{}},[rows,g,role,unread,loading]);

  function buildAlerts(rows:Row[],g:Goals,role:string,unread:number):string[]{const a:string[]=[];const hr=new Date().getHours();const t=rows.find(r=>r.entry_date===today());const ms=sum(rows.filter(r=>mon(r.entry_date)===mon(today())),'sales');const plan=g.monthly_sales*(workdaysElapsed()/Math.max(workdaysTotal(),1));const who=role==='seller'?'Du':'Stille';if(unread)a.push(`${unread} ny${unread>1?'a kommentarer':' kommentar'}`);if(!rows.length)return a;if(hr>=15&&!t)a.push(`${who} har inget registrerat idag än`);else if(t&&hr>=15&&t.sales<g.daily_sales)a.push(`Dagsmål: ${g.daily_sales-t.sales} sälj kvar`);if(plan-ms>=2)a.push(`${who} ligger ${f1(plan-ms)} sälj efter planen`);else if(ms-plan>=3)a.push(`${who} ligger ${f1(ms-plan)} sälj före planen 🔥`);return a}

  async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const d=String(f.get('d')),s=Number(f.get('s')),tb=Number(f.get('t'));const hh=String(f.get('h')||''),h=hh===''?null:Number(hh);if(!Number.isInteger(s)||s<0||!(tb>=0)||(h!==null&&!(h>=0&&h<=24)))return alert('Ogiltiga värden.');const ex=rows.find(r=>r.entry_date===d&&r.id!==edit);if(ex&&!confirm(`Det finns redan en registrering för ${d} (${ex.sales} sälj). Ersätta?`))return;const wasGoal=(rows.find(r=>r.entry_date===d)?.sales||0)>=g.daily_sales;const r=await api({action:'upsert',entry_date:d,sales:s,tb_sek:tb,hours:h,note:String(f.get('n')||'').trim()||null,mood:moodSel,rating:Number(f.get('rating'))||null,tags:String(f.get('tags')||'').split(',').map(x=>x.trim()).filter(Boolean),replace_id:edit});if(r.error)return alert('Kunde inte spara: '+r.error);if(s>=g.daily_sales&&!wasGoal&&d===today()){confetti(true);if(sound)chime();buzz([40,25,80])}else if(sound){beep(660,.1,'triangle',.05);buzz(18)}setEdit(null);setMoodSel(null);await load();setTab('overview');say(ex?'Ersatte registrering':'Sparat ✓')}
  async function del(id:number){if(!confirm('Ta bort registreringen?'))return;const r=await api({action:'delete',id});if(r.error)return alert(r.error);await load();say('Borttaget ✓')}
  async function saveGoals(ng:Goals){const r=await api({action:'goals',...ng});if(r.error)return alert(r.error);setG(ng);say('Mål sparade ✓')}
  function csv(){const BOM='\uFEFF';const t=BOM+'datum;sälj;tb (kr);timmar;humör;anteckning\n'+rows.map(r=>[r.entry_date,r.sales,r.tb_sek,r.hours??'',r.mood||'',`"${(r.note||'').replace(/"/g,'""')}"`].join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'}));a.download=`salj-${today()}.csv`;a.click();URL.revokeObjectURL(a.href)}
  async function quick(){const wasGoal=ts>=g.daily_sales;const r=await api({action:'upsert',entry_date:today(),sales:ts+1,tb_sek:tt,hours:todayRow?.hours??null,note:todayRow?.note??null,mood:todayRow?.mood,rating:todayRow?.rating,tags:todayRow?.tags||[]});if(r.error)return alert(r.error);if(!wasGoal&&ts+1>=g.daily_sales){confetti(true);if(sound)chime();buzz([40,25,80])}else{if(sound)beep(740,.08,'triangle',.05);buzz(14)}await load();say('+1 sälj 🔥')}
  async function ask(question:string){const hist:Msg[]=[...msgs,{r:'u',t:question}];setMsgs(hist);setBusy(true);try{const j=await(await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({messages:hist.filter(m=>!m.e).slice(-8).map(m=>({role:m.r==='u'?'user':'assistant',content:m.t}))})})).json();const ps=(j.proposals||[]).map((p:any,i:number)=>({...p,id:Date.now()+'-'+i}));setMsgs(m=>[...m,{r:'a',t:j.text||(ps.length?'Jag föreslår:':j.error||'Något gick fel.'),e:!j.text&&!ps.length,props:ps}])}catch{setMsgs(m=>[...m,{r:'a',t:'AI är inte tillgänglig just nu.',e:true}])}setBusy(false)}
  async function apply(p:Prop){let r:any;if(p.tool==='registrera_dag')r=await api({action:'upsert',entry_date:p.input.entry_date,sales:p.input.sales,tb_sek:p.input.tb_sek,hours:p.input.hours??null,note:p.input.note??null});else if(p.tool==='satt_mal')r=await api({action:'goals',...g,...p.input});else r=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'add',body:p.input.body,entry_date:p.input.entry_date||null})}).then(x=>x.json());if(r.error)return alert(r.error);setMsgs(m=>m.map(x=>({...x,props:x.props?.map(y=>y.id===p.id?{...y,done:true}:y)})));await load();say('Klart ✓')}
  async function postC(e:React.FormEvent){e.preventDefault();if(!cText.trim())return;const j=await(await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'add',body:cText.trim(),entry_date:cDate||null})})).json();if(j.error)return alert(j.error);setCText('');setCDate('');loadC();say('Skickat ✓');if(sound)beep(580,.08,'triangle',.04);buzz(12)}
  async function react(id:number,r:string){const x=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'react',id,reaction:r})});const j=await x.json().catch(()=>({}));if(j.error)return say('Kunde inte reagera');loadC()}
  async function pinComment(c:CItem){const x=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'pin',id:c.id,pinned:!c.pinned})});const j=await x.json().catch(()=>({}));if(j.error)return say('Kunde inte pinna');loadC();say(c.pinned?'Pin borttagen':'Fastnålad 📌')}
  async function keyCall(method:string,key?:string){const r=await fetch('/api/ai/key',{method,headers:{'content-type':'application/json'},credentials:'same-origin',body:key?JSON.stringify({key}):undefined});const j=await r.json();if(!r.ok)return alert(j.error);setKs(j);setKeyIn('');say(j.configured?'Nyckel sparad ✓':'Nyckel borttagen')}
  async function setToday(sales:number,tb:number){const r=await api({action:'upsert',entry_date:today(),sales,tb_sek:tb,hours:todayRow?.hours??null,note:todayRow?.note??null,mood:todayRow?.mood,rating:todayRow?.rating,tags:todayRow?.tags||[]});if(r.error)return alert(r.error);await load();say('Uppdaterat ✓')}
  async function clearToday(){if(!todayRow)return;if(!confirm('Nollställ dagens registrering? Den tas bort helt.'))return;const r=await api({action:'delete',id:todayRow.id});if(r.error)return alert(r.error);await load();say('Dagen nollställd ✓')}
  async function doLogout(){if(!confirm('Logga ut?'))return;await fetch('/api/logout',{method:'POST',credentials:'same-origin'});window.location.replace('/login?e=logged_out')}
  async function changePw(e:React.FormEvent){e.preventDefault();setPwMsg(null);if(newPw.length<4)return setPwMsg({t:'Minst 4 tecken.'});if(newPw!==newPw2)return setPwMsg({t:'Matchar inte.'});const r=await fetch('/api/password',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({current:curPw,next:newPw})});const j=await r.json().catch(()=>({}));if(!r.ok)return setPwMsg({t:j.error||'Kunde inte byta.'});setPwMsg({t:'Bytt ✓',ok:true});setCurPw('');setNewPw('');setNewPw2('');say('Lösenord uppdaterat')}
  const api=async(b:any):Promise<any>=>{try{const res=await fetch('/api/data',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(b)});let data:any={};try{data=await res.json()}catch{}if(!res.ok&&!data.error)data.error=`Serverfel (${res.status}).`;return data}catch{return{error:'Kunde inte nå servern.'}}};

  // Command palette items
  const cmds=useMemo(()=>{const all:{label:string;icon:string;k?:string;fn:()=>void}[]=[
    {label:'Gå till Översikt',icon:'◐',fn:()=>setTab('overview')},
    {label:'Registrera ny dag',icon:'＋',fn:()=>setTab('register')},
    {label:'Visa historik',icon:'☰',fn:()=>setTab('history')},
    {label:'Visa statistik',icon:'▥',fn:()=>setTab('stats')},
    {label:'Visa årsvy',icon:'▤',fn:()=>setTab('year')},
    {label:'Visa mål',icon:'◎',fn:()=>setTab('goals')},
    {label:'Visa kommentarer',icon:'✎',fn:()=>setTab('comments')},
    {label:'Öppna AI-coach',icon:'✦',fn:()=>setTab('ai')},
    {label:'Öppna inställningar',icon:'⚙',fn:()=>setTab('settings')},
    {label:'+1 sälj (snabbregistrering)',icon:'🔥',fn:quick},
    {label:'Exportera CSV',icon:'⤓',fn:csv},
    {label:`Ljud ${sound?'av':'på'}`,icon:sound?'🔇':'🔊',fn:()=>setSound(v=>!v)},
  ];return all.filter(x=>x.label.toLowerCase().includes(cmdQ.toLowerCase())&&(can||(x.label!=='Registrera ny dag'&&!x.label.startsWith('+1 sälj'))))},[cmdQ,sound,can]);
  useEffect(()=>{if(cmd){setCmdI(0);setCmdQ('')}else{setCmdQ('')};},[cmd]);

  const cmdAction=(fn:()=>void)=>{fn();setCmd(false)};

  const todayRow=rows.find(r=>r.entry_date===today());
  const mo=rows.filter(r=>mon(r.entry_date)===mon(today()));
  const ts=todayRow?.sales||0,tt=todayRow?.tb_sek||0;
  const ms=sum(mo,'sales'),mt=sum(mo,'tb_sek');const remainingWorkdays=workdaysLeft(),elapsedWorkdays=workdaysElapsed();
  const registeredWorkdays=new Set(mo.filter(r=>r.entry_date<=today()&&isSalesWeekday(r.entry_date)).map(r=>r.entry_date)).size;
  const paceReliable=elapsedWorkdays>0&&registeredWorkdays>=Math.min(3,elapsedWorkdays)&&registeredWorkdays/elapsedWorkdays>=.7;
  const monthHasData=mo.length>0;const planS=g.monthly_sales*(elapsedWorkdays/Math.max(workdaysTotal(),1));const ahead=paceReliable?ms-planS:0;
  const A=range(rows,rg),B=prevRange(rows,rg);const hh=A.filter(r=>r.hours!=null);
  const best=[...A].sort((a,b)=>b.sales-a.sales)[0];const dl=sum(A,'sales')-sum(B,'sales');
  const streak=streakAt(rows,g);const bStreak=bestStreak(rows,g);
  const proj=paceReliable&&registeredWorkdays>=5?(ms/registeredWorkdays)*workdaysTotal():null;
  const wdAvg=[1,2,3,4,5].map(w=>{const x=rows.filter(r=>new Date(r.entry_date+'T12:00').getDay()===w);return{n:['Mån','Tis','Ons','Tor','Fre'][w-1],v:x.length?sum(x,'sales')/x.length:0}});
  const wmax=Math.max(...wdAvg.map(x=>x.v),1);
  const pbd=pbDay(rows),pbt=pbTB(rows);const cmpM=compareMonths(rows);
  const months=groupByMonth(rows).slice(-12);
  const moodStats=Object.keys(MOOD_EMOJI).map(key=>({key,emoji:MOOD_EMOJI[key],count:A.filter(r=>r.mood===key).length}));
  const maxMood=Math.max(...moodStats.map(x=>x.count),1);
  const rated=A.filter(r=>r.rating!=null);const avgRating=rated.length?sum(rated,'rating')/rated.length:0;
  const tagStats=[...new Set(A.flatMap(r=>r.tags||[]))].map(tag=>({tag,days:A.filter(r=>(r.tags||[]).includes(tag)).length,sales:sum(A.filter(r=>(r.tags||[]).includes(tag)),'sales')})).sort((x,y)=>y.sales-x.sales).slice(0,8);
  const dashboardDate=today(),dashboardDateObj=new Date(dashboardDate+'T12:00:00'),weekDayOffset=(dashboardDateObj.getDay()+6)%7;
  const currentWeekKey=weekKey(dashboardDateObj),weekStartDate=new Date(dashboardDateObj);
  weekStartDate.setDate(weekStartDate.getDate()-weekDayOffset);
  const previousWeekStart=new Date(weekStartDate);previousWeekStart.setDate(previousWeekStart.getDate()-7);
  const previousComparableEnd=new Date(previousWeekStart);previousComparableEnd.setDate(previousComparableEnd.getDate()+weekDayOffset+1);
  const currentWeekRows=rows.filter(r=>r.entry_date>=isoD(weekStartDate)&&r.entry_date<=dashboardDate);
  const comparablePrevWeekRows=rows.filter(r=>r.entry_date>=isoD(previousWeekStart)&&r.entry_date<isoD(previousComparableEnd));
  const previousComparableByDate=new Map(comparablePrevWeekRows.map(r=>[r.entry_date,r]));const matchedCurrentWeekRows=currentWeekRows.filter(r=>isSalesWeekday(r.entry_date)&&(()=>{const d=new Date(r.entry_date+'T12:00:00');d.setDate(d.getDate()-7);return previousComparableByDate.has(isoD(d))})());const pairedCurrentSales=sum(matchedCurrentWeekRows,'sales'),pairedPreviousSales=matchedCurrentWeekRows.reduce((n,r)=>{const d=new Date(r.entry_date+'T12:00:00');d.setDate(d.getDate()-7);return n+Number(previousComparableByDate.get(isoD(d))?.sales||0)},0),weekTrend=matchedCurrentWeekRows.length&&pairedPreviousSales>0?Math.round((pairedCurrentSales/pairedPreviousSales-1)*100):undefined;
  const weekTotals=new Map(weekSales(rows.filter(r=>r.entry_date<=dashboardDate)).map(w=>[w.key,w]));
  const priorWeeks=Array.from({length:7},(_,i)=>{const d=new Date(weekStartDate);d.setDate(d.getDate()-7*(7-i));const key=weekKey(d),total=weekTotals.get(key);return{key,sales:total?.sales||0,tb:total?.tb||0}});
  const wks=[...priorWeeks,{key:currentWeekKey,sales:sum(currentWeekRows,'sales'),tb:sum(currentWeekRows,'tb_sek')}];
  const er=edit?rows.find(r=>r.id===edit):null;const alerts=buildAlerts(rows,g,role,unread);
  const greet=greeting();const dayName=new Date().toLocaleDateString('sv-SE',{weekday:'long',day:'numeric',month:'long'});
  const pctToday=todayRow?pct(ts,g.daily_sales):0;
  const pinnedComments=cm.filter(c=>c.pinned);const unpinned=cm.filter(c=>!c.pinned);
  const sortedCm=[...pinnedComments,...unpinned];
  const unlockedArr=ACHIEVEMENTS.filter(a=>unlocked.has(a.key));
  const lockedArr=ACHIEVEMENTS.filter(a=>!unlocked.has(a.key));
  const weekW=wks[wks.length-1];const weekP=weekW?Math.min(100,Math.round(weekW.sales/Math.max(g.weekly_sales,1)*100)):0;
  const recentCoachRows=rows.filter(r=>r.entry_date<=today()).slice(-5);
  const recentCoachAverage=recentCoachRows.length?sum(recentCoachRows,'sales')/recentCoachRows.length:0;
  const monthlySalesGap=Math.max(g.monthly_sales-ms,0),monthlyTbGap=Math.max(g.monthly_tb-mt,0);
  const requiredPerDay=paceReliable&&remainingWorkdays>0?monthlySalesGap/remainingWorkdays:0;
  const coachLocalNow=new Date(),coachIsWorkday=coachLocalNow.getDay()>=1&&coachLocalNow.getDay()<=5;
  const coachNeedsStep=rows.length>0&&((paceReliable&&ahead< -Math.max(2,g.monthly_sales*.04))||(coachIsWorkday&&coachLocalNow.getHours()>=14&&!todayRow));
  const requiredPaceText=!paceReliable?`kan inte bedömas säkert (${registeredWorkdays} av ${elapsedWorkdays} arbetsdagar registrerade)`:remainingWorkdays>0?`cirka ${f1(requiredPerDay)} sälj per arbetsdag`:`månadens arbetsdagar är slut; ${fmt(monthlySalesGap)} sälj återstår till målet`;
  const todayEvidence=todayRow?`${ts} av ${g.daily_sales} sälj`:'ingen registrering (behandla inte som noll)';
  const monthEvidence=monthHasData?`${ms} registrerade sälj av ${g.monthly_sales}; ${registeredWorkdays} av ${elapsedWorkdays} vardagar registrerade`:'inga registreringar hittills';
  const paceEvidence=!paceReliable?`kan inte bedömas säkert (${registeredWorkdays}/${elapsedWorkdays} registrerade vardagar)`: `${ahead<0?`${f1(Math.abs(ahead))} sälj efter`:`${f1(ahead)} sälj före`} planen`;
  const coachPrompt=`Ge mig en kort, rak men schysst säljnudge på svenska. Dagens registrering: ${todayEvidence}. Den här månaden: ${monthEvidence}. Takt: ${paceEvidence}. Återstående arbetsdagar: ${remainingWorkdays}. Krävd takt: ${requiredPaceText}. Snitt senaste ${recentCoachRows.length} registrerade dagar: ${f1(recentCoachAverage)}. Om dagens registrering saknas, be mig registrera den först och dra ingen slutsats om dagens sälj. Om registreringstäckningen är ofullständig, säg att månadstakten inte kan bedömas säkert och be om komplettering. Ge EN konkret nästa handling. Hitta inte på fakta, skuldbelägg inte och föreslå inga ändringar i databasen.`;
  const coachPlanPrompt=`Gör en konkret, respektfull plan för mig som säljare. Dagens registrering: ${todayEvidence}. Månadens registreringar: ${monthEvidence}. Månadstakt: ${paceEvidence}. Återstående arbetsdagar: ${remainingWorkdays}; nödvändig takt: ${requiredPaceText}. Om dagens data saknas eller registreringstäckningen är ofullständig ska du säga det tydligt; behandla inte frånvaro som noll och dra ingen säker slutsats om månadstakten. Ge tre korta steg utan att hitta på fakta.`;

  useEffect(()=>{
    if(!autoCoach||!can||!ks.configured||loading||!coachNeedsStep||!rows.length)return;
    const key=`sd-ai-nudge:${today()}`;
    try{const cached=localStorage.getItem(key);if(cached){setCoachAi(cached);return}}catch{}
    if(coachRequestKey.current===key)return;
    coachRequestKey.current=key;setCoachBusy(true);
    fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({messages:[{role:'user',content:coachPrompt}]})})
      .then(r=>r.json()).then(j=>{if(j.text){setCoachAi(j.text);try{localStorage.setItem(key,j.text)}catch{}}})
      .catch(()=>{}).finally(()=>setCoachBusy(false));
  },[autoCoach,can,ks.configured,loading,coachNeedsStep,rows.length,remainingWorkdays,coachPrompt]);

  if(loading)return<div className="skel"aria-busy="true"aria-label="Laddar"><div className="skel-h"/><div className="skel-g"><i/><i/><i/><i/></div><div className="skel-c"/><div className="skel-c short"/></div>;

  return<div className="app"data-depth-mode={depthMode}><Sparkles/>
    <div ref={spotRef}className="spotlight hidden"aria-hidden="true"/>
    <aside aria-label="Navigation">
      <div className="logo"><i aria-hidden="true"><span>S</span><span>A</span></i><div className="t"><div>Säljdashboard</div><small>Stille &amp; Affe</small></div></div>
      {visibleTabs.map(t=><button key={t.id}className={'nv '+(tab===t.id?'on':'')}onClick={()=>{setTab(t.id);setEdit(null);setMoodSel(null);window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}data-tip={t.label}title={t.label}aria-label={t.label}aria-current={tab===t.id?'page':undefined}><span className="ic">{t.ic}</span><span>{t.label}</span>{t.id==='comments'&&unread>0&&<em className="dot-mini">{unread}</em>}{t.id==='achievements'&&unlockedArr.length>0&&<span className="dot-mini"style={{background:'var(--am)'}}>{unlockedArr.length}</span>}</button>)}
      <div className="notification-dock"ref={bellRef}>
        <button type="button"className={'notification-trigger'+(bell?' open':'')}onClick={()=>setBell(v=>!v)}aria-label={alerts.length?`Notiser, ${alerts.length} aktiva`:'Notiser'}aria-expanded={bell}aria-controls="notification-center"title="Öppna notiscenter">
          <span className="notification-trigger-icon"aria-hidden="true"><svg viewBox="0 0 24 24"fill="none"focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></span><span className="notification-trigger-label">Notiser</span>{alerts.length>0&&<span className="notification-count"aria-hidden="true">{alerts.length>9?'9+':alerts.length}</span>}
        </button>
        <NotificationPanel open={bell}alerts={alerts}unread={unread}anchorRef={bellRef}onClose={()=>setBell(false)}onOpenComments={()=>{setBell(false);setTab('comments');window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}}/>
      </div>
      <div className="who"><b>{can?'Stille':'Affe'}</b><span className="role">{can?'Säljare':'Chef'}</span><div className="row"style={{marginTop:8,gap:6}}><button className="b sm ghost"onClick={()=>setSound(s=>!s)}title="Ljud">{sound?'🔊':'🔇'}</button><button type="button"className="b sm ghost"onClick={doLogout}>Logga ut</button></div></div>
    </aside>
    <main ref={mainRef}key={tab}className="tab-wrap">
      <div className="top">
        <span className="chip">{visibleTabs.find(t=>t.id===tab)?.label||'Översikt'}{tab!=='overview'&&<span className="muted"> · {can?'Stille':'Affe'}</span>}<span className="muted"style={{marginLeft:10,opacity:.5}}>⌘K</span><Freshness at={fetchedAt}onRefresh={load}/></span>

      </div>
      {role==='manager'&&tab==='overview'&&showAffeTease&&<section className="affe-tease"role="status"aria-live="polite"><span className="affe-tease-icon"aria-hidden="true">😏</span><div><div className="affe-tease-k">En snabb pik till Affe</div><p>Du har så bra koll på Stilles siffror att man nästan tror att du säljer själv 😄 Men undrar — vem säljer bäst? 😉</p></div><button type="button"className="affe-tease-close"aria-label="Stäng meddelandet"onClick={()=>setShowAffeTease(false)}>×</button><div className="affe-tease-progress"aria-hidden="true"><i/></div></section>}
      {err&&<div className="c errb"role="alert"><div className="err-title">Databasen kunde inte laddas</div><p className="err-detail">{err}</p><p className="s">{/fetch failed|kunde inte nå servern/i.test(err)?'Vercel kunde inte nå Supabase. Kontrollera Project URL i NEXT_PUBLIC_SUPABASE_URL, att projektet är aktivt och att URL och servernyckel kommer från samma projekt.':'Kontrollera hälsokontrollen och att servern använder en Secret key eller service_role-nyckel — inte anon/publishable.'}</p><div className="row"style={{marginBottom:0}}><button className="b pri"onClick={()=>load()}>Försök igen</button><button className="b"onClick={()=>window.open('/api/health','_blank','noopener,noreferrer')}>Öppna hälsokontroll</button></div></div>}

      {tab==='overview'&&<>
        <h2>{can?`${greet}, Stille`:'Affes ledningsvy'} <span className="ok">{can?'👋':'◈'}</span></h2>
        <p className="sub">{can?<>{dayName} · <span className="num">{streak} dagar i rad {streak>=3&&<span className="streak-fire">🔥</span>}</span></>:`Stilles resultat · ${dayName} · Skrivskyddad översikt`}</p>
        <GoalSnapshot role={can?'seller':'manager'}goal={g}todayRow={todayRow}onEdit={can?()=>setTab('goals'):undefined}/>
        <Motivation seller={can}/>
        <Checklist can={can}hasToday={!!todayRow}/>
        <Bars3D rows={rows}/>
        {can&&<SellerExtras rows={rows}g={g}ts={ts}tt={tt}hasToday={!!todayRow}paceReliable={paceReliable}registeredWorkdays={registeredWorkdays}elapsedWorkdays={elapsedWorkdays}remainingWorkdays={remainingWorkdays}sound={sound}/>}
        {!can&&<div className="mo-two"style={{marginBottom:16}}><StreakDots rows={rows}/><WeekdayInsight rows={rows}/></div>}

        {can&&<TodayFix sales={ts}tb={tt}has={!!todayRow}onSet={setToday}onClear={clearToday}/>}
        <Ticker items={[todayRow?`Idag: ${Number(todayRow.sales)} sälj`:'Idag: ej registrerat',mo.length?`${ms} sälj denna månad`:'Månaden: inga registreringar',mo.length?`TB denna månad: ${sv(mt)} kr`:'TB: inga registreringar denna månad',streak?`${streak} dagar i rad 🔥`:'Ingen aktiv säljrutinrad',can?'Fokus: dagens nästa steg':'Chefsvy · skrivskyddad uppföljning']}/>
        <CoachPanel role={can?'seller':'manager'} hasData={rows.length>0}hasToday={!!todayRow}hasMonthData={monthHasData}paceReliable={paceReliable}registeredWorkdays={registeredWorkdays}elapsedWorkdays={elapsedWorkdays}needsStepUp={coachNeedsStep} todaySales={ts} dailyGoal={g.daily_sales} monthSales={ms} monthGoal={g.monthly_sales} ahead={ahead} remainingWorkdays={remainingWorkdays} requiredPerDay={requiredPerDay} recentAverage={recentCoachAverage} recentDays={recentCoachRows.length} aiText={can&&autoCoach?coachAi:''} aiBusy={can&&autoCoach&&coachBusy} aiConfigured={ks.configured} onAsk={()=>{setTab('ai');if(ks.configured)ask(can?coachPlanPrompt:`Jag är Affe, chef. Utifrån Stilles faktiska registreringar — ${monthHasData?`${ms} registrerade sälj denna månad`:'inga registreringar denna månad'}, ${todayRow?`dagens registrering är ${ts} sälj`:'dagens registrering saknas'}, månadstakt ${paceEvidence}, registreringstäckning ${registeredWorkdays}/${elapsedWorkdays} vardagar, ${remainingWorkdays} arbetsdagar kvar — föreslå ett respektfullt sätt att stötta honom och en bra öppen fråga. Om data saknas, säg det utan att behandla frånvaro som noll. Hitta inte på fakta.`)}}/>
        {!can&&<ManagerReport rows={rows}goal={g}/>}
        {!rows.length?<div className="c empty-state"style={{textAlign:'center',padding:44}}><div className="empty-orbit"aria-hidden="true">{can?'↗':'◌'}</div><h2 style={{marginTop:8}}>{can?'Dags för första registreringen':'Inväntar första registreringen'}</h2><p className="sub">{can?'Logga dagens resultat så får du din första tydliga målbild.':'När Stille registrerar resultat syns tempo, prognos och uppföljning här.'}</p>{can&&<button className="b pri"onClick={()=>setTab('register')}>Registrera dagens siffror</button>}</div>:<>
        <div className="bento">
          <div className="c hero">
            <Ring p={pctToday}sub={todayRow?`${ts}/${g.daily_sales}`:'Ej registrerat'}size={180}/>
            <div>
              <div className="k">Idag{todayRow?.mood&&<span className="day-emoji">{MOOD_EMOJI[todayRow.mood]}</span>}</div>
              <div className="v"style={{fontSize:42}}>{todayRow?<CountUp n={ts}/>:<span>–</span>}<span className="s">{todayRow?` / ${g.daily_sales} sälj`:` / ${g.daily_sales} mål · ej registrerat`}</span></div>
              <p style={{margin:'6px 0 16px',color:'var(--mu2)'}}>
                {!todayRow?'Dagens resultat är inte registrerat ännu.':ts<g.daily_sales?<>Det behövs <b className="ok">{g.daily_sales-ts} sälj</b> till för att nå målet.</>:<b className="ok">Dagsmålet är nått! 🎉</b>}<br/>
                {todayRow?<>TB: <b style={{color:'var(--tx)'}}>{fmtMoney(tt)}</b> av {fmtMoney(g.daily_tb)} ({pct(tt,g.daily_tb)}%).</>:'TB visas när dagens resultat är registrerat.'}
              </p>
              <div className="row"style={{margin:0}}>{can&&todayRow&&<button className="b pri"onClick={quick}>+1 sälj</button>}{can&&<button className="b"onClick={()=>setTab('register')}>{todayRow?'Registrera':'Registrera dagens siffror'}</button>}<button className="b"onClick={()=>setTab('ai')}>✦ AI-coach</button></div>
            </div>
          </div>
          <div className="c mini">
            <div className="k">Sälj registrerade denna månad</div>
            <div className="v ok">{mo.length?<CountUp n={ms}/>:<span>–</span>}</div>
            <div className="s">{mo.length?`mål ${fmt(g.monthly_sales)} · ${pct(ms,g.monthly_sales)}% · ${registeredWorkdays}/${elapsedWorkdays} vardagar`:'Inga registreringar ännu'}</div>
            <div className="bar"><i style={{width:(mo.length?Math.min(100,pct(ms,g.monthly_sales)):0)+'%'}}/></div>
          </div>
          <div className="c mini">
            <div className="k">TB registrerat denna månad</div>
            <div className="v">{mo.length?`${fmt(Math.round(mt/1000))}k kr`:'–'}</div>
            <div className="s">{mo.length?`${fmtMoney(mt)} av ${fmtMoney(g.monthly_tb)} · ${registeredWorkdays}/${elapsedWorkdays} vardagar`:'Inga registreringar ännu'}</div>
            <div className="bar"><i style={{width:(mo.length?Math.min(100,pct(mt,g.monthly_tb)):0)+'%',background:'linear-gradient(90deg,var(--acc2),var(--g3))'}}/></div>
          </div>
          <div className="c quote-card">
            <div className="quote-text">"{quote.t}"</div>
            {quote.a&&<div className="quote-author">— {quote.a}</div>}
          </div>
          <div className="c wide">
            <div className="k">Senaste 14 registrerade dagar</div>
            <Chart a={rows.slice(-14)}goal={g.daily_sales}/>
          </div>
          <div className="c mid">
            <div className="k">Senaste aktivitet</div>
            <div className="feed">
              {activity.slice(0,4).map(a=><div key={a.id}className="item"><div className="ic">{a.event.startsWith('entry')?'📈':'🎯'}</div><div><div>{eventText(a)}</div><div className="s">{new Date(a.created_at).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'})}</div></div></div>)}
              {!activity.length&&<p className="s">Ingen aktivitet än.</p>}
            </div>
          </div>
        </div>

        <div className="c"style={{marginTop:16}}><div className="k">Senaste 8 veckorna · sälj mot veckomål</div><div className="wk-rings">{wks.map((w,i)=><div key={w.key}className="wk-ring"><Ring p={Math.min(100,Math.round(w.sales/Math.max(g.weekly_sales,1)*100))}sub={`${fmt(w.sales)}/${g.weekly_sales}`}size={110}stroke={10}delay={i*60}/><div className="wk-label">{w.key.slice(5)}</div></div>)}</div></div>

        <div className="g">
          <Stat i={0}k="TB idag"v={todayRow?fmtMoney(tt):'–'}s={todayRow?`${fmtMoney(g.daily_tb)} mål · ${pct(tt,g.daily_tb)}%`:'Ej registrerat'}bar={todayRow?pct(tt,g.daily_tb):undefined}icon="💰"/>
          <Stat i={1}k="Veckans sälj"v={currentWeekRows.length&&weekW?fmt(weekW.sales):'–'}s={currentWeekRows.length?`${fmt(g.weekly_sales)} mål · ${weekP}% · ${currentWeekRows.length} registrerade dagar`:'Ingen registrering hittills'}bar={currentWeekRows.length?weekP:undefined}icon="📆"trend={weekTrend}/>
          <Stat i={2}k="Veckans TB"v={currentWeekRows.length&&weekW?fmtMoney(weekW.tb):'–'}s={currentWeekRows.length?`${fmtMoney(g.weekly_tb)} mål · ${pct(weekW?.tb||0,g.weekly_tb)}% · ${currentWeekRows.length} registrerade dagar`:'Ingen registrering hittills'}bar={currentWeekRows.length?pct(weekW?.tb||0,g.weekly_tb):undefined}icon="💵"/>
          <Stat i={3}k="Snitt/dag"v={mo.length?f1(ms/mo.length):'–'}s={`${mo.length} dagar`}icon="📅"/>
          <Stat i={4}k="Snitt TB/sälj"v={ms?fmtMoney(mt/ms):'–'}s="denna månad"icon="🏷"/>
          <Stat i={5}k="Streak 🔥"v={streak+' dgr'}s={`bästa ${bStreak}`}c={streak?'ok':''}icon="🔥"/>
          <Stat i={6}k="Mot plan"v={paceReliable?(ahead>=0?'+':'')+f1(ahead):'–'}s={paceReliable?(ahead>=0?'Före plan':'Efter plan'):`Underlag ${registeredWorkdays}/${elapsedWorkdays} vardagar`}c={paceReliable?(ahead>=0?'ok':'bad'):''}icon="📊"/>
          <Stat i={7}k="Prognos"v={proj!=null?fmt(Math.round(proj))+' sälj':'–'}s={proj!=null?proj>=g.monthly_sales?'Når målet':'Under målet':`Underlag ${registeredWorkdays}/${elapsedWorkdays} vardagar`}c={proj!=null?proj>=g.monthly_sales?'ok':'bad':''}icon="🔮"/>
          <Stat i={8}k="Krävs/dag"v={!paceReliable?'–':remainingWorkdays>0?f1(monthlySalesGap/remainingWorkdays):monthlySalesGap?'–':'0'}s={!paceReliable?`Underlag ${registeredWorkdays}/${elapsedWorkdays} vardagar`:remainingWorkdays>0?`${remainingWorkdays} arbetsdagar kvar`:monthlySalesGap?`${fmt(monthlySalesGap)} sälj kvar · arbetsdagarna slut`:'Månadsmålet nått'}icon="⏳"/>
          <Stat i={9}k="Sälj/timme"v={sum(hh,'hours')?f1(sum(hh,'sales')/sum(hh,'hours')):'–'}s="när timmar finns"icon="⏱"/>
          {pbd&&<Stat i={10}k="Rekorddag (sälj)"v={pbd.sales}s={pbd.entry_date}icon="🏆"/>}
          {pbt&&<Stat i={11}k="Rekorddag (TB)"v={fmtMoney(pbt.tb_sek)}s={pbt.entry_date}icon="💎"/>}
          <Stat i={12}k="Upplåsta märken"v={unlockedArr.length+'/'+ACHIEVEMENTS.length}s="tryck på 🏅 för att se"icon="🏅"/>
        </div>

        {cmpM&&<div className="c"><div className="k">Månad hittills jämfört med samma period förra månaden</div><div className="s">Registrerade dagar: {cmpM.cur.days} denna period · {cmpM.prev.days} förra perioden</div><div className="row"style={{marginTop:10,marginBottom:0,gap:30}}>
          <div><div className="s">Förra perioden: {fmt(cmpM.prev.sales)} sälj</div><div style={{fontSize:22,fontWeight:800}}>{fmt(cmpM.cur.sales)} <span className={'stat-change '+(cmpM.salesDiff>=0?'up':'down')}>{cmpM.salesDiff>=0?'▲':'▼'} {Math.abs(cmpM.salesDiff)} {cmpM.salesPct===null?'(procent saknas)':`(${cmpM.salesPct>=0?'+':''}${cmpM.salesPct}%)`}</span></div></div>
          <div style={{borderLeft:'1px solid var(--bd)',paddingLeft:30}}><div className="s">TB förra perioden: {fmtMoney(cmpM.prev.tb)}</div><div style={{fontSize:22,fontWeight:800}}>{fmtMoney(cmpM.cur.tb)} <span className={'stat-change '+(cmpM.tbDiff>=0?'up':'down')}>{cmpM.tbDiff>=0?'▲':'▼'} {fmtMoney(Math.abs(cmpM.tbDiff))} {cmpM.tbPct===null?'(procent saknas)':`(${cmpM.tbPct>=0?'+':''}${cmpM.tbPct}%)`}</span></div></div>
        </div></div>}

        <div className="c"style={{marginTop:16}}><div className="k">Månadskalender</div><Heat rows={rows}goal={g.daily_sales}/></div>
        </>}
      </>}

      {tab==='register'&&<>
        <h2>{er?'Ändra':'Registrera'} resultat</h2>
        <p className="sub">{er?'Uppdatera':'Samma datum ersätter befintlig registrering.'}</p>
        {can?<div className="c"style={{maxWidth:600}}>
          <form key={edit??'new'}onSubmit={save}>
            <label>Datum<input name="d"type="date"max={today()}required defaultValue={er?.entry_date||today()}/></label>
            <div className="two">
              <label>Antal sälj<input name="s"type="number"min="0"step="1"inputMode="numeric"required defaultValue={er?.sales}/></label>
              <label>Totalt TB (kr)<input name="t"type="number"min="0"step="1"inputMode="numeric"required defaultValue={er?.tb_sek}/></label>
            </div>
            <label>Arbetade timmar (valfritt)<input name="h"type="number"min="0"max="24"step="0.25"inputMode="decimal"defaultValue={er?.hours??''}/></label>
            <label>Dagens humör
              <div className="mood">{(['fire','great','ok','tired','bad']as Mood[]).map(m=><button key={m}type="button"className={moodSel===m?'on':''}onClick={()=>setMoodSel(moodSel===m?null:m)}title={MOOD_LABEL[m]}>{MOOD_EMOJI[m]}</button>)}</div>
            </label>
            <label>Dagens rating (1-5)<input name="rating"type="number"min="1"max="5"step="1"defaultValue={er?.rating??''}/></label>
            <label>Taggar (kommaseparerade)<input name="tags"type="text"placeholder="t.ex. företag,privat,ny-kund"defaultValue={er?.tags?.join(', ')??''}/></label>
            <label>Anteckning<textarea name="n"rows={3}defaultValue={er?.note||''}placeholder="T.ex. bra flow på eftermiddagen…"/></label>
            <div className="row"style={{margin:0}}>
              <button className="b pri">{er?'Uppdatera':'Spara'}</button>{edit&&<button type="button"className="b"onClick={()=>setEdit(null)}>Avbryt</button>}
            </div>
          </form>
        </div>:<p className="s">Bara säljaren kan registrera.</p>}
      </>}

      {tab==='history'&&<>
        <h2>Historik</h2>
        <p className="sub">{rows.length} dagar · <span className="num">{fmt(ms)}</span> sälj totalt · {fmtMoney(mt)} TB</p>
        <div className="row"><button className="b"onClick={csv}disabled={!rows.length}>Exportera CSV</button></div>
        <div className="c sc"><table>
          <thead><tr><th>Datum</th><th>Sälj</th><th>TB</th><th>Tim</th><th>TB/sälj</th><th>Humör</th><th>Taggar</th><th>Anteckning</th><th style={{textAlign:'right'}}>Åtgärd</th></tr></thead>
          <tbody>
            {[...rows].reverse().map(r=><tr key={r.id}>
              <td className="num">{r.entry_date}</td>
              <td><b>{r.sales}</b>{r.sales>=g.daily_sales&&<span className="tag">mål</span>}{r.sales>=15&&<span className="tag w">💎</span>}{r.sales>=20&&<span className="tag m">⚡</span>}</td>
              <td className="num">{fmtMoney(r.tb_sek)}</td>
              <td className="num">{r.hours??'–'}</td>
              <td className="num">{r.sales?fmtMoney(r.tb_sek/r.sales):'–'}</td>
              <td>{r.mood?MOOD_EMOJI[r.mood]:'–'}</td>
              <td>{(r.tags||[]).slice(0,3).map(t=><span key={t}className="tag"style={{marginLeft:2}}>{t}</span>)}</td>
              <td className="text-truncate"style={{maxWidth:200}}title={r.note||''}>{r.note||<span className="muted">–</span>}</td>
              <td style={{whiteSpace:'nowrap',textAlign:'right'}}>{can&&<><button className="b sm"onClick={()=>{setEdit(r.id);setMoodSel(r.mood);setTab('register')}}>Ändra</button> <button className="b sm r"onClick={()=>del(r.id)}>Ta bort</button></>}</td>
            </tr>)}
            {!rows.length&&<tr><td colSpan={9}className="s"style={{textAlign:'center',padding:24}}>Inga registreringar än</td></tr>}
          </tbody>
        </table></div>
        <MonthCal rows={rows}/>
        <AuditPanel sig={rows.length+':'+ms+':'+mt}/>
      </>}

      {tab==='stats'&&<>
        <h2>Statistik</h2>
        <p className="sub">Dagar utan registrering räknas inte som noll.</p>
        <div className="row"><select value={rg}onChange={e=>setRg(e.target.value as any)}>{['Idag','Denna vecka','Denna månad','Föregående månad','Detta år','Allt'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="g">
          <Stat k="Sälj"v={fmt(sum(A,'sales'))}icon="🎯"/>
          <Stat k="TB"v={fmtMoney(sum(A,'tb_sek'))}icon="💰"/>
          <Stat k="TB/sälj"v={sum(A,'sales')?fmtMoney(sum(A,'tb_sek')/sum(A,'sales')):'–'}icon="🏷"/>
          <Stat k="Sälj/dag"v={A.length?f1(sum(A,'sales')/A.length):'–'}s={`${A.length} dagar`}icon="📅"/>
          <Stat k="Sälj/timme"v={sum(hh,'hours')?f1(sum(hh,'sales')/sum(hh,'hours')):'–'}s="när timmar finns"icon="⏱"/>
          <Stat k="Snitt tim/dag"v={hh.length?f1(sum(hh,'hours')/hh.length):'–'}icon="⌛"/>
          <Stat k="Bästa dag"v={best?best.sales:'–'}s={best?.entry_date}icon="🏆"/>
          <Stat k="Mot fg period"v={B.length?((dl>=0?'+':'')+dl):'–'}s="sälj"c={dl>=0?'ok':'bad'}icon="📊"/>
        </div>
        <div className="two">
          <div className="c"><div className="k">Humör & rating · {rg}</div><div className="row-tight"style={{marginTop:12}}><b style={{fontSize:23}}>{avgRating?avgRating.toFixed(1)+' / 5':'–'}</b><span className="s">snittrating{rated.length?` (${rated.length} dagar)`:''}</span></div>{moodStats.map(m=><div key={m.key}className="mood-stat"><span>{m.emoji} {MOOD_LABEL[m.key]}</span><div className="mood-track"><i style={{width:(m.count/maxMood*100)+'%'}}/></div><b>{m.count}</b></div>)}</div>
          <div className="c"><div className="k">Taggar med flest sälj · {rg}</div>{tagStats.length?tagStats.map(x=><div key={x.tag}className="tag-stat"><span className="tag">{x.tag}</span><span className="s">{x.days} dgr</span><b>{fmt(x.sales)} sälj</b></div>):<p className="s"style={{marginTop:12}}>Lägg till taggar när du registrerar dagar för att se vad som driver resultaten.</p>}</div>
        </div>
        <div className="c"><div className="k">Dagliga sälj ({rg})</div><Chart a={A.slice(-21)}goal={g.daily_sales}/></div>
        <div className="c"style={{marginTop:16}}><div className="k">Snitt per veckodag</div><div className="ch">{wdAvg.map(x=><div key={x.n}><em>{x.v?f1(x.v):'–'}</em><b style={{height:(x.v/wmax)*115}}/>{x.n}</div>)}</div></div>
        <MonthSummary rows={rows}g={g}/>
        <Compare rows={rows}/>
      </>}

      {tab==='year'&&<>
        <h2>Årsvy</h2>
        <p className="sub">Överblick över senaste 12 månaderna + 365 dagars värmekarta.</p>
        <div className="g">
          <Stat k="Årets sälj"v={fmt(sum(rows.filter(r=>r.entry_date.startsWith(String(new Date().getFullYear()))),'sales'))}icon="📅"/>
          <Stat k="Årets TB"v={fmtMoney(sum(rows.filter(r=>r.entry_date.startsWith(String(new Date().getFullYear()))),'tb_sek'))}icon="💰"/>
          <Stat k="Längsta streak"v={bStreak+' dgr'}icon="🔥"/>
          <Stat k="Registrerade dagar"v={rows.length}icon="✅"/>
        </div>
        <div className="c"><div className="k">Månadsvis (senaste 12)</div><BarMonths months={months}/></div>
        <div className="c"style={{marginTop:16}}><div className="k">365-dagars översikt</div><div style={{marginTop:14,overflowX:'auto'}}><YearHeat rows={rows}goal={g.daily_sales}/></div></div>
      </>}

      {tab==='goals'&&<>
        <div className="goal-page-title"><div><div className="goal-eyebrow">PLAN · UPPFÖLJNING · RYTM</div><h2>Mål</h2><p className="sub">Dagsmål, veckomål och månadsmål samlade på ett ställe.</p></div><span className="goal-page-mark"aria-hidden="true">◎</span></div>
        {!can&&<><GoalSnapshot role="manager"goal={g}todayRow={todayRow}/><div className="goal-readonly-note"role="note"><span>◈</span><div><strong>Affe har läsbehörighet</strong><small>Målen kan ses här men ändras endast av Stille.</small></div></div></>}
        {can?<section className="goal-editor c"aria-labelledby="goal-editor-title">
          <div className="goal-editor-intro"><span className="goal-editor-icon"aria-hidden="true">◎</span><div><div className="goal-eyebrow">STÄLL IN DIN PLAN</div><h3 id="goal-editor-title">Sätt ett tydligt riktmärke.</h3><p>Välj mål per period. De påverkar översikten och coachningen när du sparar.</p></div></div>
          <form className="goal-form"key={JSON.stringify(g)}onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);saveGoals({daily_sales:Number(f.get('a')),daily_tb:Number(f.get('b')),weekly_sales:Number(f.get('e')),weekly_tb:Number(f.get('f')),monthly_sales:Number(f.get('c')),monthly_tb:Number(f.get('d'))})}}>
            <div className="goal-editor-grid">
              <section className="goal-period daily-period"><div className="goal-period-head"><span className="goal-index">01</span><div><h4>Dagsmål</h4><p>Fokus för en arbetsdag.</p></div><span className="goal-period-tag">VARJE DAG</span></div><div className="goal-field-grid">
                <label className="goal-field"><span>Sälj <small>Antal avslut per dag</small></span><span className="goal-input-wrap"><input name="a"type="number"min="0"step="1"inputMode="numeric"defaultValue={g.daily_sales}aria-label="Dagsmål i sälj"/><em>sälj</em></span></label>
                <label className="goal-field"><span>Täckningsbidrag <small>Ditt TB-riktmärke</small></span><span className="goal-input-wrap"><input name="b"type="number"min="0"step="any"inputMode="decimal"defaultValue={g.daily_tb}aria-label="Dagsmål i täckningsbidrag kronor"/><em>kr</em></span></label>
              </div></section>
              <section className="goal-period week-period"><div className="goal-period-head"><span className="goal-index">02</span><div><h4>Veckomål</h4><p>En jämn takt över veckan.</p></div><span className="goal-period-tag">VECKA</span></div><div className="goal-field-grid">
                <label className="goal-field"><span>Sälj <small>Totalt för veckan</small></span><span className="goal-input-wrap"><input name="e"type="number"min="0"step="1"inputMode="numeric"defaultValue={g.weekly_sales}aria-label="Veckomål i sälj"/><em>sälj</em></span></label>
                <label className="goal-field"><span>Täckningsbidrag <small>Totalt för veckan</small></span><span className="goal-input-wrap"><input name="f"type="number"min="0"step="any"inputMode="decimal"defaultValue={g.weekly_tb}aria-label="Veckomål i täckningsbidrag kronor"/><em>kr</em></span></label>
              </div></section>
              <section className="goal-period month-period"><div className="goal-period-head"><span className="goal-index">03</span><div><h4>Månadsmål</h4><p>Riktningen för hela månaden.</p></div><span className="goal-period-tag">MÅNAD</span></div><div className="goal-field-grid">
                <label className="goal-field"><span>Sälj <small>Totalt för månaden</small></span><span className="goal-input-wrap"><input name="c"type="number"min="0"step="1"inputMode="numeric"defaultValue={g.monthly_sales}aria-label="Månadsmål i sälj"/><em>sälj</em></span></label>
                <label className="goal-field"><span>Täckningsbidrag <small>Totalt för månaden</small></span><span className="goal-input-wrap"><input name="d"type="number"min="0"step="any"inputMode="decimal"defaultValue={g.monthly_tb}aria-label="Månadsmål i täckningsbidrag kronor"/><em>kr</em></span></label>
              </div></section>
            </div>
            <div className="goal-save-row"><span>Ändringarna gäller först när du sparar.</span><button type="submit"className="b pri goal-save">Spara mål <span aria-hidden="true">↗</span></button></div>
          </form>
        </section>:null}
        <div className="g">
          <Stat k="Veckans sälj"v={currentWeekRows.length?fmt(weekW?.sales||0):'–'}s={currentWeekRows.length?`${fmt(g.weekly_sales)} mål · ${weekP}% · ${currentWeekRows.length} registrerade dagar`:'Ingen registrering hittills'}bar={currentWeekRows.length?weekP:undefined}icon="📆"/>
          <Stat k="Veckans TB"v={currentWeekRows.length?fmtMoney(weekW?.tb||0):'–'}s={currentWeekRows.length?`${fmtMoney(g.weekly_tb)} mål · ${pct(weekW?.tb||0,g.weekly_tb)}% · ${currentWeekRows.length} registrerade dagar`:'Ingen registrering hittills'}bar={currentWeekRows.length?pct(weekW?.tb||0,g.weekly_tb):undefined}icon="💵"/>
          <Stat k="Sälj kvar (månad)"v={paceReliable?fmt(monthlySalesGap):'–'}s={!paceReliable?`Underlag ${registeredWorkdays}/${elapsedWorkdays} vardagar`:remainingWorkdays>0?`${f1(monthlySalesGap/remainingWorkdays)} per arbetsdag`:monthlySalesGap?'Arbetsdagarna slut':'Månadsmålet nått'}icon="⏳"/>
          <Stat k="TB kvar (månad)"v={paceReliable?fmtMoney(monthlyTbGap):'–'}s={!paceReliable?`Underlag ${registeredWorkdays}/${elapsedWorkdays} vardagar`:remainingWorkdays>0?fmtMoney(monthlyTbGap/remainingWorkdays)+'/arbetsdag':monthlyTbGap?'Arbetsdagarna slut':'Månadsmålet nått'}icon="⌛"/>
        </div>
      </>}

      {tab==='comments'&&<>
        <h2>Kommentarer</h2><p className="sub">Mellan Stille och Affe. Reagera med emojis eller pinna viktiga meddelanden.</p>
        <div className="c"style={{maxWidth:680,marginBottom:14}}><form onSubmit={postC}>
          <textarea rows={3}maxLength={2000}placeholder={can?'Skriv till Affe…':'Skriv till Stille…'}value={cText}onChange={e=>setCText(e.target.value)}/>
          <div className="row"style={{margin:0}}><input type="date"style={{width:170}}value={cDate}onChange={e=>setCDate(e.target.value)}/><button className="b pri">Skicka</button></div>
        </form></div>
        <div className="chat"style={{maxWidth:680}}>{sortedCm.map(c=><div key={c.id}className={'msg '+(c.author===role?'u':'a')+(c.pinned?' pinned':'')}style={{position:'relative'}}>{c.pinned&&<span className="pin-badge">📌</span>}<div className="s">{c.author==='seller'?'Stille':'Affe'}{c.entry_date?' · om '+c.entry_date:''} · {new Date(c.created_at).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'})}</div>{c.body}{c.reaction&&<div style={{marginTop:6,fontSize:22}}>{c.reaction}</div>}<div className="react-bar">{['👍','❤️','🔥','🎉','😂','😎','💪'].map(r=><button key={r}type="button"className={c.reaction===r?'on':''}onClick={()=>react(c.id,r===c.reaction?'':r)}>{r}</button>)}<button type="button"className="b sm ghost"onClick={()=>pinComment(c)}title={c.pinned?'Ta bort pin':'Pinna kommentar'}>{c.pinned?'📌 Pinned':'📌'}</button></div></div>)}{!cm.length&&<p className="s">Inga kommentarer än.</p>}</div>
      </>}

      {tab==='ai'&&<>
        <h2>AI-coach</h2><p className="sub">Föreslår ändringar – du godkänner alltid först. Tryck ⌘K för snabbkommandon var som helst.</p>
        {!ks.configured&&<div className="c"style={{maxWidth:600,marginBottom:14}}><div className="k">Aktivera AI</div><p className="s"style={{marginTop:6}}>Klistra in Anthropic-nyckeln (sparas bara på servern).</p>{can?<form onSubmit={e=>{e.preventDefault();keyCall('POST',keyIn)}}><input type="password"placeholder="sk-ant-…"value={keyIn}onChange={e=>setKeyIn(e.target.value)}autoComplete="off"/><button className="b pri"style={{marginTop:8}}>Spara</button></form>:<p className="s">Stille lägger in nyckeln.</p>}</div>}
        {ks.configured&&<div className="row"><span className="tag">✓ AI aktiv ({ks.source==='env'?'miljövariabel':'sparad nyckel'})</span>{can&&ks.source==='db'&&<button className="b ghost"onClick={()=>{if(confirm('Ta bort?'))keyCall('DELETE')}}>Ta bort nyckel</button>}</div>}
        {ks.configured&&<>
          <div className="row">{(can?['Hur ligger jag till idag?','Föreslå veckans mål','Registrera idag: 5 sälj & 3000 kr','Veckosammanfattning','Peppa mig']:['Hur ska jag coacha Stille idag?','Vad ska jag ta upp med Stille?','Hur går det för Stille?','Veckosammanfattning','Skriv ett peppande meddelande till Stille']).map(x=><button key={x}className="b"disabled={busy}onClick={()=>ask(x)}>{x}</button>)}</div>
          <div className="chat">{msgs.map((m,i)=><div key={i}className={`msg ${m.r} ${m.e?'e':''}`}>{m.t}{m.props?.map(p=><div key={p.id}className="sug">{(p.tool==='registrera_dag'?`Registrera ${p.input.entry_date}: ${p.input.sales} sälj, ${fmtMoney(p.input.tb_sek)}${p.input.hours?', '+p.input.hours+' h':''}`:p.tool==='satt_mal'?'Ändra mål: '+Object.entries(p.input).map(([k,v])=>`${({a:'dagsmål sälj',b:'dagsmål TB',c:'månadsmål sälj',d:'månadsmål TB',e:'veckomål sälj',f:'veckomål TB'}as any)[k]||k} ${fmt(Number(v))}`).join(', '):p.tool==='skriv_kommentar'?`Skicka kommentar: "${p.input.body}"`:JSON.stringify(p.input))}<br/>{p.done?<span className="tag">✓ Gjort</span>:<button className="b pri"style={{marginTop:8}}onClick={()=>apply(p)}>Godkänn</button>}</div>)}</div>)}{busy&&<div className="msg a s">Tänker<span className="dots">…</span></div>}</div>
          <form onSubmit={e=>{e.preventDefault();if(q.trim()){ask(q.trim());setQ('')}}}style={{maxWidth:680,display:'grid',gridTemplateColumns:'1fr auto',gap:8}}><input value={q}maxLength={500}onChange={e=>setQ(e.target.value)}placeholder="Fråga eller be AI:n göra något…"/><button className="b pri"disabled={busy||!q.trim()}>Skicka</button></form>
        </>}
      </>}


      {tab==='settings'&&<>
        <h2>Inställningar</h2><p className="sub">Anpassa utseende och säkerhet.</p>
        {can&&<div className="c coach-setting"><div><div className="k">Daglig AI-coach</div><p className="s">När din månadstakt ligger efter får du en kort, personlig nudge högst en gång per dag. Ingen AI-anropas när du ligger i fas.</p></div><button type="button"role="switch"aria-label="Daglig AI-coach"aria-checked={autoCoach}className={'switch '+(autoCoach?'on':'')}onClick={()=>setAutoCoach(v=>!v)}><span/></button></div>}
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Tema</div><div className="seg-theme"role="radiogroup"style={{marginTop:12}}>{THEMES.map(t=><button key={t.id}type="button"className={theme===t.id?'on':''}onClick={()=>setTheme(t.id)}aria-pressed={theme===t.id}title={t.label}><span style={{display:'block',width:'100%',height:'100%',borderRadius:10,background:t.grad}}>{t.emoji}</span></button>)}</div><p className="s">Valet sparas i din webbläsare.</p></div>
        <section className="c depth-setting"aria-labelledby="depth-title"><div className="depth-setting-head"><span className="depth-setting-icon"aria-hidden="true">◇</span><div><div className="k"id="depth-title">3D &amp; rörelse</div><p className="s">Välj hur levande dashboarden ska kännas.</p></div></div><div className="depth-choice-list"role="group"aria-label="Visuellt dashboardläge"><button type="button"className={'depth-choice'+(depthMode==='studio'?' on':'')}aria-pressed={depthMode==='studio'}onClick={()=>setDepthMode('studio')}><span className="depth-choice-glyph"aria-hidden="true">✧</span><span><strong>Studio</strong><small>Mer 3D och subtil rörelse</small></span><span className="depth-choice-check"aria-hidden="true">✓</span></button><button type="button"className={'depth-choice'+(depthMode==='quiet'?' on':'')}aria-pressed={depthMode==='quiet'}onClick={()=>setDepthMode('quiet')}><span className="depth-choice-glyph"aria-hidden="true">◌</span><span><strong>Lugn</strong><small>Statiskt djup, färre övergångar</small></span><span className="depth-choice-check"aria-hidden="true">✓</span></button></div><p className="depth-setting-note">Sparas i den här webbläsaren. Operativsystemets inställning för reducerad rörelse gäller alltid först.</p></section>
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Ljud</div><div className="row"style={{margin:0}}><button className="b"onClick={()=>setSound(s=>!s)}>{sound?'🔊 Ljud på':'🔇 Ljud av'}</button><span className="s">Spelar ett litet chime vid mål och stora händelser.</span></div></div>
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Vibration</div><div className="row"style={{margin:0}}><button className="b"onClick={()=>setHaptics(v=>!v)}>{haptics?'📳 Vibration på':'📴 Vibration av'}</button><span className="s">Kräver en mobil eller enhet med vibrationsstöd.</span></div></div>
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Byt lösenord ({can?'Stille':'Affe'})</div><p className="s"style={{marginTop:6}}>Kräver nuvarande lösenord. Gäller för alla enheter.</p><form onSubmit={changePw}style={{marginTop:10}}><label>Nuvarande<input type="password"value={curPw}onChange={e=>setCurPw(e.target.value)}required/></label><div className="two"><label>Nytt<input type="password"value={newPw}onChange={e=>setNewPw(e.target.value)}required minLength={4}/></label><label>Bekräfta<input type="password"value={newPw2}onChange={e=>setNewPw2(e.target.value)}required minLength={4}/></label></div><div className="row"style={{margin:0}}><button className="b pri">Byt lösenord</button>{pwMsg&&<span className={'s '+(pwMsg.ok?'ok':'bad')}style={{alignSelf:'center'}}>{pwMsg.t}</span>}</div></form></div>
        <div className="c"style={{maxWidth:580}}><div className="k">Om & genvägar</div><div className="s"style={{marginTop:8,lineHeight:1.9}}>Säljdashboard v7 · Next.js 15 · Supabase · HMAC-sessioner · Rollanpassad chefsöversikt, daglig AI-coach, måltempo, historik och statistik.<br/><b>⌘/Ctrl + K</b> – kommandopalett<br/><b>Rätta dagens siffror</b> i rutan på översikten för snabb ökning.</div><div className="row"style={{marginTop:10,marginBottom:0}}><button className="b ghost"onClick={()=>window.open('/api/health','_blank')}>Hälsokontroll</button><button className="b danger"onClick={doLogout}>Logga ut</button></div></div>
      </>}

      <NetStatus onReconnect={load}/><ScrollPill/>
      <button className="b logout-fix"onClick={doLogout}aria-label="Logga ut">⎋ Logga ut</button>
      {toast&&<div className="toast"role="status">{toast}</div>}
      {cmd&&<div className="cmd-pal"onClick={()=>setCmd(false)}><div className="cmd-card"onClick={e=>e.stopPropagation()}><input autoFocus className="cmd-input"placeholder="Gå någonstans eller gör en åtgärd…"value={cmdQ}onChange={e=>{setCmdQ(e.target.value);setCmdI(0)}}onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setCmdI(i=>Math.min(i+1,cmds.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();setCmdI(i=>Math.max(i-1,0))}else if(e.key==='Enter'){e.preventDefault();if(cmds[cmdI])cmdAction(cmds[cmdI].fn)}}}/><div className="cmd-list">{cmds.map((c,i)=><div key={c.label}className={'cmd-item '+(i===cmdI?'on':'')}onMouseEnter={()=>setCmdI(i)}onClick={()=>cmdAction(c.fn)}><span>{c.icon}</span><span>{c.label}</span>{!c.k&&<span className="cmd-kbd">↵</span>}</div>)}
        {!cmds.length&&<p className="s"style={{padding:16,textAlign:'center'}}>Inga träffar</p>}
        <div className="s"style={{padding:'8px 14px',borderTop:'1px solid var(--bd)',fontSize:11}}>⌘K för att öppna · ↑↓ navigera · ↵ kör · esc stäng</div>
      </div></div></div>}
    </main>
  </div>;
}

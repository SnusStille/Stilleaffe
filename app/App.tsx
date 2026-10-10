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
  {id:'achievements',label:'Märken',ic:'🏅'},{id:'settings',label:'Inställningar',ic:'⚙'}];

type Prop={id:string;tool:string;input:any;done?:boolean};
type Msg={r:'u'|'a';t:string;e?:boolean;props?:Prop[]};
type CItem={id:number;author:string;body:string;entry_date:string|null;created_at:string;reaction?:string;pinned?:boolean};
const THEMES=[{id:'default',label:'Sälj',emoji:'🟢',grad:'linear-gradient(135deg,#4ade80,#16a34a)'},{id:'midnight',label:'Midnatt',emoji:'🌌',grad:'linear-gradient(135deg,#60a5fa,#7c3aed)'},{id:'sunset',label:'Solnedgång',emoji:'🌅',grad:'linear-gradient(135deg,#fb923c,#f43f5e)'},{id:'forest',label:'Skog',emoji:'🌿',grad:'linear-gradient(135deg,#84cc16,#10b981)'},{id:'neon',label:'Neon',emoji:'💜',grad:'linear-gradient(135deg,#e879f9,#22d3ee)'}];
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
function CountUp({n,dur=900,decimals=0}:{n:number;dur?:number;decimals?:number}){const[v,setV]=useState(0);useEffect(()=>{let raf=0;const t0=performance.now();const step=(t:number)=>{const p=Math.min((t-t0)/dur,1);const eased=1-Math.pow(1-p,3);setV(n*eased);if(p<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[n,dur]);return<>{decimals?Math.round(v*Math.pow(10,decimals))/Math.pow(10,decimals):Math.round(v)}</>}
function Ring({p,sub,size=170,stroke=14,delay=0}:{p:number;sub?:string;size?:number;stroke?:number;delay?:number}){const r=(size-20)/2,C=2*Math.PI*r;const[lp,setLp]=useState(0);useEffect(()=>{const id=setTimeout(()=>setLp(Math.max(0,Math.min(100,p))),60+delay);return()=>clearTimeout(id)},[p,delay]);return<div className="ring"style={{width:size,height:size}}><svg viewBox={`0 0 ${size} ${size}`}><defs><linearGradient id={`rg${size}${delay}`}x1="0"x2="1"><stop offset="0"stopColor="var(--acc1)"/><stop offset="1"stopColor="var(--g2)"/></linearGradient></defs><circle cx={size/2}cy={size/2}r={r}fill="none"stroke="rgba(255,255,255,.08)"strokeWidth={stroke}/><circle cx={size/2}cy={size/2}r={r}fill="none"stroke={`url(#rg${size}${delay})`}strokeWidth={stroke}strokeLinecap="round"strokeDasharray={C}strokeDashoffset={C*(1-lp/100)}style={{transition:'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)'}}/></svg><div className="t"style={{fontSize:size<140?'x-small':'medium'}}><b>{Math.round(lp)}%</b>{sub&&<span>{sub}</span>}</div></div>}
function Stat({k,v,s,c,bar,icon,i,trend}:{k:string;v:any;s?:string;c?:string;bar?:number;icon?:string;i?:number;trend?:number}){return<div className="c"style={{'--i':i}as any}>{icon&&<div className="kpi-icon">{icon}</div>}<div className="k">{k}</div><div className={'v num '+(c||'')}>{v}{typeof trend==='number'&&trend!==0&&<span className={'trend-'+(trend>0?'up':'down')}>{trend>0?'▲':'▼'}{Math.abs(trend)}%</span>}</div><div className="s">{s}</div>{bar!=null&&<div className="bar"><i style={{width:Math.max(0,Math.min(100,bar))+'%'}}/></div>}</div>}
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


const CHEF_LINES=['Affe, du har full koll på Stilles siffror. Men låt oss vara ärliga: du övervakar huvudpersonen. Du är inte huvudpersonen. 😎','Dagens prognos: Stille fortsätter leverera. Affe fortsätter analysera.','Chefen läser. Säljaren säljer. Världen är i balans. ⚖️','Rapport från kontrollrummet: allt under kontroll, mest för att Stille har det.','Affe: 100% insyn, 0% rätt att trycka på knapparna. Så funkar demokrati. 🗳️'];
function ChefBox(){const[i,setI]=useState(0);const[k,setK]=useState(0);return<div className="c chef"><div className="chef-h">Chefens kontrollpanel 👔</div><p key={k} className="chef-t">{CHEF_LINES[i]}</p><div className="row"><button className="b ghost"onClick={()=>{setI(v=>(v+1)%CHEF_LINES.length);setK(v=>v+1)}}>Ny kommentar 🎲</button><span className="tag">Skrivskyddad vy</span></div></div>}
function AuditPanel({sig}:{sig:string}){const[items,setItems]=useState<any[]|null>(null);const[note,setNote]=useState('');useEffect(()=>{let on=true;fetch('/api/audit',{credentials:'same-origin'}).then(x=>x.json()).then(j=>{if(!on)return;setItems(Array.isArray(j.items)?j.items:[]);setNote(j.missing?'Historiken är inte aktiverad än – kör supabase/migration-v8.sql i Supabase SQL Editor.':'')}).catch(()=>{if(on){setItems([]);setNote('Kunde inte hämta historiken.')}});return()=>{on=false}},[sig]);
  const lab:Record<string,string>={create:'Ny',update:'Ändrad',delete:'Borttagen'};
  const d=(v:any)=>v?`${v.sales} sälj · ${Math.round(Number(v.tb_sek)).toLocaleString('sv-SE')} kr`:'–';
  return<div className="c sc audit"><h3 style={{marginTop:0}}>Ändringshistorik</h3>{note&&<p className="sub">{note}</p>}{items===null?<p className="sub">Laddar…</p>:!items.length&&!note?<p className="sub">Inga ändringar loggade ännu.</p>:items.length>0&&<table><thead><tr><th>När</th><th>Dag</th><th>Händelse</th><th>Före</th><th>Efter</th></tr></thead><tbody>{items.map((a:any)=><tr key={a.id}><td className="num">{new Date(a.created_at).toLocaleString('sv-SE',{dateStyle:'short',timeStyle:'short'})}</td><td className="num">{a.entry_date}</td><td><span className={'tag '+(a.action==='delete'?'m':'')}>{lab[a.action]||a.action}</span></td><td className="num">{d(a.before)}</td><td className="num">{d(a.after)}</td></tr>)}</tbody></table>}</div>}


function Ticker({items}:{items:string[]}){const row=items.map((t,i)=><span key={i}className="tk-i">{t}<em>◆</em></span>);return<div className="ticker"aria-hidden="true"><div className="tk-track">{row}{row}{row}{row}</div></div>}
const pad2=(n:number)=>String(n).padStart(2,'0');
const isoD=(d:Date)=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const sv=(n:number)=>Math.round(n).toLocaleString('sv-SE');
function ManagerReport({rows}:{rows:Row[]}){
  const now=new Date(),dow=(now.getDay()+6)%7;
  const mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow),pm=new Date(mon),nm=new Date(mon);
  pm.setDate(mon.getDate()-7);nm.setDate(mon.getDate()+7);
  const a=isoD(mon),b=isoD(pm),c=isoD(nm);
  const cur=rows.filter(r=>r.entry_date>=a&&r.entry_date<c),prev=rows.filter(r=>r.entry_date>=b&&r.entry_date<a);
  const S=(x:Row[])=>x.reduce((t,r)=>t+Number(r.sales||0),0),T=(x:Row[])=>x.reduce((t,r)=>t+Number(r.tb_sek||0),0);
  const cs=S(cur),ps=S(prev),diff=ps>0?Math.round((cs-ps)/ps*100):null;
  const from14=isoD(new Date(now.getFullYear(),now.getMonth(),now.getDate()-13));
  const l14=rows.filter(r=>r.entry_date>=from14),days=new Set(l14.map(r=>r.entry_date)).size,avg=days?S(l14)/days:0;
  const best=[...rows].sort((x,y)=>Number(y.sales)-Number(x.sales))[0];
  const verdict=diff===null?'Ingen jämförelse än – förra veckan saknar siffror.':diff>=10?'Starkare vecka än förra. Håll i det.':diff<=-10?'Svagare vecka än förra – värt en uppföljning.':'Stabilt tempo jämfört med förra veckan.';
  const tone=diff===null?'':diff>=0?'up':'down';
  return<div className="mr"><div className="c mr-hero"><div className="k">Chefsrapport · denna vecka</div><div className="mr-big num">{cs} <small>sälj</small>{diff!==null&&<span className={'stat-change '+tone}>{diff>=0?'▲':'▼'} {Math.abs(diff)}%</span>}</div><p className="s">{verdict}</p></div>
    <div className="c"><div className="k">TB denna vecka</div><div className="mr-mid num">{sv(T(cur))} kr</div><div className="s">Förra veckan: {sv(T(prev))} kr</div></div>
    <div className="c"><div className="k">Snitt / arbetsdag (14 d)</div><div className="mr-mid num">{avg.toFixed(1)} sälj</div><div className="s">{days} dagar med registrering</div></div>
    <div className="c"><div className="k">Bästa dag hittills</div><div className="mr-mid num">{best?Number(best.sales)+' sälj':'–'}</div><div className="s">{best?best.entry_date:'Inga registreringar än'}</div></div></div>
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

export default function App(){
  const[rows,setRows]=useState<Row[]>([]);const[g,setG]=useState<Goals>(DEF);
  const[role,setRole]=useState<''|'seller'|'manager'>('');
  const[tab,setTab]=useState<TabId>('overview');const[edit,setEdit]=useState<number|null>(null);
  const[toast,setToast]=useState('');const[loading,setLoading]=useState(true);
  const[rg,setRg]=useState<'Idag'|'Denna vecka'|'Denna månad'|'Föregående månad'|'Detta år'|'Allt'>('Denna månad');
  const[msgs,setMsgs]=useState<Msg[]>([]);const[q,setQ]=useState('');const[busy,setBusy]=useState(false);
  const[ks,setKs]=useState<{configured:boolean;source:string|null}>({configured:false,source:null});const[keyIn,setKeyIn]=useState('');
  const can=role==='seller';
  useEffect(()=>{document.documentElement.dataset.role=role},[role]);
  const[cm,setCm]=useState<CItem[]>([]);const[unread,setUnread]=useState(0);
  const[cText,setCText]=useState('');const[cDate,setCDate]=useState('');
  const[bell,setBell]=useState(false);const[err,setErr]=useState('');
  const[theme,setTheme]=useState<string>('default');const[themeInit,setThemeInit]=useState(false);
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
  useEffect(()=>{try{const s=localStorage.getItem('sd_theme')||'default';setTheme(s);applyTheme(s);setSound(localStorage.getItem(SOUND_ENABLED_KEY)!=='0');setHaptics(localStorage.getItem(HAPTIC_ENABLED_KEY)!=='0')}catch{}setThemeInit(true)},[]);
  useEffect(()=>{if(!themeInit)return;applyTheme(theme);try{localStorage.setItem('sd_theme',theme)}catch{}},[theme,themeInit]);
  useEffect(()=>{try{localStorage.setItem(SOUND_ENABLED_KEY,sound?'1':'0')}catch{}},[sound]);
  useEffect(()=>{try{localStorage.setItem(HAPTIC_ENABLED_KEY,haptics?'1':'0')}catch{}},[haptics]);

  // Favicon + document title live update
  useEffect(()=>{if(loading)return;const ts=rows.find(r=>r.entry_date===today())?.sales||0;const p=pct(ts,g.daily_sales);const title=`${ts}/${g.daily_sales} (${p}%) · Säljdashboard`;document.title=title;const f=document.querySelector('link[rel="icon"]')as HTMLLinkElement||document.createElement('link');if(!f.parentElement){f.rel='icon';document.head.appendChild(f)}const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#05070b';ctx.fillRect(0,0,64,64);ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(32,32,24,-Math.PI/2,2*Math.PI-Math.PI/2);ctx.stroke();ctx.strokeStyle=ts>=g.daily_sales?'#4ade80':p>=70?'#fbbf24':'#60a5fa';ctx.lineWidth=6;ctx.beginPath();ctx.arc(32,32,24,-Math.PI/2,-Math.PI/2+2*Math.PI*(Math.min(p,100)/100));ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 22px Inter,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(ts),32,32);f.href=canvas.toDataURL('image/png')},[rows,g,loading]);

  // Command palette (Ctrl/Cmd+K)
  useEffect(()=>{const on=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCmd(v=>!v)}else if(e.key==='Escape'){setCmd(false)}};window.addEventListener('keydown',on);return()=>window.removeEventListener('keydown',on)},[]);

  const load=useCallback(async()=>{
    let j:any={};try{j=await(await fetch('/api/data',{credentials:'same-origin'})).json()}catch{j={error:'Kunde inte nå servern.'}}
    if(j.role)setRole(j.role);
    if(j.error){setErr(j.error);setLoading(false);return}
    setErr('');
    const mapped=(j.rows||[]).map((x:any)=>({...x,sales:Number(x.sales),tb_sek:Number(x.tb_sek),hours:x.hours==null?null:Number(x.hours),rating:x.rating==null?null:Number(x.rating),mood:x.mood||null,tags:Array.isArray(x.tags)?x.tags:[]}));
    setRows(mapped);
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
  async function ask(question:string){const hist:Msg[]=[...msgs,{r:'u',t:question}];setMsgs(hist);setBusy(true);try{const j=await(await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({today:today(),wl:workdaysLeft(),messages:hist.filter(m=>!m.e).slice(-8).map(m=>({role:m.r==='u'?'user':'assistant',content:m.t}))})})).json();const ps=(j.proposals||[]).map((p:any,i:number)=>({...p,id:Date.now()+'-'+i}));setMsgs(m=>[...m,{r:'a',t:j.text||(ps.length?'Jag föreslår:':j.error||'Något gick fel.'),e:!j.text&&!ps.length,props:ps}])}catch{setMsgs(m=>[...m,{r:'a',t:'AI är inte tillgänglig just nu.',e:true}])}setBusy(false)}
  async function apply(p:Prop){let r:any;if(p.tool==='registrera_dag')r=await api({action:'upsert',entry_date:p.input.entry_date,sales:p.input.sales,tb_sek:p.input.tb_sek,hours:p.input.hours??null,note:p.input.note??null});else if(p.tool==='satt_mal')r=await api({action:'goals',...g,...p.input});else r=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'add',body:p.input.body,entry_date:p.input.entry_date||null})}).then(x=>x.json());if(r.error)return alert(r.error);setMsgs(m=>m.map(x=>({...x,props:x.props?.map(y=>y.id===p.id?{...y,done:true}:y)})));await load();say('Klart ✓')}
  async function postC(e:React.FormEvent){e.preventDefault();if(!cText.trim())return;const j=await(await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'add',body:cText.trim(),entry_date:cDate||null})})).json();if(j.error)return alert(j.error);setCText('');setCDate('');loadC();say('Skickat ✓');if(sound)beep(580,.08,'triangle',.04);buzz(12)}
  async function react(id:number,r:string){const x=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'react',id,reaction:r})});const j=await x.json().catch(()=>({}));if(j.error)return say('Kunde inte reagera');loadC()}
  async function pinComment(c:CItem){const x=await fetch('/api/comments',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'pin',id:c.id,pinned:!c.pinned})});const j=await x.json().catch(()=>({}));if(j.error)return say('Kunde inte pinna');loadC();say(c.pinned?'Pin borttagen':'Fastnålad 📌')}
  async function keyCall(method:string,key?:string){const r=await fetch('/api/ai/key',{method,headers:{'content-type':'application/json'},credentials:'same-origin',body:key?JSON.stringify({key}):undefined});const j=await r.json();if(!r.ok)return alert(j.error);setKs(j);setKeyIn('');say(j.configured?'Nyckel sparad ✓':'Nyckel borttagen')}
  async function doLogout(){if(!confirm('Logga ut?'))return;await fetch('/api/logout',{method:'POST',credentials:'same-origin'});window.location.replace('/login?e=logged_out')}
  async function changePw(e:React.FormEvent){e.preventDefault();setPwMsg(null);if(newPw.length<4)return setPwMsg({t:'Minst 4 tecken.'});if(newPw!==newPw2)return setPwMsg({t:'Matchar inte.'});const r=await fetch('/api/password',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({current:curPw,next:newPw})});const j=await r.json().catch(()=>({}));if(!r.ok)return setPwMsg({t:j.error||'Kunde inte byta.'});setPwMsg({t:'Bytt ✓',ok:true});setCurPw('');setNewPw('');setNewPw2('');say('Lösenord uppdaterat')}
  const api=(b:any)=>fetch('/api/data',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(b)}).then(r=>r.json());

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
    {label:'Visa märken',icon:'🏅',fn:()=>setTab('achievements')},
    {label:'Öppna inställningar',icon:'⚙',fn:()=>setTab('settings')},
    {label:'+1 sälj (snabbregistrering)',icon:'🔥',fn:quick},
    {label:'Exportera CSV',icon:'⤓',fn:csv},
    {label:`Ljud ${sound?'av':'på'}`,icon:sound?'🔇':'🔊',fn:()=>setSound(v=>!v)},
  ];return all.filter(x=>x.label.toLowerCase().includes(cmdQ.toLowerCase())&&(can||!x.label.startsWith('+1 sälj')))},[cmdQ,sound,can]);
  useEffect(()=>{if(cmd){setCmdI(0);setCmdQ('')}else{setCmdQ('')};},[cmd]);

  const cmdAction=(fn:()=>void)=>{fn();setCmd(false)};

  if(loading)return<div className="center"><Sparkles/><div className="sk"><i/><i/><i/></div></div>;
  const todayRow=rows.find(r=>r.entry_date===today());
  const mo=rows.filter(r=>mon(r.entry_date)===mon(today()));
  const ts=todayRow?.sales||0,tt=todayRow?.tb_sek||0;
  const ms=sum(mo,'sales'),mt=sum(mo,'tb_sek');const wl=Math.max(workdaysLeft(),1);
  const planS=g.monthly_sales*(workdaysElapsed()/Math.max(workdaysTotal(),1));const ahead=ms-planS;
  const A=range(rows,rg),B=prevRange(rows,rg);const hh=A.filter(r=>r.hours!=null);
  const best=[...A].sort((a,b)=>b.sales-a.sales)[0];const dl=sum(A,'sales')-sum(B,'sales');
  const streak=streakAt(rows,g);const bStreak=bestStreak(rows,g);
  const proj=workdaysElapsed()>=5?(ms/Math.max(workdaysElapsed(),1))*workdaysTotal():null;
  const wdAvg=[1,2,3,4,5].map(w=>{const x=rows.filter(r=>new Date(r.entry_date+'T12:00').getDay()===w);return{n:['Mån','Tis','Ons','Tor','Fre'][w-1],v:x.length?sum(x,'sales')/x.length:0}});
  const wmax=Math.max(...wdAvg.map(x=>x.v),1);
  const pbd=pbDay(rows),pbt=pbTB(rows);const cmpM=compareMonths(rows);
  const months=groupByMonth(rows).slice(-12);
  const moodStats=Object.keys(MOOD_EMOJI).map(key=>({key,emoji:MOOD_EMOJI[key],count:A.filter(r=>r.mood===key).length}));
  const maxMood=Math.max(...moodStats.map(x=>x.count),1);
  const rated=A.filter(r=>r.rating!=null);const avgRating=rated.length?sum(rated,'rating')/rated.length:0;
  const tagStats=[...new Set(A.flatMap(r=>r.tags||[]))].map(tag=>({tag,days:A.filter(r=>(r.tags||[]).includes(tag)).length,sales:sum(A.filter(r=>(r.tags||[]).includes(tag)),'sales')})).sort((x,y)=>y.sales-x.sales).slice(0,8);
  const currentWeekKey=weekKey(new Date());
  const currentWeekRows=rows.filter(r=>weekKey(new Date(r.entry_date+'T12:00'))===currentWeekKey);
  const priorWeeks=weekSales(rows).filter(w=>w.key!==currentWeekKey).slice(-7);
  const wks=[...priorWeeks,{key:currentWeekKey,sales:sum(currentWeekRows,'sales'),tb:sum(currentWeekRows,'tb_sek')}];
  const er=edit?rows.find(r=>r.id===edit):null;const alerts=buildAlerts(rows,g,role,unread);
  const greet=greeting();const dayName=new Date().toLocaleDateString('sv-SE',{weekday:'long',day:'numeric',month:'long'});
  const pctToday=pct(ts,g.daily_sales);
  const pinnedComments=cm.filter(c=>c.pinned);const unpinned=cm.filter(c=>!c.pinned);
  const sortedCm=[...pinnedComments,...unpinned];
  const unlockedArr=ACHIEVEMENTS.filter(a=>unlocked.has(a.key));
  const lockedArr=ACHIEVEMENTS.filter(a=>!unlocked.has(a.key));
  const weekW=wks[wks.length-1];const weekP=weekW?Math.min(100,Math.round(weekW.sales/Math.max(g.weekly_sales,1)*100)):0;

  return<div className="app"><Sparkles/>
    <div ref={spotRef}className="spotlight hidden"aria-hidden="true"/>
    <aside aria-label="Navigation">
      <div className="logo"><i>S</i><div className="t"><div>Säljdashboard</div><small>Privat uppföljning</small></div></div>
      {TABS.map(t=><button key={t.id}className={'nv '+(tab===t.id?'on':'')}onClick={()=>{setTab(t.id);setEdit(null);setMoodSel(null);window.scrollTo({top:0,behavior:'smooth'})}}data-tip={t.label}><span className="ic">{t.ic}</span><span>{t.label}</span>{t.id==='comments'&&unread>0&&<em className="dot-mini">{unread}</em>}{t.id==='achievements'&&unlockedArr.length>0&&<span className="dot-mini"style={{background:'var(--am)'}}>{unlockedArr.length}</span>}</button>)}
      <div className="who"><b>{can?'Stille':'Affe'}</b><span className="role">{can?'Säljare':'Chef'}</span><div className="row"style={{marginTop:8,gap:6}}><button className="b sm ghost"onClick={()=>setSound(s=>!s)}title="Ljud">{sound?'🔊':'🔇'}</button><button type="button"className="b sm ghost"onClick={doLogout}>Logga ut</button></div></div>
    </aside>
    <main ref={mainRef}key={tab}className="tab-wrap">
      <div className="top">
        <span className="chip">{TABS.find(t=>t.id===tab)?.label}{tab!=='overview'&&<span className="muted"> · {can?'Stille':'Affe'}</span>}<span className="muted"style={{marginLeft:10,opacity:.5}}>⌘K</span></span>
        <div style={{position:'relative'}}ref={bellRef}>
          <button className="b bellb"onClick={()=>setBell(b=>!b)}aria-label="Notiser">🔔{alerts.length>0&&<i className="dot pulse-ring">{alerts.length}</i>}</button>
          {bell&&<div className="c pop"><div className="k">Notiser</div>{alerts.length?alerts.map(x=><p key={x}className="al">{x}</p>):<p className="s">Allt lugnt 👌</p>}{typeof Notification!=='undefined'&&Notification.permission==='default'&&<button className="b"onClick={()=>{Notification.requestPermission().then(()=>setBell(false))}}>Aktivera notiser</button>}</div>}
        </div>
      </div>
      {err&&<div className="c errb">⚠️ {err}<br/><span className="s">Kolla servernyckeln i Vercel: sb_secret_... eller legacy service_role-JWT (eyJ...), från samma Supabase-projekt som URL:en. Kontrollera även att schema.sql är körd.</span></div>}

      {tab==='overview'&&<>
        <h2>{greet}, {can?'Stille':'Affe'} <span className="ok">👋</span></h2>
        <p className="sub">{dayName} · <span className="num">{streak} dagar i rad {streak>=3&&<span className="streak-fire">🔥</span>}</span></p>
        <Ticker items={[`Idag: ${todayRow?Number(todayRow.sales):0} sälj`,`Månaden: ${ms} sälj`,`TB månaden: ${sv(mt)} kr`,`${streak} dagar i rad 🔥`,can?'Stille levererar':'Chefsvyn är live']}/>
        {!can&&<><ManagerReport rows={rows}/><ChefBox/></>}
        {!rows.length?<div className="c"style={{textAlign:'center',padding:44}}><div style={{fontSize:50}}>🚀</div><h2 style={{marginTop:8}}>Dags för första registreringen</h2><p className="sub">Inga resultat än.</p>{can&&<button className="b pri"onClick={()=>setTab('register')}>Registrera dagens siffror</button>}</div>:<>
        <div className="bento">
          <div className="c hero">
            <Ring p={pctToday}sub={`${ts}/${g.daily_sales}`}size={180}/>
            <div>
              <div className="k">Idag{todayRow?.mood&&<span className="day-emoji">{MOOD_EMOJI[todayRow.mood]}</span>}</div>
              <div className="v"style={{fontSize:42}}><CountUp n={ts}/><span className="s"> / {g.daily_sales} sälj</span></div>
              <p style={{margin:'6px 0 16px',color:'var(--mu2)'}}>
                {ts<g.daily_sales?<>Det behövs <b className="ok">{g.daily_sales-ts} sälj</b> till för att nå målet.</>:<b className="ok">Dagsmålet är nått! 🎉</b>}<br/>
                TB: <b style={{color:'var(--tx)'}}>{fmtMoney(tt)}</b> av {fmtMoney(g.daily_tb)} ({pct(tt,g.daily_tb)}%).
              </p>
              <div className="row"style={{margin:0}}>{can&&<button className="b pri pulse-ring"onClick={quick}>+1 sälj</button>}{can&&<button className="b"onClick={()=>setTab('register')}>Registrera</button>}<button className="b"onClick={()=>setTab('ai')}>✦ AI-coach</button></div>
            </div>
          </div>
          <div className="c mini">
            <div className="k">Månadens sälj</div>
            <div className="v ok"><CountUp n={ms}/></div>
            <div className="s">mål {fmt(g.monthly_sales)} · {pct(ms,g.monthly_sales)}%</div>
            <div className="bar"><i style={{width:pct(ms,g.monthly_sales)+'%'}}/></div>
          </div>
          <div className="c mini">
            <div className="k">Månadens TB</div>
            <div className="v">{fmt(Math.round(mt/1000))}k kr</div>
            <div className="s">{fmtMoney(mt)} av {fmtMoney(g.monthly_tb)}</div>
            <div className="bar"><i style={{width:pct(mt,g.monthly_tb)+'%',background:'linear-gradient(90deg,var(--acc2),var(--g3))'}}/></div>
          </div>
          <div className="c quote-card">
            <div className="quote-text">"{quote.t}"</div>
            {quote.a&&<div className="quote-author">— {quote.a}</div>}
          </div>
          <div className="c wide">
            <div className="k">Senaste 14 dagarna</div>
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

        <div className="c"style={{marginTop:16}}><div className="k">Senaste veckorna</div><div className="wk-rings">{wks.map((w,i)=><div key={w.key}className="wk-ring"><Ring p={Math.min(100,Math.round(w.sales/Math.max(g.weekly_sales,1)*100))}sub={`${fmt(w.sales)}/${g.weekly_sales}`}size={110}stroke={10}delay={i*60}/><div className="wk-label">{w.key.slice(5)}</div></div>)}</div></div>

        <div className="g">
          <Stat i={0}k="TB idag"v={fmtMoney(tt)}s={`${fmtMoney(g.daily_tb)} mål · ${pct(tt,g.daily_tb)}%`}bar={pct(tt,g.daily_tb)}icon="💰"/>
          <Stat i={1}k="Veckans sälj"v={weekW?fmt(weekW.sales):'–'}s={`${fmt(g.weekly_sales)} mål · ${weekP}%`}bar={weekP}icon="📆"trend={wks.length>=2?Math.round((weekW!.sales/Math.max(wks[wks.length-2].sales,1)-1)*100):undefined}/>
          <Stat i={2}k="Veckans TB"v={weekW?fmtMoney(weekW.tb):'–'}s={`${fmtMoney(g.weekly_tb)} mål · ${pct(weekW?.tb||0,g.weekly_tb)}%`}bar={pct(weekW?.tb||0,g.weekly_tb)}icon="💵"/>
          <Stat i={3}k="Snitt/dag"v={mo.length?f1(ms/mo.length):'–'}s={`${mo.length} dagar`}icon="📅"/>
          <Stat i={4}k="Snitt TB/sälj"v={ms?fmtMoney(mt/ms):'–'}s="denna månad"icon="🏷"/>
          <Stat i={5}k="Streak 🔥"v={streak+' dgr'}s={`bästa ${bStreak}`}c={streak?'ok':''}icon="🔥"/>
          <Stat i={6}k="Mot plan"v={(ahead>=0?'+':'')+f1(ahead)}s={ahead>=0?'Före plan':'Efter plan'}c={ahead>=0?'ok':'bad'}icon="📊"/>
          <Stat i={7}k="Prognos"v={proj!=null?fmt(Math.round(proj))+' sälj':'–'}s={proj!=null?proj>=g.monthly_sales?'Når målet':'Under målet':'≥5 dagar'}c={proj!=null?proj>=g.monthly_sales?'ok':'bad':''}icon="🔮"/>
          <Stat i={8}k="Krävs/dag"v={f1(Math.max(g.monthly_sales-ms,0)/wl)}s={`${wl} arbetsdagar kvar`}icon="⏳"/>
          <Stat i={9}k="Sälj/timme"v={sum(hh,'hours')?f1(sum(hh,'sales')/sum(hh,'hours')):'–'}s="när timmar finns"icon="⏱"/>
          {pbd&&<Stat i={10}k="Rekorddag (sälj)"v={pbd.sales}s={pbd.entry_date}icon="🏆"/>}
          {pbt&&<Stat i={11}k="Rekorddag (TB)"v={fmtMoney(pbt.tb_sek)}s={pbt.entry_date}icon="💎"/>}
          <Stat i={12}k="Upplåsta märken"v={unlockedArr.length+'/'+ACHIEVEMENTS.length}s="tryck på 🏅 för att se"icon="🏅"/>
        </div>

        {cmpM&&<div className="c"><div className="k">Jämfört med förra månaden</div><div className="row"style={{marginTop:10,marginBottom:0,gap:30}}>
          <div><div className="s">Förra: {fmt(cmpM.prev.sales)} sälj</div><div style={{fontSize:22,fontWeight:800}}>{fmt(cmpM.cur.sales)} <span className={'stat-change '+(cmpM.salesDiff>=0?'up':'down')}>{cmpM.salesDiff>=0?'▲':'▼'} {Math.abs(cmpM.salesDiff)} ({cmpM.salesPct>=0?'+':''}{cmpM.salesPct}%)</span></div></div>
          <div style={{borderLeft:'1px solid var(--bd)',paddingLeft:30}}><div className="s">TB: {fmtMoney(cmpM.prev.tb)}</div><div style={{fontSize:22,fontWeight:800}}>{fmtMoney(cmpM.cur.tb)} <span className={'stat-change '+(cmpM.tbDiff>=0?'up':'down')}>{cmpM.tbDiff>=0?'▲':'▼'} {fmtMoney(Math.abs(cmpM.tbDiff))} ({cmpM.tbPct>=0?'+':''}{cmpM.tbPct}%)</span></div></div>
        </div></div>}

        <div className="c"style={{marginTop:16}}><div className="k">Månadskalender</div><Heat rows={rows}goal={g.daily_sales}/></div>
        </>}
      </>}

      {tab==='register'&&<>
        <h2>{er?'Ändra':'Registrera'} resultat</h2>
        <p className="sub">{er?'Uppdatera':'Samma datum ersätter befintlig registrering.'}</p>
        {can?<div className="c"style={{maxWidth:600}}>
          <form key={edit??'new'}onSubmit={save}>
            <label>Datum<input name="d"type="date"required defaultValue={er?.entry_date||today()}/></label>
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
        <h2>Mål</h2>
        <p className="sub">Spara för att tillämpa. Dagliga, veckovisa och månatliga mål.</p>
        {can?<div className="c"style={{maxWidth:640,marginBottom:16}}><form key={JSON.stringify(g)}onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);saveGoals({daily_sales:Number(f.get('a')),daily_tb:Number(f.get('b')),weekly_sales:Number(f.get('e')),weekly_tb:Number(f.get('f')),monthly_sales:Number(f.get('c')),monthly_tb:Number(f.get('d'))})}}>
          <div className="three">
            <label>Dagsmål sälj<input name="a"type="number"min="0"defaultValue={g.daily_sales}/></label>
            <label>Dagsmål TB (kr)<input name="b"type="number"min="0"defaultValue={g.daily_tb}/></label>
            <label>Veckomål sälj<input name="e"type="number"min="0"defaultValue={g.weekly_sales}/></label>
            <label>Veckomål TB<input name="f"type="number"min="0"defaultValue={g.weekly_tb}/></label>
            <label>Månadsmål sälj<input name="c"type="number"min="0"defaultValue={g.monthly_sales}/></label>
            <label>Månadsmål TB<input name="d"type="number"min="0"defaultValue={g.monthly_tb}/></label>
          </div>
          <button className="b pri">Spara mål</button>
        </form></div>:<p className="s">Bara säljaren kan ändra mål.</p>}
        <div className="g">
          <Stat k="Veckans sälj"v={fmt(weekW?.sales||0)}s={`${fmt(g.weekly_sales)} mål · ${weekP}%`}bar={weekP}icon="📆"/>
          <Stat k="Veckans TB"v={fmtMoney(weekW?.tb||0)}s={`${fmtMoney(g.weekly_tb)} mål · ${pct(weekW?.tb||0,g.weekly_tb)}%`}bar={pct(weekW?.tb||0,g.weekly_tb)}icon="💵"/>
          <Stat k="Sälj kvar (månad)"v={fmt(Math.max(g.monthly_sales-ms,0))}s={f1(Math.max(g.monthly_sales-ms,0)/wl)+' per dag'}icon="⏳"/>
          <Stat k="TB kvar (månad)"v={fmtMoney(Math.max(g.monthly_tb-mt,0))}s={fmtMoney(Math.max(g.monthly_tb-mt,0)/wl)+'/dag'}icon="⌛"/>
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
          <div className="row">{(can?['Hur ligger jag till idag?','Föreslå veckans mål','Registrera idag: 5 sälj & 3000 kr','Veckosammanfattning','Peppa mig']:['Hur går det för Stille?','Veckosammanfattning','Peppa Stille']).map(x=><button key={x}className="b"disabled={busy}onClick={()=>ask(x)}>{x}</button>)}</div>
          <div className="chat">{msgs.map((m,i)=><div key={i}className={`msg ${m.r} ${m.e?'e':''}`}>{m.t}{m.props?.map(p=><div key={p.id}className="sug">{(p.tool==='registrera_dag'?`Registrera ${p.input.entry_date}: ${p.input.sales} sälj, ${fmtMoney(p.input.tb_sek)}${p.input.hours?', '+p.input.hours+' h':''}`:p.tool==='satt_mal'?'Ändra mål: '+Object.entries(p.input).map(([k,v])=>`${({a:'dagsmål sälj',b:'dagsmål TB',c:'månadsmål sälj',d:'månadsmål TB',e:'veckomål sälj',f:'veckomål TB'}as any)[k]||k} ${fmt(Number(v))}`).join(', '):p.tool==='skriv_kommentar'?`Skicka kommentar: "${p.input.body}"`:JSON.stringify(p.input))}<br/>{p.done?<span className="tag">✓ Gjort</span>:<button className="b pri"style={{marginTop:8}}onClick={()=>apply(p)}>Godkänn</button>}</div>)}</div>)}{busy&&<div className="msg a s">Tänker<span className="dots">…</span></div>}</div>
          <form onSubmit={e=>{e.preventDefault();if(q.trim()){ask(q.trim());setQ('')}}}style={{maxWidth:680,display:'grid',gridTemplateColumns:'1fr auto',gap:8}}><input value={q}maxLength={500}onChange={e=>setQ(e.target.value)}placeholder="Fråga eller be AI:n göra något…"/><button className="b pri"disabled={busy||!q.trim()}>Skicka</button></form>
        </>}
      </>}

      {tab==='achievements'&&<>
        <h2>Märken & milstolpar <span className="streak-fire"style={{fontSize:24}}>🏅</span></h2>
        <p className="sub">{unlockedArr.length} av {ACHIEVEMENTS.length} upplåsta. Fortsätt så här!</p>
        <div className="g">{ACHIEVEMENTS.map(a=>{const on=unlocked.has(a.key);return<div key={a.key}className={'c '+(on?'':'ach-lock')}style={{textAlign:'center',padding:22,opacity:on?1:.55}}><div style={{fontSize:46,filter:on?'none':'grayscale(1)',transform:on?'none':'scale(.85)',transition:'.3s'}}>{a.emoji}</div><div style={{fontWeight:700,marginTop:6}}>{a.name}</div><div className="s"style={{fontSize:12,marginTop:4}}>{a.desc}</div>{on&&<span className="tag"style={{marginTop:8,display:'inline-block'}}>✓ Upplåst</span>}</div>})}</div>
      </>}

      {tab==='settings'&&<>
        <h2>Inställningar</h2><p className="sub">Anpassa utseende och säkerhet.</p>
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Tema</div><div className="seg-theme"role="radiogroup"style={{marginTop:12}}>{THEMES.map(t=><button key={t.id}type="button"className={theme===t.id?'on':''}onClick={()=>setTheme(t.id)}aria-pressed={theme===t.id}title={t.label}><span style={{display:'block',width:'100%',height:'100%',borderRadius:10,background:t.grad}}>{t.emoji}</span></button>)}</div><p className="s">Valet sparas i din webbläsare.</p></div>
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Ljud</div><div className="row"style={{margin:0}}><button className="b"onClick={()=>setSound(s=>!s)}>{sound?'🔊 Ljud på':'🔇 Ljud av'}</button><span className="s">Spelar ett litet chime vid mål och stora händelser.</span></div></div>
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Vibration</div><div className="row"style={{margin:0}}><button className="b"onClick={()=>setHaptics(v=>!v)}>{haptics?'📳 Vibration på':'📴 Vibration av'}</button><span className="s">Kräver en mobil eller enhet med vibrationsstöd.</span></div></div>
        <div className="c"style={{maxWidth:580,marginBottom:14}}><div className="k">Byt lösenord ({can?'Stille':'Affe'})</div><p className="s"style={{marginTop:6}}>Kräver nuvarande lösenord. Gäller för alla enheter.</p><form onSubmit={changePw}style={{marginTop:10}}><label>Nuvarande<input type="password"value={curPw}onChange={e=>setCurPw(e.target.value)}required/></label><div className="two"><label>Nytt<input type="password"value={newPw}onChange={e=>setNewPw(e.target.value)}required minLength={4}/></label><label>Bekräfta<input type="password"value={newPw2}onChange={e=>setNewPw2(e.target.value)}required minLength={4}/></label></div><div className="row"style={{margin:0}}><button className="b pri">Byt lösenord</button>{pwMsg&&<span className={'s '+(pwMsg.ok?'ok':'bad')}style={{alignSelf:'center'}}>{pwMsg.t}</span>}</div></form></div>
        <div className="c"style={{maxWidth:580}}><div className="k">Om & genvägar</div><div className="s"style={{marginTop:8,lineHeight:1.9}}>Säljdashboard v7 · Next.js 14 · Supabase · HMAC-sessioner · Confetti, teman, humör, årsvy, märken, reaktioner, citat, ⌘K, musglöd, favicon med live-status, chime-ljud.<br/><b>⌘/Ctrl + K</b> – kommandopalett<br/><b>Klicka på +1-sälj-knappen nere till höger</b> för snabb ökning.</div><div className="row"style={{marginTop:10,marginBottom:0}}><button className="b ghost"onClick={()=>window.open('/api/health','_blank')}>Hälsokontroll</button><button className="b danger"onClick={doLogout}>Logga ut</button></div></div>
      </>}

      {can&&<button className="fab pulse-ring"onClick={quick}title="+1 sälj">+</button>}
      {toast&&<div className="toast"role="status">{toast}</div>}
      {cmd&&<div className="cmd-pal"onClick={()=>setCmd(false)}><div className="cmd-card"onClick={e=>e.stopPropagation()}><input autoFocus className="cmd-input"placeholder="Gå någonstans eller gör en åtgärd…"value={cmdQ}onChange={e=>{setCmdQ(e.target.value);setCmdI(0)}}onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setCmdI(i=>Math.min(i+1,cmds.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();setCmdI(i=>Math.max(i-1,0))}else if(e.key==='Enter'){e.preventDefault();if(cmds[cmdI])cmdAction(cmds[cmdI].fn)}}}/><div className="cmd-list">{cmds.map((c,i)=><div key={c.label}className={'cmd-item '+(i===cmdI?'on':'')}onMouseEnter={()=>setCmdI(i)}onClick={()=>cmdAction(c.fn)}><span>{c.icon}</span><span>{c.label}</span>{!c.k&&<span className="cmd-kbd">↵</span>}</div>)}
        {!cmds.length&&<p className="s"style={{padding:16,textAlign:'center'}}>Inga träffar</p>}
        <div className="s"style={{padding:'8px 14px',borderTop:'1px solid var(--bd)',fontSize:11}}>⌘K för att öppna · ↑↓ navigera · ↵ kör · esc stäng</div>
      </div></div></div>}
      {achPopup&&<div className="ach-modal"onClick={()=>setAchPopup(null)}><div className="ach-card"onClick={e=>e.stopPropagation()}><div className="ach-badge"><span>{achPopup.emoji}</span></div><div className="ach-title">Märke upplåst!</div><h3 style={{margin:0,fontSize:20}}>{achPopup.name}</h3><div className="ach-desc">{achPopup.desc}</div><button className="b pri"onClick={()=>setAchPopup(null)}>Fantastiskt!</button></div></div>}
    </main>
  </div>;
}

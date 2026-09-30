import { useEffect, useRef, useState } from 'react'

type Theme = { name:string; colors:string[]; background:string }
type Mode = 'bounce'|'orbit'|'rings'|'growth'

const THEMES:Theme[]=[
  {name:'Neon',colors:['#7c3cff','#00e5ff','#ff3cac'],background:'#07070a'},
  {name:'Aurora',colors:['#00f5a0','#00d9f5','#8b5cf6'],background:'#06100f'},
  {name:'Sunset',colors:['#ff4d6d','#ff9f1c','#ffe66d'],background:'#120907'},
]
const MODES:{id:Mode;name:string;desc:string;icon:string}[]=[
  {id:'bounce',name:'Infinite Bounce',desc:'orb · ring · collisions',icon:'◉'},
  {id:'orbit',name:'Orbit Loop',desc:'gravity · orbit · trails',icon:'◎'},
  {id:'rings',name:'Ring Cascade',desc:'rings · pulses · rhythm',icon:'◌'},
  {id:'growth',name:'Fractal Growth',desc:'branches · bloom · recursion',icon:'✣'},
]

const seededRandom=(seed:number)=>{
 let t=seed>>>0
 return()=>{t+=0x6D2B79F5;let r=Math.imul(t^(t>>>15),1|t);r^=r+Math.imul(r^(r>>>7),61|r);return((r^(r>>>14))>>>0)/4294967296}
}

function App(){
 const canvasRef=useRef<HTMLCanvasElement>(null)
 const [mode,setMode]=useState<Mode>('bounce')
 const [themeIndex,setThemeIndex]=useState(0)
 const [speed,setSpeed]=useState(1)
 const [intensity,setIntensity]=useState(.7)
 const [trail,setTrail]=useState(true)
 const [particles,setParticles]=useState(true)
 const [running,setRunning]=useState(true)
 const [seed,setSeed]=useState(1)
 const [recording,setRecording]=useState(false)
 const mediaRef=useRef<MediaRecorder|null>(null)
 const chunksRef=useRef<Blob[]>([])
 const theme=THEMES[themeIndex]

 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return
  const ctx=canvas.getContext('2d');if(!ctx)return
  let raf=0,last=performance.now(),dpr=1
  const resize=()=>{dpr=Math.min(devicePixelRatio||1,2);const r=canvas.getBoundingClientRect();canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
  resize();addEventListener('resize',resize)
  const rng=seededRandom(seed*9176+themeIndex*101+mode.length*37),random=()=>rng()
  const history:{x:number;y:number}[]=[]
  const sparks:{x:number;y:number;vx:number;vy:number;life:number;color:string}[]=[]
  const rings=Array.from({length:7},(_,i)=>({r:.11+i*.065,phase:random()*6.28}))
  let time=0
  let b={x:.5,y:.5,vx:(.45+random()*.2)*(seed%2?1:-1),vy:-.7-random()*.15,r:15+random()*4,h:seed*47}
  const reset=()=>{history.length=0;sparks.length=0;time=0}
  const burst=(x:number,y:number,color:string,count=18)=>{if(!particles)return;for(let i=0;i<count;i++){const a=random()*Math.PI*2,v=.6+random()*2.8;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,color})}}
  const draw=(now:number)=>{
   const dt=Math.min((now-last)/16.666,2);last=now;time+=dt
   const r=canvas.getBoundingClientRect(),w=r.width,h=r.height,cx=w/2,cy=h/2
   ctx.fillStyle=theme.background;ctx.fillRect(0,0,w,h)
   const bg=ctx.createRadialGradient(cx,cy,10,cx,cy,Math.min(w,h)*.7);bg.addColorStop(0,theme.colors[0]+'12');bg.addColorStop(1,'#0000');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)
   const base=Math.min(w,h)*.34

   if(mode==='bounce'||mode==='orbit'){
    ctx.save();ctx.translate(cx,cy)
    ctx.rotate(Math.sin(now*.0003)*.08)
    ctx.strokeStyle=theme.colors[1]+'70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,base,0,Math.PI*2);ctx.stroke()
    ctx.strokeStyle=theme.colors[0]+'20';ctx.lineWidth=14;ctx.beginPath();ctx.arc(0,0,base+11,.2,Math.PI*1.65);ctx.stroke();ctx.restore()
   }
   if(mode==='rings'){
    rings.forEach((q,i)=>{const rr=base*(q.r/.5)+(Math.sin(time*.025+i)*3);ctx.beginPath();ctx.arc(cx,cy,rr,q.phase+time*.008,q.phase+Math.PI*1.55+time*.008);ctx.strokeStyle=theme.colors[i%3]+(i===0?'aa':'35');ctx.lineWidth=i===0?2:1;ctx.stroke()})
   }
   if(mode==='growth'){
    ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=.8
    for(let arm=0;arm<10;arm++){ctx.rotate(Math.PI*2/10);ctx.beginPath();ctx.moveTo(0,0);for(let s=1;s<12;s++){const rr=s*base/13;const wob=Math.sin(time*.018+s*.8)*intensity*5;ctx.lineTo(Math.cos(s*.42)*rr+wob,Math.sin(s*.42)*rr)}ctx.strokeStyle=theme.colors[arm%3]+'55';ctx.lineWidth=1.2;ctx.stroke()}ctx.restore()
   }

   if(running){
    if(mode==='bounce'){
     b.vy+=.025*intensity*dt*speed;b.x+=b.vx*.00155*dt*speed;b.y+=b.vy*.00155*dt*speed
     const dx=(b.x-.5)*w,dy=(b.y-.5)*h,d=Math.hypot(dx,dy),max=base-b.r-2
     if(d>max){const nx=dx/d,ny=dy/d;b.x=.5+nx*max/w;b.y=.5+ny*max/h;const dot=b.vx*nx+b.vy*ny;b.vx-=2*dot*nx;b.vy-=2*dot*ny;b.r=Math.min(b.r+.16*intensity,38);b.h+=63;burst(cx+nx*max,cy+ny*max,theme.colors[Math.floor(Math.abs(b.h/63))%3],12)}
     history.push({x:cx+dx,y:cy+dy})
    } else if(mode==='orbit'){
     const a=time*.012*speed,rad=base*.62
     const x=Math.cos(a)*rad,y=Math.sin(a*1.73)*rad*.72
     b.x=.5+x/w;b.y=.5+y/h;history.push({x:cx+x,y:cy+y})
     if(Math.floor(time)%85===0)burst(cx+x,cy+y,theme.colors[Math.floor(time/85)%3],10)
    } else if(mode==='rings'){
     if(Math.floor(time)%18===0){const a=(time*.045)%6.28;burst(cx+Math.cos(a)*base*.55,cy+Math.sin(a)*base*.55,theme.colors[Math.floor(time/18)%3],6)}
    }
    if(history.length>110)history.shift()
   }
   if(trail&&history.length>1){for(let i=1;i<history.length;i++){const p=history[i],a=i/history.length;ctx.strokeStyle=theme.colors[i%3]+Math.floor(a*100).toString(16).padStart(2,'0');ctx.lineWidth=1+a*5;ctx.beginPath();ctx.moveTo(history[i-1].x,history[i-1].y);ctx.lineTo(p.x,p.y);ctx.stroke()}}
   for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=.018*dt;s.life-=.022*dt;if(s.life<=0)sparks.splice(i,1);else{ctx.globalAlpha=s.life;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(s.x,s.y,2*s.life,0,Math.PI*2);ctx.fill()}}ctx.globalAlpha=1

   if(mode==='bounce'||mode==='orbit'){
    const dx=(b.x-.5)*w,dy=(b.y-.5)*h,bx=cx+dx,by=cy+dy,color=theme.colors[Math.floor(Math.abs(b.h/63))%3]
    const rr=mode==='orbit'?13:b.r;ctx.save();ctx.shadowBlur=38;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(bx,by,rr,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;const g=ctx.createRadialGradient(bx-rr*.3,by-rr*.35,1,bx,by,rr);g.addColorStop(0,'#fff');g.addColorStop(.18,color);g.addColorStop(1,color+'22');ctx.fillStyle=g;ctx.beginPath();ctx.arc(bx,by,rr,0,Math.PI*2);ctx.fill();ctx.restore()
   }
   if(mode==='rings'){
    const pulse=1+Math.sin(time*.07*speed)*.08;ctx.save();ctx.shadowBlur=28;ctx.shadowColor=theme.colors[0];ctx.strokeStyle=theme.colors[0];ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,base*.18*pulse,0,Math.PI*2);ctx.stroke();ctx.restore()
   }
   if(mode==='growth'){ctx.save();ctx.shadowBlur=24;ctx.shadowColor=theme.colors[1];ctx.fillStyle=theme.colors[1];ctx.beginPath();ctx.arc(cx,cy,5+Math.sin(time*.08)*2,0,Math.PI*2);ctx.fill();ctx.restore()}
   raf=requestAnimationFrame(draw)
  }
  raf=requestAnimationFrame(draw)
  return()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize)}
 },[theme,themeIndex,speed,intensity,trail,particles,running,seed,mode])

 const generate=()=>{setSeed(s=>s+1);setRunning(true)}
 const record=()=>{
  const canvas=canvasRef.current;if(!canvas)return
  if(recording){mediaRef.current?.stop();return}
  const stream=canvas.captureStream(60)
  const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000})
  chunksRef.current=[]
  rec.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)}
  rec.onstop=()=>{const blob=new Blob(chunksRef.current,{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`hypnorai-${mode}-seed-${seed}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setRecording(false)}
  mediaRef.current=rec;rec.start();setRecording(true)
 }
 return <main className="app-shell">
  <header className="topbar"><div className="brand"><span className="brand-mark">✦</span> HYPNORAI <small>STUDIO</small></div><div className="top-status"><span className="status-dot"/> ENGINE ONLINE <span className="top-divider"/> 2.0</div></header>
  <section className="workspace">
   <div className="preview-column">
    <div className="preview-head"><div><span className="live-dot"/> LIVE CANVAS · 9:16</div><button className="ghost-btn" onClick={()=>setRunning(v=>!v)}>{running?'Ⅱ Pause':'▶ Play'}</button></div>
    <div className="canvas-wrap"><canvas ref={canvasRef}/><div className="preview-meta"><span>{MODES.find(m=>m.id===mode)?.name.toUpperCase()}</span><span>SEED {seed.toString().padStart(3,'0')}</span></div><div className="corner corner-tl"/><div className="corner corner-tr"/><div className="corner corner-bl"/><div className="corner corner-br"/></div>
   </div>
   <aside className="controls">
    <div className="eyebrow">HYPNOTIC VIDEO ENGINE / V2.0</div>
    <h1>Make them<br/><em>watch.</em></h1>
    <p className="intro">Des boucles visuelles pensées pour le format vertical : mouvement continu, micro-événements et variations déterministes.</p>
    <div className="control-group"><div className="section-title">Generator <span>01</span></div><div className="mode-grid">{MODES.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className={mode===m.id?'mode-card active':'mode-card'}><div className="mode-icon">{m.icon}</div><div><strong>{m.name}</strong><span>{m.desc}</span></div></button>)}</div></div>
    <div className="control-group"><div className="section-title">Palette <span>02</span></div><div className="palette-row">{THEMES.map((t,i)=><button key={t.name} className={themeIndex===i?'palette active':'palette'} onClick={()=>setThemeIndex(i)}><div className="palette-colors">{t.colors.map(c=><span key={c} style={{background:c}}/>)}</div><small>{t.name}</small></button>)}</div></div>
    <div className="sliders">
      <div className="control-group compact"><div className="slider-label"><label>Speed</label><b>{speed.toFixed(1)}×</b></div><input type="range" min=".4" max="2.4" step=".1" value={speed} onChange={e=>setSpeed(+e.target.value)}/></div>
      <div className="control-group compact"><div className="slider-label"><label>Intensity</label><b>{Math.round(intensity*100)}%</b></div><input type="range" min="0" max="1" step=".05" value={intensity} onChange={e=>setIntensity(+e.target.value)}/></div>
    </div>
    <div className="toggles"><button onClick={()=>setTrail(v=>!v)} className={trail?'toggle on':'toggle'}><span/> Trail <b>{trail?'ON':'OFF'}</b></button><button onClick={()=>setParticles(v=>!v)} className={particles?'toggle on':'toggle'}><span/> Particles <b>{particles?'ON':'OFF'}</b></button></div>
    <div className="actions"><button className="generate" onClick={generate}><span>✦</span> Generate variation <kbd>SPACE</kbd></button><button className={recording?'record recording':'record'} onClick={record}><span/> {recording?'Stop & download':'Record video'}</button></div>
    <div className="microcopy">V2.0 · vertical-first · browser recording · WebM</div>
   </aside>
  </section>
 </main>
}
export default App

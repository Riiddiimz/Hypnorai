import { useEffect, useRef, useState } from 'react'
import './styles.css'

type Ball = { x:number; y:number; vx:number; vy:number; r:number; frozen:boolean }
type Particle = { x:number; y:number; vx:number; vy:number; life:number; color:string; size:number }

const NOTES=[261.63,293.66,329.63,392,440,523.25,587.33,659.25,783.99,659.25,587.33,523.25,440,392,329.63,293.66]

export default function App(){
 const canvasRef=useRef<HTMLCanvasElement>(null)
 const [running,setRunning]=useState(true)
 const [seed,setSeed]=useState(1)
 const [recording,setRecording]=useState(false)
 const recorder=useRef<MediaRecorder|null>(null)
 const chunks=useRef<Blob[]>([])
 const audio=useRef<AudioContext|null>(null)

 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return
  const ctx=canvas.getContext('2d');if(!ctx)return
  let raf=0,last=performance.now(),w=1,h=1,timer=5,opening=-Math.PI/2,note=0,ended=false
  const frozen:Ball[]=[]
  const particles:Particle[]=[]
  const trail:{x:number;y:number}[]=[]
  const R=()=>Math.min(w,h)*.34
  const resize=()=>{const d=Math.min(devicePixelRatio||1,2),q=canvas.getBoundingClientRect();w=q.width;h=q.height;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0)}
  resize();addEventListener('resize',resize)

  const active:Ball={x:0,y:0,vx:0,vy:0,r:14,frozen:false}
  const spawn=()=>{
   active.x=w/2;active.y=h/2
   const a=-.93,v=.0058
   active.vx=Math.cos(a)*v;active.vy=Math.sin(a)*v
   active.r=Math.min(w,h)*.026
   trail.length=0;timer=5
  }
  const audioOn=()=>{
   if(!audio.current)audio.current=new AudioContext()
   if(audio.current.state==='suspended')void audio.current.resume()
  }
  const playNote=()=>{
   const a=audio.current;if(!a)return
   const o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter(),n=a.currentTime
   o.type='triangle';o.frequency.setValueAtTime(NOTES[note++%NOTES.length],n)
   f.type='lowpass';f.frequency.value=4200;f.Q.value=.7
   g.gain.setValueAtTime(.0001,n)
   g.gain.exponentialRampToValueAtTime(.1,n+.012)
   g.gain.exponentialRampToValueAtTime(.045,n+.075)
   g.gain.exponentialRampToValueAtTime(.0001,n+.34)
   o.connect(f);f.connect(g);g.connect(a.destination);o.start(n);o.stop(n+.36)
  }
  const burst=(x:number,y:number,color:string,count=18)=>{
   for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=.7+Math.random()*3;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,color,size:1+Math.random()*3})}
  }
  const angleDiff=(a:number,b:number)=>{let d=(a-b+Math.PI)%(Math.PI*2);if(d<0)d+=Math.PI*2;return d-Math.PI}
  const openingHit=(a:number)=>Math.abs(angleDiff(a,opening))<Math.PI*.15

  const freeze=()=>{
   frozen.push({x:active.x,y:active.y,vx:0,vy:0,r:active.r,frozen:true})
   burst(active.x,active.y,'#aeeeff',30);playNote();spawn()
  }

  const collideFrozen=()=>{
   for(const b of frozen){
    const dx=active.x-b.x,dy=active.y-b.y,d=Math.hypot(dx,dy),min=active.r+b.r
    if(d>=min)continue
    const nx=d<.0001?1:dx/d,ny=d<.0001?0:dy/d
    active.x=b.x+nx*min;active.y=b.y+ny*min
    const vn=active.vx*nx+active.vy*ny
    if(vn<0){
     active.vx-=2*vn*nx;active.vy-=2*vn*ny
     burst(active.x-nx*active.r,active.y-ny*active.r,'#d8f7ff',16);playNote()
    }
   }
  }

  spawn()
  const frame=(now:number)=>{
   const raw=Math.min(now-last,50),dt=raw/16.666;last=now
   ctx.fillStyle='#05070d';ctx.fillRect(0,0,w,h)
   const cx=w/2,cy=h/2,r=R()
   const bg=ctx.createRadialGradient(cx,cy,1,cx,cy,r*1.8);bg.addColorStop(0,'#35166b22');bg.addColorStop(1,'#0000');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)

   if(running&&!ended){
    timer-=raw/1000
    opening+=.0019*dt
    const steps=5,step=dt/steps
    for(let s=0;s<steps;s++){
     active.vy+=.000012*step
     active.x+=active.vx*step;active.y+=active.vy*step
     collideFrozen()
     const dx=active.x-cx,dy=active.y-cy,d=Math.hypot(dx,dy),limit=r-active.r
     if(d>=limit){
      const nx=dx/Math.max(d,.0001),ny=dy/Math.max(d,.0001),ang=Math.atan2(ny,nx)
      if(openingHit(ang)&&(active.vx*nx+active.vy*ny)>0){
       ended=true;burst(active.x,active.y,'#fff',110);burst(active.x,active.y,'#7c3cff',80);playNote()
      }else{
       active.x=cx+nx*limit;active.y=cy+ny*limit
       const vn=active.vx*nx+active.vy*ny
       if(vn>0){active.vx-=2*vn*nx;active.vy-=2*vn*ny;burst(cx+nx*limit,cy+ny*limit,'#00e5ff',16);playNote()}
      }
     }
    }
    if(timer<=0)freeze()
    trail.push({x:active.x,y:active.y});if(trail.length>100)trail.shift()
   }

   ctx.save();ctx.shadowBlur=35;ctx.shadowColor='#00e5ff';ctx.strokeStyle='#00e5ff35';ctx.lineWidth=12;ctx.beginPath();ctx.arc(cx,cy,r+4,0,Math.PI*2);ctx.stroke();ctx.restore()
   ctx.strokeStyle='#00e5ffbb';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke()
   ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.lineCap='round';ctx.shadowBlur=20;ctx.shadowColor='#fff';ctx.beginPath();ctx.arc(cx,cy,r,opening-Math.PI*.15,opening+Math.PI*.15);ctx.stroke();ctx.restore()

   for(let i=1;i<trail.length;i++){const a=i/trail.length;ctx.globalAlpha=a*.5;ctx.strokeStyle=i%2?'#7c3cff':'#00e5ff';ctx.lineWidth=1+a*5;ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke()}ctx.globalAlpha=1

   for(const b of frozen){ctx.save();ctx.shadowBlur=22;ctx.shadowColor='#9be7ff';ctx.fillStyle='#a9bbc8';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#e9fcff';ctx.lineWidth=1.5;ctx.stroke();ctx.restore()}
   if(!ended){ctx.save();ctx.shadowBlur=35;ctx.shadowColor='#ff3cac';ctx.fillStyle='#ff3cac';ctx.beginPath();ctx.arc(active.x,active.y,active.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(active.x-active.r*.28,active.y-active.r*.3,active.r*.2,0,Math.PI*2);ctx.fill();ctx.restore()}

   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 30px Space Grotesk, sans-serif';ctx.fillStyle='#fff';ctx.shadowBlur=20;ctx.shadowColor='#7c3cff';ctx.fillText(ended?'ESCAPED':Math.ceil(Math.max(timer,0)).toString(),cx,cy);ctx.shadowBlur=0;ctx.font='600 7px DM Sans,sans-serif';ctx.fillStyle='#ffffff66';ctx.fillText(ended?'SESSION COMPLETE':'FREEZE TIMER',cx,cy+25)

   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.life-=.02*dt;if(p.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.shadowBlur=12;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1
   raf=requestAnimationFrame(frame)
  }
  canvas.addEventListener('pointerdown',audioOn)
  raf=requestAnimationFrame(frame)
  return()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize);canvas.removeEventListener('pointerdown',audioOn)}
 },[running,seed])

 const reset=()=>setSeed(s=>s+1)
 const record=()=>{
  const c=canvasRef.current;if(!c)return
  if(recording){recorder.current?.stop();return}
  const stream=c.captureStream(60),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'
  const r=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});chunks.current=[]
  r.ondataavailable=e=>e.data.size&&chunks.current.push(e.data)
  r.onstop=()=>{const u=URL.createObjectURL(new Blob(chunks.current,{type:mime}));const a=document.createElement('a');a.href=u;a.download=`hypnorai-musical-${seed}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);setRecording(false)}
  recorder.current=r;r.start();setRecording(true)
 }

 return <main className="app-shell">
  <header className="topbar"><div className="brand"><span className="brand-mark">✦</span> HYPNORAI <small>STUDIO</small></div><div className="top-status"><span className="status-dot"/> MUSICAL PHYSICS ENGINE <span className="top-divider"/> V3.0</div></header>
  <section className="workspace">
   <div className="preview-column"><div className="preview-head"><div><span className="live-dot"/> LIVE CANVAS · 9:16</div><button className="ghost-btn" onClick={()=>setRunning(v=>!v)}>{running?'Ⅱ Pause':'▶ Play'}</button></div>
    <div className="canvas-wrap"><canvas ref={canvasRef}/><div className="preview-meta"><span>MUSICAL BOUNCING BALL</span><span>SEED {seed.toString().padStart(3,'0')}</span></div><div className="corner corner-tl"/><div className="corner corner-tr"/><div className="corner corner-bl"/><div className="corner corner-br"/></div>
   </div>
   <aside className="controls"><div className="eyebrow">HYPNORAI / MUSICAL PHYSICS</div><h1>Make them<br/><em>watch.</em></h1><p className="intro">Spawn déterministe, freeze à zéro, collisions continues avec les boules figées et une note à chaque impact.</p>
    <div className="control-group"><div className="section-title">Mechanics <span>01</span></div><div className="template-card"><div className="template-icon">◉</div><div><strong>Musical Bouncing Ball</strong><span>5s freeze · solid obstacles · rotating exit</span></div></div></div>
    <div className="control-group"><div className="section-title">Physics <span>02</span></div><div className="mode-grid"><div className="mode-card active"><div className="mode-icon">1</div><div><strong>Same spawn</strong><span>same origin + vector</span></div></div><div className="mode-card active"><div className="mode-icon">∞</div><div><strong>Circle collision</strong><span>continuous substeps</span></div></div></div></div>
    <div className="toggles"><button className="toggle on"><span/> Audio <b>ADSR</b></button><button className="toggle on"><span/> Particles <b>ON</b></button></div>
    <div className="actions"><button className="generate" onClick={reset}><span>✦</span> New session <kbd>SPACE</kbd></button><button className={recording?'record recording':'record'} onClick={record}><span/> {recording?'Stop & download':'Record video'}</button></div>
    <div className="microcopy">V3.0 · deterministic spawn · continuous circle collision · Web Audio ADSR · WebM</div>
   </aside>
  </section>
 </main>
}

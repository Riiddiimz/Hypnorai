class ArcadeMode {
constructor(sim,id){this.sim=sim;this.id=id;this.ownsPhysics=true;this.ownsSpawning=true;this.name=({accumulation:"Accumulation",multiply:"Multiply",battleLines:"Battle Lines",lines:"Lines",paint:"Paint",target:"Target",grow:"Grow",shatter:"Shatter",colorMatch:"Color Match",portal:"Portal"})[id];this.color="#00f2fe";this.radius=0;this.age=0;this.points=[];this.frozen=[];this.segments=[];this.portals=[];this.covered=0;this.battle=[];this.gapSizeDeg=42;this.gapAngleDeg=30;this.freezeInterval=5;this.ballSpeed=5.4;this.spawnPerBounce=1;this.initialBalls=2;this.radiusScale=1;this.ballCount=6;this.startingLines=5;this.wallLineGain=3;this.battleSpeed=4;this.lineSpreadDeg=7;this.hitCooldown={};}
applySettings(s={}){Object.assign(this,s)} setTargetDuration(){} setupRings(){this.updateGeometry();this.age=0;this.points=[];this.frozen=[];this.segments=[];this.portals=[];this.battle=[];this.covered=0;this.hitCooldown={};}
updateGeometry(){this.cx=this.sim.center.x;this.cy=this.sim.center.y;const baseRadius=Math.max(65,this.sim.boundaryRadius-22);this.radius=Math.max(45,baseRadius*(this.id==="multiply"?this.radiusScale:1))}
initializeBalls(){this.updateGeometry();if(this.id==="battleLines"){for(let i=0;i<this.ballCount;i++){let a=i*Math.PI*2/this.ballCount;this.battle.push({x:this.cx+Math.cos(a)*this.radius*.4,y:this.cy+Math.sin(a)*this.radius*.4,vx:Math.cos(a+1)*this.battleSpeed,vy:Math.sin(a+1)*this.battleSpeed,lines:this.startingLines,hue:i*360/this.ballCount,alive:true,r:this.sim.ballRadius})}this.syncBattle();return}
let a=this.sim.prng.random()*Math.PI*2;this.angle=a;this.active=new Ball(this.cx,this.cy,Math.cos(a)*this.ballSpeed,Math.sin(a)*this.ballSpeed,this.sim.ballRadius,Math.floor(this.sim.prng.random()*360));this.sim.balls=[this.active];if(this.id==="multiply"){for(let i=1;i<this.initialBalls;i++){const q=this.sim.prng.random()*Math.PI*2;const offset=18+Math.floor(i/6)*this.sim.ballRadius*2;this.sim.spawnBall(this.cx+Math.cos(q)*offset,this.cy+Math.sin(q)*offset,Math.cos(q)*this.ballSpeed,Math.sin(q)*this.ballSpeed,Math.floor(this.sim.prng.random()*360));}}
if(this.id==="target")for(let i=0;i<12;i++)this.segments.push({a:i*Math.PI/6,alive:true,n:i+1});
if(this.id==="shatter"||this.id==="colorMatch")for(let i=0;i<24;i++)this.segments.push({a:i*Math.PI/12,hp:2,alive:true,hue:i%6*60});
if(this.id==="portal")this.portals=[{a:0,h:180,n:0,alive:true},{a:Math.PI,h:180,n:0,alive:true},{a:Math.PI/2,h:300,n:0,alive:true},{a:-Math.PI/2,h:300,n:0,alive:true}];}
syncBattle(){this.sim.balls=this.battle.filter(b=>b.alive).map(s=>{let b=new Ball(s.x,s.y,s.vx,s.vy,s.r,s.hue);b.state=s;return b})}
reflect(b,nx,ny){let d=b.vx*nx+b.vy*ny;if(d>0){b.vx=(b.vx-2*d*nx)*this.sim.bounciness;b.vy=(b.vy-2*d*ny)*this.sim.bounciness}}
diff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
bounce(b,dx,dy,d){let nx=dx/(d||1),ny=dy/(d||1);b.x=this.cx+nx*(this.radius-b.radius);b.y=this.cy+ny*(this.radius-b.radius);this.reflect(b,nx,ny);this.sim.totalBounces++}
update(dt){if(this.sim.isVictory)return;this.updateGeometry();if(this.id==="battleLines"){this.updateBattle(dt);return}if(this.id==="multiply"){this.updateMultiply(dt);return}if(this.id==="accumulation"){this.age+=dt/60;if(this.age>=this.freezeInterval&&this.active){const oldBall=this.active;this.frozen.push({x:oldBall.x,y:oldBall.y,r:oldBall.radius,h:oldBall.hue});this.active=new Ball(this.cx,this.cy,Math.cos(this.angle)*5.4,Math.sin(this.angle)*5.4,this.sim.ballRadius,Math.floor(this.sim.prng.random()*360));this.sim.balls=[this.active];this.age=0}}let b=this.active;if(!b)return;for(let k=0;k<6;k++){let step=dt/6;b.vy+=this.sim.gravity*step;b.x+=b.vx*step;b.y+=b.vy*step;let dx=b.x-this.cx,dy=b.y-this.cy,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);if(d>=this.radius-b.radius){if(this.id==="accumulation"&&Math.abs(this.diff(a,this.gapAngleDeg*Math.PI/180))<this.gapSizeDeg*Math.PI/360&&d>this.radius+b.radius*.2){this.sim.triggerVictory();return}this.bounce(b,dx,dy,d);

if(this.id==="lines")this.points.push({x:b.x,y:b.y,h:b.hue});
if(this.id==="paint"){this.points.push({x:b.x,y:b.y,h:this.points.length*3%360});if(this.points.length>1500)this.points.shift();this.covered=Math.min(100,this.points.length/15)}
if(this.id==="grow")b.radius=Math.min(b.radius+.35,this.radius*.35);
if(this.id==="target"){let s=this.segments.find(s=>s.alive&&Math.abs(this.diff(a,s.a))<.3);if(s&&s.n===this.segments.filter(x=>!x.alive).length+1)s.alive=false;if(this.segments.every(s=>!s.alive))this.sim.triggerVictory()}
if(this.id==="shatter"||this.id==="colorMatch"){let s=this.segments.find(s=>s.alive&&Math.abs(this.diff(a,s.a))<.13);if(s&&(this.id==="shatter"||Math.floor(b.hue/60)===Math.floor(s.hue/60))){s.hp--;if(!s.hp)s.alive=false;if(this.segments.every(s=>!s.alive))this.sim.triggerVictory()}if(this.id==="colorMatch")b.hue=(b.hue+60)%360}
if(this.id==="portal"){let p=this.portals.find(p=>p.alive&&Math.abs(this.diff(a,p.a))<.22);if(p){let t=this.portals.find(q=>q!==p&&q.alive&&q.h===p.h);if(t){p.n++;t.n++;b.x=this.cx+Math.cos(t.a)*(this.radius-b.radius-8);b.y=this.cy+Math.sin(t.a)*(this.radius-b.radius-8);if(p.n>=3){p.alive=false;t.alive=false}}}else this.bounce(b,dx,dy,d);if(this.portals.every(p=>!p.alive))this.sim.triggerVictory()}

}
for(let f of this.frozen){let x=b.x-f.x,y=b.y-f.y,d=Math.hypot(x,y);if(d<b.radius+f.r&&d>.001){let nx=x/d,ny=y/d;b.x=f.x+nx*(b.radius+f.r);b.y=f.y+ny*(b.radius+f.r);const dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx=(b.vx-2*dot*nx)*this.sim.bounciness;b.vy=(b.vy-2*dot*ny)*this.sim.bounciness;this.sim.totalBounces++}}}
}}
updateMultiply(dt){
  const balls=this.sim.balls;
  // Movement and rebounds on the circle never create balls.
  for(const b of [...balls]){
   b.vy+=this.sim.gravity*dt;
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   const dx=b.x-this.cx,dy=b.y-this.cy,d=Math.hypot(dx,dy);
   if(d>=this.radius-b.radius)this.bounce(b,dx,dy,d);
  }
  // Multiply only when two balls physically collide.
  const collisionCount=balls.length;
  for(let i=0;i<collisionCount;i++){
   for(let j=i+1;j<collisionCount;j++){
    const a=balls[i],b=balls[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.radius+b.radius;
    if(d<=0||d>=min)continue;
    const nx=dx/d,ny=dy/d;
    const closing=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
    // Separate overlapping balls so a single contact cannot trigger repeatedly.
    const overlap=min-d;
    a.x-=nx*overlap/2;a.y-=ny*overlap/2;
    b.x+=nx*overlap/2;b.y+=ny*overlap/2;
    if(closing<=0)continue;
    a.vx-=closing*nx;a.vy-=closing*ny;
    b.vx+=closing*nx;b.vy+=closing*ny;
    for(let k=0;k<this.spawnPerBounce;k++){
     const angle=Math.atan2((a.vy+b.vy)/2,(a.vx+b.vx)/2)+(k%2===0?Math.PI/2:-Math.PI/2);
     const hue=(a.hue+(k+1)*55)%360;
     this.sim.spawnBall((a.x+b.x)/2+Math.cos(angle)*(min+2),(a.y+b.y)/2+Math.sin(angle)*(min+2),Math.cos(angle)*this.ballSpeed,Math.sin(angle)*this.ballSpeed,hue);
    }
   }
  }
 }
updateBattle(dt){
 const alive=this.battle.filter(b=>b.alive);
 for(const b of alive){
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  const x=b.x-this.cx,y=b.y-this.cy,d=Math.hypot(x,y);
  if(d>this.radius-b.r){const nx=x/(d||1),ny=y/(d||1);b.x=this.cx+nx*(this.radius-b.r);b.y=this.cy+ny*(this.radius-b.r);this.reflect(b,nx,ny);b.lines+=this.wallLineGain;}
 }
 // Collisions between balls are elastic and do not consume lines.
 for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){
  const a=alive[i],b=alive[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
  if(d>0&&d<min){const nx=dx/d,ny=dy/d,rel=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
   if(rel>0){a.vx-=rel*nx;a.vy-=rel*ny;b.vx+=rel*nx;b.vy+=rel*ny;}
   const overlap=(min-d)/2;a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
  }
 }
 // A ball touching another ball's radial line removes one line, at most once per contact.
 for(const ball of alive)for(const owner of alive){
  if(owner===ball||owner.lines<=0)continue;
  const ang=Math.atan2(owner.y-this.cy,owner.x-this.cx);
  for(let k=0;k<owner.lines;k++){
   const aa=ang+(k-(owner.lines-1)/2)*(this.lineSpreadDeg*Math.PI/180);
   const ex=this.cx+Math.cos(aa)*this.radius,ey=this.cy+Math.sin(aa)*this.radius;
   const vx=ex-owner.x,vy=ey-owner.y,t=Math.max(0,Math.min(1,((ball.x-owner.x)*vx+(ball.y-owner.y)*vy)/(vx*vx+vy*vy||1)));
   const px=owner.x+vx*t,py=owner.y+vy*t,key=owner.hue+":"+k+":"+ball.hue;
   const touching=Math.hypot(ball.x-px,ball.y-py)<ball.r+1;
   if(touching&&!this.hitCooldown[key]){owner.lines--;this.hitCooldown[key]=true;break;}
   if(!touching)this.hitCooldown[key]=false;
  }
 }
 for(const b of alive)if(b.lines<=0)b.alive=false;
 this.syncBattle();if(this.battle.filter(b=>b.alive).length===1)this.sim.triggerVictory();
}
handleCollision(){}
render(ctx){this.updateGeometry();ctx.save();ctx.shadowColor=this.color;ctx.shadowBlur=this.sim.visualStyle==="minimal"?0:this.sim.glowIntensity*(this.sim.visualStyle==="soft"?3:8);ctx.strokeStyle=this.color;ctx.lineWidth=3;ctx.beginPath();if(this.id==="accumulation"){const ga=this.gapAngleDeg*Math.PI/180,gh=this.gapSizeDeg*Math.PI/360;ctx.arc(this.cx,this.cy,this.radius,ga+gh,ga-gh+Math.PI*2);}else ctx.arc(this.cx,this.cy,this.radius,0,Math.PI*2);ctx.stroke();
if(this.id==="lines")for(let p of this.points){ctx.beginPath();ctx.moveTo(this.cx,this.cy);ctx.lineTo(p.x,p.y);ctx.strokeStyle="hsla("+p.h+",100%,65%,.4)";ctx.stroke()}
if(this.id==="paint"){for(let p of this.points){ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle="hsl("+p.h+",100%,60%)";ctx.fill()}ctx.fillStyle="#fff";ctx.font="bold 16px monospace";ctx.fillText("Couverture "+Math.round(this.covered)+"%",this.cx,this.cy+this.radius+25)}
for(let s of this.segments){if(!s.alive)continue;ctx.beginPath();ctx.arc(this.cx,this.cy,this.radius,s.a-.12,s.a+.12);ctx.strokeStyle=this.id==="target"?"#facc15":this.id==="colorMatch"?"hsl("+s.hue+",100%,60%)":"#fb923c";ctx.lineWidth=8;ctx.stroke();if(this.id==="target"){ctx.fillStyle="#fff";ctx.font="bold 12px monospace";ctx.fillText(s.n,this.cx+Math.cos(s.a)*(this.radius-15),this.cy+Math.sin(s.a)*(this.radius-15))}}
for(let p of this.portals)if(p.alive){ctx.beginPath();ctx.arc(this.cx+Math.cos(p.a)*this.radius,this.cy+Math.sin(p.a)*this.radius,12,0,Math.PI*2);ctx.fillStyle="hsl("+p.h+",100%,60%)";ctx.fill()}
for(let f of this.frozen){ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,Math.PI*2);ctx.fillStyle="hsl("+f.h+",100%,60%)";ctx.fill()}
if(this.id==="battleLines")for(let b of this.battle)if(b.alive){let a=Math.atan2(b.y-this.cy,b.x-this.cx);for(let i=0;i<b.lines;i++){let q=a+(i-(b.lines-1)/2)*(this.lineSpreadDeg*Math.PI/180);ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(this.cx+Math.cos(q)*this.radius,this.cy+Math.sin(q)*this.radius);ctx.strokeStyle="hsl("+b.hue+",100%,65%)";ctx.stroke()}ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle="hsl("+b.hue+",100%,60%)";ctx.fill()}
ctx.restore()}
}
window.ArcadeMode=ArcadeMode;
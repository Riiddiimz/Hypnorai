class FreezeCircleMode {
    constructor(sim) {
        this.sim=sim; this.id='freezeCircle'; this.name='Freeze Circle';
        this.ownsPhysics=true; this.ownsSpawning=true;
        this.ringRadiusRatio=.72; this.gapSizeDeg=42; this.gapAngleDeg=-90;
        this.positionX=0; this.positionY=0; this.ballSpeed=5.2; this.freezeInterval=5;
        this.ring=null; this.frozenBalls=[]; this.activeBall=null; this.activeAge=0;
        this.spawnAngle=0; this.totalFrozen=0; this.escaped=false;
    }
    applySettings(s={}) { Object.assign(this,s); }
    setTargetDuration(){}
    setupRings(reset=true) {
        this.updateGeometry();
        if(reset){this.frozenBalls=[];this.activeBall=null;this.activeAge=0;this.totalFrozen=0;this.escaped=false;}
    }
    updateGeometry() {
        this.ring={cx:this.sim.center.x+(this.positionX/100)*this.sim.boundaryRadius,
                   cy:this.sim.center.y+(this.positionY/100)*this.sim.boundaryRadius,
                   radius:Math.max(55,this.sim.boundaryRadius*this.ringRadiusRatio)};
    }
    initializeBalls() {
        this.updateGeometry(); this.frozenBalls=[]; this.totalFrozen=0; this.activeAge=0; this.escaped=false;
        this.spawnAngle=this.sim.prng.random()*Math.PI*2; this.spawnNextBall();
    }
    spawnNextBall() {
        if(this.escaped||this.sim.isVictory)return;
        const b=new Ball(this.ring.cx,this.ring.cy,Math.cos(this.spawnAngle)*this.ballSpeed,
                         Math.sin(this.spawnAngle)*this.ballSpeed,this.sim.ballRadius,
                         Math.floor(this.sim.prng.random()*360));
        b.isFrozen=false; this.activeBall=b; this.activeAge=0; this.sim.balls=[b];
    }
    freezeActiveBall() {
        if(!this.activeBall||this.escaped)return;
        const b=this.activeBall;
        this.frozenBalls.push({x:b.x,y:b.y,radius:b.radius,hue:b.hue});
        this.totalFrozen++; b.vx=0; b.vy=0; b.isFrozen=true; this.activeBall=null; this.spawnNextBall();
    }
    isInsideGap(a) {
        const c=this.gapAngleDeg*Math.PI/180;
        return Math.abs(Math.atan2(Math.sin(a-c),Math.cos(a-c))) <= this.gapSizeDeg*Math.PI/360;
    }
    reflect(b,nx,ny) {
        const d=b.vx*nx+b.vy*ny;
        if(d<0){b.vx=(b.vx-2*d*nx)*this.sim.bounciness;b.vy=(b.vy-2*d*ny)*this.sim.bounciness;}
    }
    update(dtScale) {
        if(this.escaped||this.sim.isVictory||!this.activeBall)return;
        const sub=8,step=dtScale/sub;
        for(let s=0;s<sub;s++){
            const b=this.activeBall;if(!b)break;
            b.x+=b.vx*step;b.y+=b.vy*step;
            for(const f of this.frozenBalls){
                let dx=b.x-f.x,dy=b.y-f.y,d=Math.hypot(dx,dy),min=b.radius+f.radius;
                if(d<min){
                    d=Math.max(d,.001);const nx=dx/d,ny=dy/d;
                    b.x+=nx*(min-d+.15);b.y+=ny*(min-d+.15);this.reflect(b,nx,ny);this.sim.totalBounces++;
                }
            }
            const dx=b.x-this.ring.cx,dy=b.y-this.ring.cy,d=Math.hypot(dx,dy),boundary=this.ring.radius-b.radius,a=Math.atan2(dy,dx);
            if(d>=boundary){
                if(this.isInsideGap(a)){
                    if(d>=this.ring.radius+b.radius*.35){this.escaped=true;this.sim.triggerVictory();return;}
                }else{
                    const nx=dx/Math.max(d,.001),ny=dy/Math.max(d,.001);
                    b.x=this.ring.cx+nx*boundary;b.y=this.ring.cy+ny*boundary;
                    this.reflect(b,-nx,-ny);this.sim.totalBounces++;
                }
            }
        }
        this.activeAge+=dtScale/60;
        if(this.activeAge>=this.freezeInterval)this.freezeActiveBall();
    }
    handleCollision(){}
    render(ctx) {
        if(!this.ring)return;
        const cx=this.ring.cx,cy=this.ring.cy,r=this.ring.radius,g=this.gapSizeDeg*Math.PI/180,c=this.gapAngleDeg*Math.PI/180;
        ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,c+g/2,c-g/2+Math.PI*2);
        ctx.strokeStyle='rgba(0,242,254,.95)';ctx.lineWidth=5;ctx.shadowColor='rgba(0,242,254,.65)';ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;
        for(const f of this.frozenBalls){ctx.beginPath();ctx.arc(f.x,f.y,f.radius,0,Math.PI*2);ctx.fillStyle='hsl('+f.hue+',100%,62%)';ctx.fill();}
        ctx.font='600 12px monospace';ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.42)';
        ctx.fillText('Balles figées : '+this.totalFrozen,cx,cy+r+28);ctx.restore();
    }
}
window.FreezeCircleMode=FreezeCircleMode;

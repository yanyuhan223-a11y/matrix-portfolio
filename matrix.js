(() => {
  'use strict';
  const canvas=document.createElement('canvas');canvas.className='matrix-rain';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const button=document.createElement('button');button.className='motion-toggle';button.type='button';document.body.append(button);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduced.matches,frame=0,last=0,elapsed=0,w=0,h=0,dpr=1,mx=0,my=0,tx=0,ty=0;
  const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/:{}';
  const cover=document.getElementById('home');
  const visual=cover.querySelector('.matrix-visual');
  const portrait=cover.querySelector('.matrix-portrait');
  const monitor=cover.querySelector('.monitor-effects');
  const screen=monitor.getContext('2d');
  const person=cover.querySelector('.mx-person-img');
  const scene=cover.querySelector('.mx-scene');
  const rim=cover.querySelector('.mx-rim');
  const motionBtn=cover.querySelector('.mx-motion');
  let tilted=false;
  let maskData=null,maskW=0,maskH=0,maskBox=null,live=0,liveTarget=0;
  let cw=0,ch=0;
  // Screen bounds are in source-image coordinates; the foreground face is excluded.
  const screens=[
    [.014,.05,.16,.29],[.216,.05,.157,.29],
    [.01,.446,.164,.29],[.213,.445,.16,.29],
    [.012,.837,.157,.163],[.213,.837,.09,.163],
    [.906,.045,.094,.29],[.91,.447,.09,.29],[.933,.839,.067,.161]
  ];
  function paintMonitors(){
    if(!screen||!portrait.complete||!portrait.naturalWidth||cover.hidden)return;
    screen.setTransform(dpr,0,0,dpr,0,0);screen.clearRect(0,0,cw,ch);
    const iw=portrait.naturalWidth,ih=portrait.naturalHeight;
    const scale=Math.max(cw/iw,ch/ih);
    const position=cw<=650?.64:cw<=900?.57:.5;
    const ox=(cw-iw*scale)*position,oy=(ch-ih*scale)*.5;
    const t=elapsed/1000;
    screens.forEach(([nx,ny,nw,nh],i)=>{
      const x=ox+nx*iw*scale,y=oy+ny*ih*scale,sw=nw*iw*scale,sh=nh*ih*scale;
      if(x+sw<0||x>cw)return;
      const near=Math.max(0,1-Math.hypot((tx+.5)*cw-x-sw/2,(ty+.5)*ch-y-sh/2)/300);
      screen.save();screen.beginPath();screen.roundRect(x,y,sw,sh,12*scale);screen.clip();
      screen.fillStyle=`rgba(120,238,160,${.012+.014*(1+Math.sin(t*.8+i))+near*.04})`;screen.fillRect(x,y,sw,sh);
      screen.fillStyle='rgba(0,15,5,.17)';
      for(let line=0;line<sh;line+=4)screen.fillRect(x,y+line,sw,1);
      const scan=(t*.14+i*.19)%1;
      screen.fillStyle=`rgba(164,255,196,${.09+near*.12})`;screen.fillRect(x,y+scan*sh,sw,2);
      screen.fillStyle='rgba(118,227,145,.06)';screen.fillRect(x,y+scan*sh-12,sw,12);
      screen.font='10px monospace';screen.fillStyle=`rgba(164,255,183,${.2+near*.25})`;
      for(let row=0;row<5;row++){
        const yy=y+((t*24+row*31+i*11)%sh);
        screen.fillText(String((i*173+row*71+Math.floor(t*3))%10000).padStart(4,'0'),x+sw-34,yy);
      }
      // A short low-amplitude tracking slip stays inside each television.
      const phase=(t+i*.71)%9;
      if(!paused&&phase<.17){
        const sy=ny*ih+nh*ih*.43,band=ih*.012;
        screen.globalAlpha=.45;
        screen.drawImage(portrait,nx*iw,sy,nw*iw,band,x+Math.sin(t*21)*5,y+sh*.43,sw,band*scale);
      }
      screen.restore();
    });
  }
  // The supplied transparent artwork provides the silhouette and surface relief.
  // Moving glyphs are sampled in that surface, rather than sliding a flat overlay.
  const choice=document.querySelector('.matrix-choice');
  const stage=choice.querySelector('.choice-stage');
  const hands=choice.querySelector('.choice-hands');
  const flow=document.createElement('canvas');flow.className='choice-hand-flow';flow.setAttribute('aria-hidden','true');stage.insertBefore(flow,hands.nextSibling);
  const surface=flow.getContext('2d');
  let relief=null,reliefReadable=false,fw=0,fh=0;
  const mw=512,mh=220;
  const atlas=document.createElement('canvas');atlas.width=16*16;atlas.height=24;
  const ink=atlas.getContext('2d');ink.font='17px monospace';ink.textAlign='center';ink.fillStyle='#55ff69';
  const digits='010123456789<>/:';
  for(let i=0;i<16;i++)ink.fillText(digits[i],i*16+8,18);
  function buildRelief(){
    if(!hands.complete||!hands.naturalWidth)return;
    try{
      const map=document.createElement('canvas');map.width=mw;map.height=mh;
      const m=map.getContext('2d',{willReadFrequently:true});m.drawImage(hands,0,0,mw,mh);
      const pixels=m.getImageData(0,0,mw,mh);
      for(let i=0;i<pixels.data.length;i+=4){
        const a=pixels.data[i+3]/255;
        const green=Math.max(0,pixels.data[i+1]-Math.max(pixels.data[i],pixels.data[i+2])*.65)*a;
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=green;pixels.data[i+3]=255;
      }
      m.putImageData(pixels,0,0);
      const smooth=document.createElement('canvas');smooth.width=mw;smooth.height=mh;
      const sm=smooth.getContext('2d',{willReadFrequently:true});sm.filter='blur(2px)';sm.drawImage(map,0,0);
      relief=sm.getImageData(0,0,mw,mh).data;
      reliefReadable=true;
    }catch(error){
      // file:// pages cannot read pixels from local images. CSS masks still
      // provide the exact silhouette; this analytical relief supplies volume.
      reliefReadable=false;
    }
    stage.classList.add('flow-ready');resizeHands();start();
  }
  function resizeHands(){
    if(choice.hidden)return;
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height)return;
    fw=width;fh=height;
    const pixelWidth=Math.round(fw*dpr),pixelHeight=Math.round(fh*dpr);
    if(flow.width!==pixelWidth||flow.height!==pixelHeight){flow.width=pixelWidth;flow.height=pixelHeight;}
  }
  function depth(x,y){
    if(!reliefReadable){
      const center=x<mw/2?112:400;
      const u=(x-center)/82,v=(y-104)/76;
      const palm=Math.exp(-(u*u*.75+v*v));
      const fingerRidges=.12*Math.sin(x*.19+y*.055)+.08*Math.sin(y*.31);
      return Math.max(.08,Math.min(.9,.24+palm*.52+fingerRidges));
    }
    const xx=Math.max(0,Math.min(mw-1,Math.floor(x))),yy=Math.max(0,Math.min(mh-1,Math.floor(y)));
    return relief[(yy*mw+xx)*4]/255;
  }
  function paintHands(){
    // When opened through file://, browser security blocks image pixel reads.
    // depth() already has an analytical fallback, so a missing relief bitmap
    // must not stop the animated waterfall from being drawn.
    if(!surface||!fw||choice.hidden)return;
    surface.setTransform(dpr,0,0,dpr,0,0);surface.clearRect(0,0,fw,fh);
    const t=elapsed/1000,step=fw<700?3.4:2.8,sx=fw/mw,sy=fh/mh;
    // Each column is a continuous waterfall. Relief bends its trajectory and
    // compresses the characters across the palm bowl and finger ridges.
    for(let x=8;x<mw-8;x+=step){
      const col=Math.floor(x/step),speed=13+(col*7%13),shift=(t*speed)%4.4;
      for(let y=8+shift;y<mh-8;y+=4.4){
        const z=depth(x,y);if(z<.045)continue;
        const dx=depth(x+3,y)-depth(x-3,y),dy=depth(x,y+3)-depth(x,y-3);
        const px=x+dx*8,py=y+z*4;
        if(depth(px,py)<.04)continue;
        const phase=((y-t*speed*1.7+col*19.7)%83+83)%83;
        const pulse=Math.pow(1-phase/83,3);
        const alpha=Math.min(.94,(.28+z*2.5)*(.48+pulse*1.2));
        surface.globalAlpha=alpha;
        const glyph=(col*7+Math.floor((y-shift)/4.4)*3+Math.floor(t*5))%16;
        surface.save();surface.translate(px*sx,py*sy);surface.transform(1,dy*.35,dx*.7,1,0,0);
        const size=(2.6+z*1.9)*sx;
        surface.drawImage(atlas,glyph*16,0,16,24,-size*.5,-size*.75,size,size*1.5);
        surface.restore();
      }
    }
    surface.globalAlpha=1;
  }
  hands.addEventListener('load',buildRelief);if(hands.complete)buildRelief();
  // Hidden routes have no layout. Initialize after the stage acquires its actual
  // desktop/mobile size, including panel resizing without a window resize event.
  const handResize=new ResizeObserver(()=>{resizeHands();paintHands();start();});
  handResize.observe(stage);
  const choiceVisibility=new MutationObserver(()=>{if(!choice.hidden){resizeHands();paintHands();start();}});
  choiceVisibility.observe(choice,{attributes:true,attributeFilter:['hidden']});
  function label(){cover.classList.toggle('title-motion-paused',paused);button.textContent=paused?'▶':'Ⅱ';button.setAttribute('aria-label',paused?'播放背景动效':'暂停背景动效');button.title=button.getAttribute('aria-label');button.setAttribute('aria-pressed',String(paused));}
  // Rain follows the section palette: green on the cover / pill screen,
  // red inside commercial work, blue inside personal work.
  const RAIN={'':['202,255,214','81,210,114'],red:['255,208,198','230,74,54'],blue:['208,230,255','70,146,238']};
  function paint(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const choosing=!choice.hidden;
    const pal=RAIN[document.body.dataset.pal||'']||RAIN[''];
    const cell=choosing?(w<600?18:21):(w<600?20:24), rows=Math.ceil(h/cell)+24,loop=elapsed%24000/24000;
    ctx.font='13px monospace';ctx.textAlign='center';
    for(let col=0;col<Math.ceil(w/cell);col++){
      const speed=col%3+1,head=(loop*rows*speed+col*17.73)%rows;
      const bend=Math.sin(col*.16+loop*Math.PI*2)*mx*12;
      for(let j=0;j<20;j++){
        const y=((head-j+rows)%rows-10)*cell;
        const alpha=(1-j/20)*(col%4===0?.85:.45);
        ctx.fillStyle=choosing?`rgba(40,245,91,${alpha*(j===0?1:.8)})`:`rgba(${pal[j===0?0:1]},${alpha})`;
        const index=(col*13+j*7+Math.floor(loop*48))%chars.length;
        ctx.fillText(chars[index],col*cell+bend,y);
      }
    }
  }
  // ---- portrait layer: alpha mask for hover hit-testing + rim placement ----
  function buildPersonMask(){
    if(!person||!person.complete||!person.naturalWidth)return;
    maskW=Math.min(190,person.naturalWidth);
    maskH=Math.max(1,Math.round(maskW*person.naturalHeight/person.naturalWidth));
    const c=document.createElement('canvas');c.width=maskW;c.height=maskH;
    const g=c.getContext('2d',{willReadFrequently:true});if(!g)return;
    g.drawImage(person,0,0,maskW,maskH);
    try{maskData=g.getImageData(0,0,maskW,maskH).data;}catch(err){maskData=null;return;}
    let x0=maskW,y0=maskH,x1=0,y1=0;
    for(let y=0;y<maskH;y++)for(let x=0;x<maskW;x++){
      if(maskData[(y*maskW+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    }
    maskBox=x1>x0?[x0/maskW,y0/maskH,(x1-x0)/maskW,(y1-y0)/maskH]:null;
  }
  function personFit(){
    const iw=(person&&person.naturalWidth)||1,ih=(person&&person.naturalHeight)||1;
    const scale=Math.max(cw/iw,ch/ih);
    const position=cw<=650?.64:cw<=900?.57:.5;
    return {iw:iw,ih:ih,scale:scale,ox:(cw-iw*scale)*position,oy:(ch-ih*scale)*.5};
  }
  function placeRim(){
    if(!rim||!person||!person.currentSrc)return;
    const url='url("'+person.currentSrc+'")';
    if(rim.dataset.src===url)return;
    rim.dataset.src=url;rim.style.webkitMaskImage=url;rim.style.maskImage=url;
  }
  function onPerson(px,py){
    if(!maskData)return false;
    const f=personFit();
    const u=(px-f.ox)/(f.iw*f.scale),v=(py-f.oy)/(f.ih*f.scale);
    if(u<0||u>=1||v<0||v>=1)return false;
    const x=Math.min(maskW-1,Math.floor(u*maskW)),y=Math.min(maskH-1,Math.floor(v*maskH));
    return maskData[(y*maskW+x)*4+3]>60;
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    const dt=Math.min(now-last,60);last=now;
    if(!paused)elapsed+=dt;
    mx+=(tx-mx)*.06;my+=(ty-my)*.06;
    live+=(liveTarget-live)*.09;
    cover.style.setProperty('--matrix-x',mx*6+'px');cover.style.setProperty('--matrix-y',my*4+'px');
    if(visual){
      const secs=elapsed/1000,idle=paused?0:1;
      const bob=Math.sin(secs*.55)*idle,sway=Math.sin(secs*.31+1.1)*idle;
      const px=mx*2,py=my*2,set=(k,v)=>visual.style.setProperty(k,v);
      const amp=tilted?34:26,ampY=tilted?22:12;
      set('--px',(px*amp+sway*2.6).toFixed(2)+'px');
      set('--py',(py*ampY-bob*2.1).toFixed(2)+'px');
      set('--sry',(px*3.1+sway*.24).toFixed(2)+'deg');
      set('--srx',(-py*2+bob*-.18).toFixed(2)+'deg');
      set('--live',live.toFixed(3));
    }
    paint();paintHands();
    if(!cover.hidden)paintMonitors();
    if(!paused)frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
  function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);if(!cover.hidden){cw=visual.clientWidth;ch=visual.clientHeight;monitor.width=Math.round(cw*dpr);monitor.height=Math.round(ch*dpr);}resizeHands();paint();paintHands();paintMonitors();if(!maskData)buildPersonMask();placeRim();start();}
  button.addEventListener('click',()=>{paused=!paused;label();start();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;label();start();});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;start();});
  cover.addEventListener('pointermove',e=>{
    if(paused)return;
    const r=cover.getBoundingClientRect();
    tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;
    if(!visual)return;
    const v=visual.getBoundingClientRect();
    liveTarget=onPerson(e.clientX-v.left,e.clientY-v.top)?1:0;
    visual.classList.toggle('live-on',liveTarget===1);
  },{passive:true});
  cover.addEventListener('pointerleave',()=>{tx=ty=0;liveTarget=0;if(visual)visual.classList.remove('live-on');});
  if(person){
    person.addEventListener('load',()=>{buildPersonMask();placeRim();});
    if(person.complete)buildPersonMask();
  }
  // touch devices have no pointer: tilt drives the planes.
  // deviceorientation = gyroscope attitude, devicemotion = accelerometer (gravity vector).
  (() => {
    if(!matchMedia('(hover:none)').matches)return;
    const DO=window.DeviceOrientationEvent,DM=window.DeviceMotionEvent;
    if(!DO&&!DM)return;
    let baseB=null,baseG=null,baseAX=null,baseAY=null,gotGyro=false;
    const clamp=v=>Math.max(-.5,Math.min(.5,v));
    const lerp=(a,b,k)=>a+(b-a)*k;
    const gyro=e=>{
      if(paused||e.beta==null&&e.gamma==null)return;
      gotGyro=true;tilted=true;
      const b=e.beta||0,g=e.gamma||0;
      if(baseB===null){baseB=b;baseG=g;}
      baseB=lerp(baseB,b,.0025);baseG=lerp(baseG,g,.0025);
      tx=clamp((g-baseG)/26*.5);ty=clamp((b-baseB)/26*.5);
    };
    const accel=e=>{
      if(paused||gotGyro)return;
      const a=e.accelerationIncludingGravity;if(!a)return;
      tilted=true;
      if(baseAX===null){baseAX=a.x||0;baseAY=a.y||0;}
      baseAX=lerp(baseAX,a.x||0,.0025);baseAY=lerp(baseAY,a.y||0,.0025);
      tx=clamp(-((a.x||0)-baseAX)/5*.5);ty=clamp(((a.y||0)-baseAY)/5*.5);
    };
    const attach=()=>{
      if(DO)addEventListener('deviceorientation',gyro,{passive:true});
      if(DM)addEventListener('devicemotion',accel,{passive:true});
      if(motionBtn)motionBtn.hidden=true;
    };
    const needsGesture=(DO&&typeof DO.requestPermission==='function')||(DM&&typeof DM.requestPermission==='function');
    const ask=()=>{
      const jobs=[];
      if(DO&&typeof DO.requestPermission==='function')jobs.push(DO.requestPermission());
      if(DM&&typeof DM.requestPermission==='function')jobs.push(DM.requestPermission());
      Promise.all(jobs).then(r=>{if(r.every(v=>v==='granted'))attach();}).catch(()=>{});
    };
    if(needsGesture){
      if(motionBtn){motionBtn.hidden=false;motionBtn.addEventListener('click',ask);}
      cover.addEventListener('touchstart',ask,{once:true,passive:true});
    }else attach();
  })();
  portrait.addEventListener('load',resize);
  window.addEventListener('hashchange',resize);
  window.addEventListener('resize',resize);label();resize();
})();

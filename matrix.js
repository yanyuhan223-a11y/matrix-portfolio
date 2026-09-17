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
  function paint(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const choosing=!choice.hidden;
    const cell=choosing?(w<600?18:21):(w<600?20:24), rows=Math.ceil(h/cell)+24,loop=elapsed%24000/24000;
    ctx.font='13px monospace';ctx.textAlign='center';
    for(let col=0;col<Math.ceil(w/cell);col++){
      const speed=col%3+1,head=(loop*rows*speed+col*17.73)%rows;
      const bend=Math.sin(col*.16+loop*Math.PI*2)*mx*12;
      for(let j=0;j<20;j++){
        const y=((head-j+rows)%rows-10)*cell;
        const alpha=(1-j/20)*(col%4===0?.85:.45);
        ctx.fillStyle=choosing?`rgba(40,245,91,${alpha*(j===0?1:.8)})`:(j===0?`rgba(202,255,214,${alpha})`:`rgba(81,210,114,${alpha})`);
        const index=(col*13+j*7+Math.floor(loop*48))%chars.length;
        ctx.fillText(chars[index],col*cell+bend,y);
      }
    }
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    const dt=Math.min(now-last,60);last=now;
    if(!paused)elapsed+=dt;
    mx+=(tx-mx)*.06;my+=(ty-my)*.06;
    cover.style.setProperty('--matrix-x',mx*14+'px');cover.style.setProperty('--matrix-y',my*9+'px');
    paint();paintHands();
    if(!cover.hidden)paintMonitors();
    if(!paused)frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
  function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);if(!cover.hidden){cw=visual.clientWidth;ch=visual.clientHeight;monitor.width=Math.round(cw*dpr);monitor.height=Math.round(ch*dpr);}resizeHands();paint();paintHands();paintMonitors();start();}
  button.addEventListener('click',()=>{paused=!paused;label();start();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;label();start();});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;start();});
  cover.addEventListener('pointermove',e=>{if(paused)return;const r=cover.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;},{passive:true});
  cover.addEventListener('pointerleave',()=>{tx=ty=0;});
  portrait.addEventListener('load',resize);
  window.addEventListener('hashchange',resize);
  window.addEventListener('resize',resize);label();resize();
})();

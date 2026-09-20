(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=null;
  document.addEventListener('click',event=>{
    const link=event.target.closest('a.pill-choice,a.collection-portal');
    if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||reduced.matches)return;
    if(active){event.preventDefault();return;}
    const destination=link.hash;if(!destination||destination===location.hash)return;
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
    event.preventDefault();canvas.className='matrix-transit';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
    // The decoding rain is a full-screen loading beat: hide every cursor on it.
    document.body.classList.add('transit');document.body.classList.remove('shot');
    const blue=link.classList.contains('pill-blue'),rgb=blue?'35,145,255':'255,78,18';
    let w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2),frame=0,committed=false,readyAt=0,forceReveal=false;
    const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    const smooth=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);};
    function resize(){w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;}
    resize();window.addEventListener('resize',resize);
    const start=performance.now();
    function navigate(){if(committed)return;committed=true;location.hash=destination;}
    function finish(){cancelAnimationFrame(frame);clearTimeout(fallback);window.removeEventListener('resize',resize);document.removeEventListener('keydown',skip);window.removeEventListener('hashchange',changed);canvas.remove();document.body.classList.remove('transit');active=null;}
    function skip(e){if(e.key==='Escape'){navigate();finish();}}
    function changed(){if(location.hash!==destination)finish();}
    const fallback=setTimeout(()=>{navigate();forceReveal=true;},3000);
    active=canvas;document.addEventListener('keydown',skip);window.addEventListener('hashchange',changed);
    function draw(now){
      const elapsed=(now-start)/1000,entry=Math.min(elapsed/.85,1);
      if(elapsed>.72)navigate();
      if(committed&&!readyAt){
        const visibleGallery=document.querySelector('.gallery-page:not([hidden])');
        if(forceReveal||!visibleGallery||visibleGallery.classList.contains('archive-ready'))readyAt=now+(blue?180:0);
      }
      const reveal=readyAt?smooth(0,.46,(now-readyAt)/1000):0;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      // Smoothly cover the old page before changing routes; reveal the new page
      // through staggered falling digit columns, without a flash or central title.
      // Reach a fully opaque frame before the hash route mutates the page.
      // Hold that frame while the destination lays out, then reveal it once.
      const cover=smooth(0,.34,elapsed)*(1-reveal);
      ctx.fillStyle=`rgba(0,3,2,${cover})`;ctx.fillRect(0,0,w,h);
      ctx.textAlign='center';ctx.textBaseline='middle';
      for(let layer=0;layer<3;layer++){
        const spacing=[19,43,105][layer],count=Math.ceil(w/spacing)+2;
        for(let col=0;col<count;col++){
          const seed=col+layer*113,depth=noise(seed+1),delay=noise(seed+9)*.16;
          const opacity=smooth(delay,delay+.2,entry)*(1-reveal);
          if(opacity<.005)continue;
          const size=[10,21,45][layer]*(.7+depth*.9),step=size*1.2;
          const x=col*spacing+(noise(seed+7)-.5)*spacing;
          const offset=noise(seed+4)*h+(now-start)*(.13+depth*.28)*(layer+1);
          ctx.font=`${layer===2?500:400} ${size}px ui-monospace, monospace`;
          ctx.shadowBlur=layer===2?24:layer===1?16:10;ctx.shadowColor=`rgba(${rgb},.9)`;
          const rows=Math.ceil(h/step)+2;
          for(let row=0;row<rows;row++){
            const y=((row*step+offset)%(h+2*step))-step;
            const band=(row+Math.floor(offset/step))%15;
            if(band>10)continue;
            const tail=1-band/13,alpha=opacity*tail*[.14,.28,.4][layer];
            ctx.fillStyle=`rgba(${rgb},${alpha})`;
            const digit=Math.floor(noise(seed*71+row*3+Math.floor((now-start)/(95+depth*90)))*10);
            ctx.fillText(String(digit),x,y);
          }
        }
      }
      ctx.shadowBlur=0;
      if(reveal>=1){finish();return;}frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
  });
})();

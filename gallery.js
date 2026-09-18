(() => {
  'use strict';
  // Asset files are replaced in place during portfolio editing. Give each page
  // load a fresh URL so updated cover artwork appears without stale cache.
  const assetVersion=Date.now().toString(36);
  const freshAsset=src=>src&&src.startsWith('assets/')?`${src}?v=${assetVersion}`:src;
  const companies = [
    {id:'bytedance',name:'ByteDance',years:'2023 — 2026',role:'AI 内容设计 · Agent · 影像玩法'},
    {id:'bondee',name:'BONDEE',years:'2022 — 2023',role:'社交空间 · 角色资产 · 创作者生态'},
    {id:'meitu',name:'Meitu',years:'2021 — 2022',role:'AR 影像 · 妆容效果 · 视觉设计'},
    {id:'other',name:'Independent',years:'SELECTED EXPERIMENTS',role:'独立产品 · Coding · Art'}
  ];
  const projects = [];
  const shell = document.createElement('main'); shell.id='portfolio-app';
  const archive = document.createElement('div'); archive.hidden=true;
  const original = [...document.body.children];
  let company = null;
  for (const node of original) {
    if (node.matches('.chapter')) { company=companies.find(c=>c.id===node.id); archive.append(node); continue; }
    if (node.matches('.fx,.row') && company) {
      const heading=node.querySelector('h2,h3');
      const id=node.id || company.id+'-'+(projects.filter(p=>p.company===company.id).length+1);
      const page=document.createElement('section');page.className='project-page';page.hidden=true;page.tabIndex=-1;
      const title=(heading?.textContent||'项目').replace(/↗︎?/g,'').trim();
      const img=node.querySelector('img');
      const project={id,title,company:company.id,page,image:img?.getAttribute('src'),summary:node.querySelector('.one,.tx,li')?.textContent.trim()||company.role};
      projects.push(project);page.append(node);shell.append(page);
    } else if(node.matches('.deep') && projects.length) { projects.at(-1).page.append(node); }
    else if(node.matches('.hero,.stats,.foot,.row')) { archive.append(node); }
  }
  document.body.append(archive,shell);
  // Display artwork is independent of every image inside the original case study.
  const conceptCovers={
    'featured':'display-featured',
    'bytedance-2':'glitch-evaluation','bytedance-3':'glitch-film',
    'bytedance-4':'display-bytedance-4','bytedance-5':'glitch-music',
    'bytedance-6':'display-bytedance-6',
    'bondee-1':'display-bondee-1','bondee-2':'display-bondee-2','bondee-3':'display-bondee-3',
    'meitu-1':'display-meitu-1','meitu-2':'display-meitu-2','meitu-3':'display-meitu-3',
    'stockpulse':'display-stockpulse','arcana':'display-arcana',
    'other-3':'display-other-3','other-4':'display-other-4'
  };
  projects.forEach(p=>{if(conceptCovers[p.id]){p.displayCover='assets/'+conceptCovers[p.id]+'.png';p.concept=true;}});
  const profile=document.createElement('section');profile.className='profile-page';profile.hidden=true;
  [...archive.children].filter(n=>n.matches('.hero,.stats,.foot')||n.id==='profile'||n.matches('.tkonly')).forEach(n=>profile.append(n));
  shell.append(profile);
  const cover=document.getElementById('home');
  cover.innerHTML=`<div class="matrix-visual"><picture class="matrix-picture"><source media="(max-width: 900px) and (orientation: portrait)" srcset="${freshAsset('assets/matrix-monitor-cover-mobile.png')}"><img class="matrix-portrait" src="${freshAsset('assets/matrix-monitor-cover.jpeg')}" alt="墨镜人物与绿色 CRT 电视墙"></picture><canvas class="monitor-effects" aria-hidden="true"></canvas></div><div class="matrix-top"><span>V / 颜于涵</span><span>AI DESIGNER · 2026</span></div><div class="matrix-heading"><p><i></i>IMAGERY / SYSTEMS / EXPERIMENTS</p><h1 data-text="VIVIENNE" aria-label="VIVIENNE PORTFOLIO 2026">VIVIENNE<span>PORTFOLIO_2026</span></h1></div><nav class="matrix-nav" aria-label="封面导航"><a href="#about">ABOUT</a><span>AI_CONTENT_DESIGN / IMAGERY / INTERACTION</span><a href="mailto:798287301@qq.com">CONTACT ↗</a></nav>`;
  const coverTitle=cover.querySelector('.matrix-heading h1');
  coverTitle.removeAttribute('data-text');
  coverTitle.innerHTML='<a class="matrix-title-link" href="#choose" aria-label="点击 VIVIENNE 进入作品集"><span class="terminal-title-line" aria-hidden="true"><span class="terminal-title-text">VIVIENNE</span><i class="terminal-title-cursor">_</i></span><span class="terminal-subtitle-line" aria-hidden="true"><span class="terminal-subtitle-text">PORTFOLIO_2026</span><i class="terminal-subtitle-cursor">_</i></span><span class="terminal-click-hint" aria-hidden="true"><b>&gt;</b><span class="terminal-hint-idle"> CLICK_VIVIENNE_TO_ENTER</span><span class="terminal-hint-active"> EXECUTE ./PORTFOLIO</span><i>_</i></span></a>';
  const choice=document.createElement('section');
  choice.className='matrix-choice';choice.hidden=true;choice.setAttribute('aria-label','项目入口');choice.tabIndex=-1;
  choice.innerHTML=`<header class="choice-top"><a href="#home" aria-label="返回作品集封面">V / 颜于涵</a><span>PORTFOLIO · SELECT YOUR PATH</span><a href="#home">[ ← 返回封面 ]</a></header>
    <div class="choice-stage"><img class="choice-hands" src="${freshAsset('assets/matrix-choice-hands2.png')}" alt="两只由绿色数字代码构成、掌心向上的手" fetchpriority="high">
      <a class="pill-choice pill-red" href="#work/commercial" aria-label="选择红色药丸，进入商业项目"><span class="pill-aura" aria-hidden="true"></span><span class="pill-capsule" aria-hidden="true"><i></i></span><span class="choice-label"><small>01 / RED PILL</small><strong>商业项目 <b>↗</b></strong><em>Commercial projects</em></span></a>
      <a class="pill-choice pill-blue" href="#work/other" aria-label="选择蓝色药丸，进入个人项目"><span class="pill-aura" aria-hidden="true"></span><span class="pill-capsule" aria-hidden="true"><i></i></span><span class="choice-label"><small>02 / BLUE PILL</small><strong>个人项目 <b>↗</b></strong><em>Personal experiments</em></span></a>
    </div><footer class="choice-bottom"><span>CONNECTED_ <i class="terminal-dot"></i></span><span class="choice-hint">HOVER TO ROTATE / CLICK TO ENTER</span><span>VIVIENNE / 2026</span></footer>`;
  shell.prepend(choice);
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  choice.querySelectorAll('.pill-choice').forEach(pill=>{
    pill.addEventListener('pointermove',event=>{
      if(motionPreference.matches||event.pointerType==='touch')return;
      const rect=pill.getBoundingClientRect();
      pill.style.setProperty('--tilt',((event.clientX-rect.left)/rect.width-.5)*20+'deg');
    },{passive:true});
    pill.addEventListener('pointerleave',()=>pill.style.setProperty('--tilt','0deg'));
  });
  const matrixScript=document.createElement('script');matrixScript.src='matrix.js?v=pill-float-1';document.body.append(matrixScript);
  const gallery=document.createElement('section');gallery.className='gallery-page';gallery.hidden=true;
  gallery.innerHTML='<header class="gallery-header"><a class="gallery-home" href="#home" aria-label="返回首页">V.</a><nav class="collection-tabs" aria-label="作品分类"><a href="#work/bytedance" data-collection="commercial">商业项目 <span>Commercial</span></a><a href="#work/other" data-collection="personal">个人作品 <span>Personal</span></a></nav><nav class="company-tabs" aria-label="公司与作品类型"></nav></header><h1 class="gallery-accessible-title">Vivienne 精选项目</h1><div class="project-grid"></div><footer class="gallery-footer"><a href="#about">Vivienne / 颜于涵</a><span class="company-caption"></span><a href="mailto:798287301@qq.com">Contact ↗</a></footer>';
  shell.prepend(gallery);
  gallery.querySelector('.collection-tabs').remove();
  gallery.querySelector('.gallery-home').href='#choose';
  gallery.querySelector('.gallery-home').setAttribute('aria-label','返回药丸选择页');
  const collectionIntro=document.createElement('div');collectionIntro.className='collection-intro';
  collectionIntro.innerHTML='<p class="collection-code"></p><h1></h1><span class="collection-description"></span>';
  gallery.querySelector('.gallery-header').prepend(collectionIntro);
  function makePortal(personal){
    const portal=document.createElement('a');portal.className='collection-portal '+(personal?'pill-red':'pill-blue');
    portal.href=personal?'#work/commercial':'#work/other';
    portal.innerHTML='<span class="portal-copy"><small>CONTINUE EXPLORING_</small><strong>'+(personal?'进入商业项目':'进入个人项目')+' ↗</strong><em>'+(personal?'COMMERCIAL ARCHIVE':'PERSONAL EXPERIMENTS')+'</em></span><span class="pill-capsule" aria-hidden="true"><i></i></span>';
    return portal;
  }
  const galleryPortal=makePortal(false);gallery.querySelector('.gallery-footer').before(galleryPortal);
  const tabs=gallery.querySelector('.company-tabs');
  const personalCategories=[{id:'other',name:'All Works'},{id:'coding',name:'Product & Coding'},{id:'motion',name:'Moving Image'},{id:'art',name:'Fine Art'}];
  const personalType=p=>p.id==='stockpulse'||p.id==='arcana'?'coding':p.id==='other-3'?'motion':'art';
  let lastCollection='bytedance';
  const nav=document.createElement('nav');nav.className='app-nav';nav.setAttribute('aria-label','页面导航');
  nav.innerHTML='<a href="#home" class="app-brand">Vivienne<span> / PORTFOLIO</span></a><a class="app-back" href="#work/bytedance">返回项目</a><a href="#about">About</a><a href="mailto:798287301@qq.com">Contact</a>';
  document.body.prepend(nav);
  const grid=gallery.querySelector('.project-grid');
  // --- BONDEE unified stage -------------------------------------------------
  // The three cover tiles are replaced by one integrated scene: figures cut out
  // of the original artwork, composited at their source positions over a live
  // code-rain canvas. Percentages come from the cut-out bounding boxes.
  const bondeeFigures=[
    {i:1,id:'bondee-1',title:'\u4e2a\u4eba\u7a7a\u95f4 \u00b7 \u5f62\u8c61\u8d44\u4ea7\u4f53\u7cfb',en:'PERSONAL SPACE / AVATAR SYSTEM',x:0,y:0,w:33.688,h:72.904},
    {i:2,id:'bondee-2',title:'\u521b\u4f5c\u8005\u5e73\u53f0 \u00b7 UGC \u5185\u5bb9\u4f9b\u7ed9',en:'CREATOR PLATFORM / UGC SUPPLY',x:22.731,y:6.926,w:55.192,h:93.074},
    {i:3,id:'bondee-3',title:'\u4ea7\u54c1\u89c6\u89c9\u54c1\u724c\u5851\u9020',en:'PRODUCT BRAND VISUAL',x:56.582,y:6.561,w:43.418,h:60.510}
  ];
  const bondeeStage=document.createElement('section');
  bondeeStage.className='code-stage bondee-stage';bondeeStage.hidden=true;bondeeStage.dataset.collection='bondee';
  bondeeStage.setAttribute('aria-label','BONDEE \u4e09\u4e2a\u9879\u76ee\u5165\u53e3');
  const bdRain=document.createElement('canvas');bdRain.className='bd-rain';bdRain.setAttribute('aria-hidden','true');
  const bdCast=document.createElement('div');bdCast.className='bd-cast';
  const bdTags=document.createElement('div');bdTags.className='bd-tags';
  bondeeFigures.forEach(f=>{
    const a=document.createElement('a');a.className='bd-fig';a.href='#project/'+f.id;a.dataset.i=f.i;
    a.setAttribute('aria-label',f.title);
    a.style.cssText='--x:'+f.x+'%;--y:'+f.y+'%;--w:'+f.w+'%;--h:'+f.h+'%';
    const img=document.createElement('img');img.src=freshAsset('assets/bondee/figure-'+f.i+'.png');
    img.alt='';img.draggable=false;a.append(img);bdCast.append(a);
    const tag=document.createElement('span');tag.className='bd-tag';tag.dataset.i=f.i;
    tag.style.cssText='--cx:'+(f.x+f.w/2).toFixed(2)+'%';
    tag.innerHTML='<small>'+String(f.i).padStart(2,'0')+'</small><strong>'+f.title+'</strong><em>'+f.en+'</em>';
    bdTags.append(tag);
  });
  const bdHead=document.createElement('div');bdHead.className='bd-head';
  bdHead.innerHTML='<b>BONDEE</b> / 2022 \u2014 2023 / 3 PROJECTS';
  const bdHint=document.createElement('div');bdHint.className='bd-hint';
  bdHint.textContent='hover a figure_';
  bondeeStage.append(bdRain,bdCast,bdTags,bdHead,bdHint);
  grid.before(bondeeStage);
  // --- ByteDance unified stage ----------------------------------------------
  // The six ByteDance covers collapse into one artwork: the original frame sits
  // underneath (dimmed) with a live code-rain canvas over it, and the six
  // subjects cut out of that artwork are composited back at source position.
  // DOM order is back-to-front, so the small subjects (portrait, scales) come
  // last and win the hit test where boxes overlap. cx/ty anchor the caption on
  // a dark patch of the artwork right below each subject.
  const bytedanceSubjects=[
    {i:3,id:'bytedance-3',title:'成片 Agent',en:'NARRATIVE VIDEO AGENT',x:1.198,y:6.553,w:31.484,h:78.277,cx:12,ty:44},
    {i:5,id:'bytedance-5',title:'AI 音乐',en:'AI MUSIC / NEW YEAR SINGLE',x:69.193,y:13.714,w:29.714,h:73.544,cx:84,ty:87.5},
    {i:1,id:'featured',title:'随变 AI',en:'FEATURED · AI CHARACTER PIPELINE',x:38.75,y:10.012,w:21.328,h:71.784,cx:49.4,ty:85},
    {i:4,id:'bytedance-4',title:'AI 风格化',en:'AI STYLE TRANSFER / PENCIL LOOK',x:1.146,y:54.794,w:9.479,h:27.367,cx:7,ty:83.5},
    {i:2,id:'bytedance-2',title:'模型评测',en:'MODEL EVALUATION / BENCHMARK',x:39.714,y:0.728,w:21.745,h:24.272,cx:36.5,ty:26.5},
    {i:6,id:'bytedance-6',title:'AI 写真',en:'AI PORTRAIT / QINGYAN x DOUYIN',x:67.057,y:44.66,w:7.63,h:22.633,cx:70.8,ty:69}
  ];
  const bytedanceStage=document.createElement('section');
  bytedanceStage.className='code-stage bytedance-stage';bytedanceStage.hidden=true;
  bytedanceStage.dataset.collection='bytedance';bytedanceStage.dataset.cell='11';bytedanceStage.dataset.reach='2';
  bytedanceStage.setAttribute('aria-label','ByteDance 六个项目入口');
  const btBg=document.createElement('img');btBg.className='bd-bg';btBg.src=freshAsset('assets/bytedance/scene-bg.jpg');
  btBg.alt='';btBg.draggable=false;btBg.setAttribute('aria-hidden','true');
  const btRain=document.createElement('canvas');btRain.className='bd-rain';btRain.setAttribute('aria-hidden','true');
  const btCast=document.createElement('div');btCast.className='bd-cast';
  const btList=document.createElement('nav');btList.className='bt-list';btList.setAttribute('aria-label','ByteDance 项目列表');
  bytedanceSubjects.forEach(s=>{
    const a=document.createElement('a');a.className='bd-fig';a.href='#project/'+s.id;a.dataset.i=s.i;
    a.setAttribute('aria-label',s.title);
    a.style.cssText='--x:'+s.x+'%;--y:'+s.y+'%;--w:'+s.w+'%;--h:'+s.h+'%';
    const img=document.createElement('img');img.src=freshAsset('assets/bytedance/subject-'+s.i+'.png');
    img.alt='';img.draggable=false;a.append(img);btCast.append(a);
  });
  bytedanceSubjects.forEach(s=>{
    const tag=document.createElement('span');tag.className='bd-tag at';tag.dataset.i=s.i;
    tag.style.cssText='--cx:'+s.cx+'%;--ty:'+s.ty+'%';
    tag.innerHTML='<small>'+String(s.i).padStart(2,'0')+'</small><strong>'+s.title+'</strong><em>'+s.en+'</em>';
    btCast.append(tag);
  });
  [...bytedanceSubjects].sort((a,b)=>a.i-b.i).forEach(s=>{
    const a=document.createElement('a');a.href='#project/'+s.id;
    a.innerHTML='<small>'+String(s.i).padStart(2,'0')+'</small><strong>'+s.title+'</strong>';
    a.addEventListener('click',()=>{sessionStorage.setItem('portfolio-collection','bytedance');});
    btList.append(a);
  });
  const btHead=document.createElement('div');btHead.className='bd-head';
  btHead.innerHTML='<b>ByteDance</b> / 2023 — 2026 / 6 PROJECTS';
  const btHint=document.createElement('div');btHint.className='bd-hint';
  btHint.textContent='hover a subject_';
  bytedanceStage.append(btBg,btRain,btCast,btHead,btHint,btList);
  grid.before(bytedanceStage);
  function layoutArchive(){
    if(!grid.clientWidth)return;
    const mobile=innerWidth<=700,w=grid.clientWidth;
    const slots=mobile?[[46,0,50,.8],[1,120,38,1],[55,390,42,.8],[2,510,47,1.25],[48,750,50,1],[1,880,38,1.25]]:[[43,0,27,.8],[4,95,24,1],[76,150,22,.8],[18,510,29,1.25],[58,610,32,1],[7,880,27,1.25]];
    const scale=w/(mobile?400:1000);let bottom=0;
    [...grid.children].forEach((tile,i)=>{
      const [x,y,width,ratio]=slots[i%6],top=(y+Math.floor(i/6)*(mobile?1160:1250))*scale;
      tile.style.setProperty('--tile-x',x+'%');tile.style.setProperty('--tile-y',top+'px');tile.style.setProperty('--tile-width',width+'%');tile.style.setProperty('--tile-ratio',ratio);
      const label=tile.querySelector('.tile-label');
      bottom=Math.max(bottom,top+w*width/100/ratio+(label?.offsetHeight||55));
    });
    grid.style.setProperty('--archive-height',Math.ceil(bottom+35)+'px');
  }
  window.addEventListener('resize',layoutArchive);
  function renderCompany(id){
    gallery.classList.remove('archive-ready');
    const personal=personalCategories.some(c=>c.id===id);
    const c=personal?companies[3]:companies.find(c=>c.id===id)||companies[0];
    const allCommercial=id==='commercial';
    lastCollection=personal?id:allCommercial?'commercial':c.id;
    gallery.dataset.collection=personal?'personal':'commercial';
    gallery.querySelectorAll('.collection-tabs a').forEach(a=>{const active=a.dataset.collection===gallery.dataset.collection;a.classList.toggle('active',active);a.setAttribute('aria-current',active?'page':'false');});
    tabs.replaceChildren();
    (personal?personalCategories:[{id:'commercial',name:'All Work'},...companies.slice(0,3)]).forEach(item=>{const a=document.createElement('a');a.href='#work/'+item.id;a.textContent=item.name;tabs.append(a);});
    tabs.querySelectorAll('a').forEach(a=>{const active=a.hash==='#work/'+lastCollection;a.classList.toggle('active',active);a.setAttribute('aria-current',active?'page':'false');});
    gallery.querySelector('.company-caption').textContent=personal?'PERSONAL / INDEPENDENT':allCommercial?'COMMERCIAL / SELECTED WORK':c.years+' / '+c.role;
    collectionIntro.querySelector('.collection-code').textContent=personal?'02 / BLUE PILL / PERSONAL':'01 / RED PILL / COMMERCIAL';
    collectionIntro.querySelector('h1').textContent=personal?'Personal experiments.':'Selected commercial work.';
    collectionIntro.querySelector('.collection-description').textContent=personal?'个人项目 / 产品、影像与艺术实验':'商业项目 / 工作中的设计与实践';
    const portalContent=makePortal(personal);galleryPortal.className=portalContent.className;galleryPortal.href=portalContent.href;galleryPortal.innerHTML=portalContent.innerHTML;
    grid.replaceChildren();
    const bondeeTab=!personal&&!allCommercial&&c.id==='bondee';
    bondeeStage.hidden=!bondeeTab;
    const bytedanceTab=!personal&&!allCommercial&&c.id==='bytedance';
    bytedanceStage.hidden=!bytedanceTab;
    let list=projects.filter(p=>personal?p.company==='other'&&(id==='other'||personalType(p)===id):allCommercial?p.company!=='other':p.company===c.id);
    if(bondeeTab||bytedanceTab)list=[];         // the stage IS the collection page
    else if(allCommercial){
      // collapse each unified stage's entries into one group tile, keeping archive order
      const at=list.findIndex(p=>p.company==='bondee');
      if(at>=0){
        list=list.filter(p=>p.company!=='bondee');
        list.splice(at,0,{id:'bondee',title:'BONDEE',
          summary:'\u4e2a\u4eba\u7a7a\u95f4 / \u521b\u4f5c\u8005\u5e73\u53f0 / \u54c1\u724c\u89c6\u89c9 \u00b7 \u4e09\u4e2a\u9879\u76ee',
          displayCover:'assets/display-bondee-2.png',href:'#work/bondee'});
      }
      const bd=list.findIndex(p=>p.company==='bytedance');
      if(bd>=0){
        list=list.filter(p=>p.company!=='bytedance');
        list.splice(bd,0,{id:'bytedance',title:'ByteDance',
          summary:'随变 AI / 模型评测 / 成片 Agent / 风格化 / AI 音乐 / AI 写真 · 六个项目',
          displayCover:'assets/bytedance/scene-cover.jpg',href:'#work/bytedance'});
      }
    }
    list.forEach((p,i)=>{
      const a=document.createElement('a');a.className='project-tile';a.href=p.href||'#project/'+p.id;a.style.setProperty('--delay',i*55+'ms');
      a.setAttribute('aria-label',p.title);a.addEventListener('click',()=>{sessionStorage.setItem('portfolio-collection',lastCollection);});
      const media=document.createElement('div');media.className='tile-media';
      const img=document.createElement('img');img.src=freshAsset(p.displayCover||p.image||'assets/interactive-cover.png');img.alt=p.title;img.loading='lazy';media.append(img);
      const number=document.createElement('span');number.className='tile-number';number.textContent=String(i+1).padStart(2,'0');media.append(number);
      if(p.concept){const badge=document.createElement('span');badge.className='tile-concept';badge.textContent='概念封面';media.append(badge);}
      const arrow=document.createElement('span');arrow.className='tile-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');media.append(arrow);
      const label=document.createElement('div');label.className='tile-label';const title=document.createElement('h2');title.textContent=p.title;const detail=document.createElement('p');detail.textContent=p.summary;label.append(title,detail);a.append(media,label);grid.append(a);
      a.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=a.getBoundingClientRect();a.style.setProperty('--rx',((.5-(e.clientY-r.top)/r.height)*7)+'deg');a.style.setProperty('--ry',(((e.clientX-r.left)/r.width-.5)*9)+'deg');});
      a.addEventListener('pointerleave',()=>{a.style.setProperty('--rx','0deg');a.style.setProperty('--ry','0deg');});
    });
    const firstViewImages=[...grid.querySelectorAll('img')].slice(0,4);
    const imagesReady=Promise.allSettled(firstViewImages.map(img=>img.decode?img.decode():new Promise(resolve=>{
      if(img.complete)return resolve();img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});
    })));
    const layoutAssetsReady=Promise.all([imagesReady,document.fonts?.ready||Promise.resolve()]);
    Promise.race([layoutAssetsReady,new Promise(resolve=>setTimeout(resolve,1200))]).then(()=>requestAnimationFrame(()=>{
      layoutArchive();requestAnimationFrame(()=>requestAnimationFrame(()=>gallery.classList.add('archive-ready')));
    }));
  }
  projects.forEach((p,i)=>{
    const foot=document.createElement('nav');foot.className='project-pagination';
    const back=document.createElement('a');back.href='#work/'+p.company;back.textContent='← 返回 '+companies.find(c=>c.id===p.company).name;
    const siblings=projects.filter(item=>(item.company==='other')===(p.company==='other'));
    const next=siblings[(siblings.indexOf(p)+1)%siblings.length];const forward=document.createElement('a');forward.href='#project/'+next.id;forward.textContent='下一个项目：'+next.title+' →';foot.append(back,forward);p.page.append(foot,makePortal(p.company==='other'));
  });
  function route(){
    const [kind,key]=location.hash.slice(1).split('/');
    let current=projects.find(p=>p.id===key);
    cover.hidden=true;choice.hidden=true;gallery.hidden=true;profile.hidden=true;projects.forEach(p=>p.page.hidden=true);
    document.querySelectorAll('video').forEach(v=>v.pause());
    document.body.classList.remove('view-home','view-work','view-project','view-about','view-choice');
    if(kind==='project'&&current){current.page.hidden=false;const saved=sessionStorage.getItem('portfolio-collection');const backId=current.company==='other'&&personalCategories.some(c=>c.id===saved)?saved:current.company;nav.querySelector('.app-back').href='#work/'+backId;current.page.querySelector('.project-pagination a').href='#work/'+backId;document.body.classList.add('view-project');document.title=current.title+' · Vivienne';}
    else if(kind==='choose'){choice.hidden=false;document.body.classList.add('view-choice');document.title='项目入口 · Vivienne';choice.focus({preventScroll:true});}
    else if(kind==='about'||kind==='profile'){profile.hidden=false;document.body.classList.add('view-about');document.title='About · Vivienne';}
    else if(kind==='work'||companies.some(c=>c.id===kind)){renderCompany(key||kind);gallery.hidden=false;document.body.classList.add('view-work');document.title='Selected work · Vivienne';}
    else{cover.hidden=false;document.body.classList.add('view-home');document.title='Vivienne · AI Designer';}
    document.querySelectorAll('#portfolio-app .rv').forEach(n=>n.classList.add('in'));
    window.scrollTo({top:0,behavior:'instant'});
    requestAnimationFrame(()=>{window.dispatchEvent(new Event('resize'));window.scrollTo({top:0,behavior:'instant'});});
    if(current&&!current.page.hidden)current.page.focus({preventScroll:true});
  }
  window.addEventListener('hashchange',route);
  route();
  const capsulesScript=document.createElement('script');capsulesScript.src='matrix-capsules.js?v=pill-float-1';document.body.append(capsulesScript);
  const stageScript=document.createElement('script');stageScript.src='code-stage.js?v=bytedance-unified-1';document.body.append(stageScript);
  const transitScript=document.createElement('script');transitScript.src='matrix-transit.js?v=pill-float-1';document.body.append(transitScript);
})();

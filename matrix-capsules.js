(() => {
  'use strict';
  // Ray-marched solid capsules: the silhouette, surface normals and highlights
  // are recalculated in 3D as the capsule rotates, rather than rotating a flat image.
  const buffer=document.createElement('canvas');buffer.width=240;buffer.height=160;
  const gl=buffer.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  if(!gl)return; // Keep the CSS softgel fallback when WebGL is unavailable.
  const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment=`precision highp float;
    uniform vec2 resolution;uniform vec3 tint;uniform float angle;uniform float lean;
    mat3 rotation(){float c=cos(angle),s=sin(angle),a=cos(lean),b=sin(lean);
      return mat3(c,0.,s,0.,1.,0.,-s,0.,c)*mat3(a,-b,0.,b,a,0.,0.,0.,1.);}
    float shape(vec3 p){p=rotation()*p;p.x-=clamp(p.x,-.46,.46);return length(p)-.33;}
    void main(){
      vec2 uv=(gl_FragCoord.xy/resolution-.5)*vec2(3.4,2.27);
      vec3 ro=vec3(uv,3.5),rd=vec3(0.,0.,-1.);float t=0.;
      for(int i=0;i<64;i++){float d=shape(ro+rd*t);if(d<.001||t>6.)break;t+=d;}
      if(t>6.){gl_FragColor=vec4(0.);return;}
      vec3 p=ro+rd*t;vec2 e=vec2(.001,0.);
      vec3 n=normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));
      vec3 light=normalize(vec3(-.7,1.,1.7)),view=vec3(0.,0.,1.);
      float diffuse=max(dot(n,light),0.);float fresnel=pow(1.-max(dot(n,view),0.),2.7);
      float spec=pow(max(dot(n,normalize(light+view)),0.),70.);
      float soft=pow(max(dot(n,normalize(vec3(.7,-.6,1.3)+view)),0.),28.);
      float core=pow(max(n.z,0.),2.);
      vec3 highlight=mix(vec3(1.,.34,.03),vec3(.3,.62,1.),step(tint.r,tint.b));
      vec3 col=mix(tint,highlight,.3)*(.82+.74*diffuse+.48*core)+highlight*fresnel*1.08+mix(highlight,vec3(1.),.18)*spec*1.65+mix(tint,highlight,.7)*soft*.78;
      // Transparent liquid center, luminous curved shell and bright reflections.
      gl_FragColor=vec4(col,clamp(.4+fresnel*.48+spec*.65+soft*.24,.0,.98));
    }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))return null;return s;}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);if(!vs||!fs)return;
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  gl.useProgram(program);const geometry=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,geometry);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['resolution','tint','angle','lean'].map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.uniform2f(uniforms.resolution,240,160);gl.viewport(0,0,240,160);gl.clearColor(0,0,0,0);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let capsules=[];
  const states=new WeakMap();
  function collect(){capsules=[...document.querySelectorAll('.pill-capsule')];}
  new MutationObserver(collect).observe(document.getElementById('portfolio-app'),{childList:true,subtree:true});collect();
  let last=0;
  function render(time){
    requestAnimationFrame(render);if(time-last<33||document.hidden)return;const dt=Math.min((time-last)/1000,.06);last=time;
    for(const host of capsules){
      const rect=host.getBoundingClientRect();if(!rect.width||rect.bottom<0||rect.top>innerHeight)continue;
      let state=states.get(host);
      if(!state){const canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');if(!ctx)continue;host.append(canvas);host.classList.add('has-3d');state={canvas,ctx,angle:0,lift:0};states.set(host,state);}
      const anchor=host.closest('a'),active=anchor.matches(':hover,:focus-visible');
      if(active&&!reduced.matches)state.angle+=dt*.48;
      state.lift+=((active?1:0)-state.lift)*.08;
      const blue=anchor.classList.contains('pill-blue');
      if(state.phase===undefined)state.phase=blue?2.4:0;
      // Idle drift: a resting capsule keeps bobbing and swaying so it reads as suspended
      // in air rather than pasted on. It fades out as the hover lift takes over.
      const idle=reduced.matches?0:Math.max(0,1-state.lift),seconds=time/1000,phase=state.phase;
      const bob=Math.sin(seconds*.62+phase)*idle,drift=Math.sin(seconds*.37+phase*1.7)*idle;
      const sway=Math.sin(seconds*.45+phase)*.1*idle;
      gl.uniform3f(uniforms.tint,...(blue?[.04,.48,1.]:[1.,.06,.11]));gl.uniform1f(uniforms.angle,state.angle+sway);gl.uniform1f(uniforms.lean,blue?-.43:.58);
      gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);state.ctx.clearRect(0,0,240,160);state.ctx.drawImage(buffer,0,0);
      const stage=host.closest('.choice-stage');
      const liftHeight=stage?Math.min(160,Math.max(72,stage.clientHeight*.23)):40;
      const bobHeight=Math.min(9,Math.max(3.2,liftHeight*.055));
      state.canvas.style.translate=(drift*bobHeight*.45).toFixed(2)+'px '+(-state.lift*liftHeight+bob*bobHeight).toFixed(2)+'px';
    }
  }
  requestAnimationFrame(render);
})();

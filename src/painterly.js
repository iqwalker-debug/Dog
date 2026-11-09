// painterly.js — Watercolor/gouache look for a Three.js dog game
// Drop into Claude Code project. Requires: three (r160+), three/examples/jsm postprocessing.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { N8AOPass } from 'n8ao'; // ambient occlusion (github.com/N8python/n8ao)
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const NOISE = /* glsl */`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
`;

// 1) PAINTERLY POST PASS — Kuwahara brush strokes + paper grain + pigment edges + 4-point sun glints
export const PainterlyShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    time: { value: 0 },
    saturation: { value: 1.15 },
    glint: { value: 1.0 },
    bleed: { value: 0.0 }, // watercolor bleed at hard edges (used by painted stations to blend 3D dogs into the painting)
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float time, saturation, glint, bleed;
    varying vec2 vUv;
    ${NOISE}
    const int R = 4; // brush size; 3 = sharper/faster, 5-6 = more painted/slower

    vec3 kuwahara(vec2 uv, vec2 px){
      vec3 m0=vec3(0),m1=vec3(0),m2=vec3(0),m3=vec3(0);
      vec3 s0=vec3(0),s1=vec3(0),s2=vec3(0),s3=vec3(0);
      for(int j=-R;j<=R;j++) for(int i=-R;i<=R;i++){
        vec3 c = texture2D(tDiffuse, uv + vec2(float(i),float(j))*px).rgb;
        vec3 c2 = c*c;
        if(i<=0 && j<=0){m0+=c;s0+=c2;}
        if(i>=0 && j<=0){m1+=c;s1+=c2;}
        if(i<=0 && j>=0){m2+=c;s2+=c2;}
        if(i>=0 && j>=0){m3+=c;s3+=c2;}
      }
      float n = float((R+1)*(R+1));
      m0/=n; m1/=n; m2/=n; m3/=n;
      vec3 v0=abs(s0/n-m0*m0), v1=abs(s1/n-m1*m1), v2=abs(s2/n-m2*m2), v3=abs(s3/n-m3*m3);
      float a=v0.r+v0.g+v0.b, b=v1.r+v1.g+v1.b, c=v2.r+v2.g+v2.b, d=v3.r+v3.g+v3.b;
      vec3 col = m0; float best = a;
      if(b<best){best=b;col=m1;} if(c<best){best=c;col=m2;} if(d<best){col=m3;}
      return col;
    }

    float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

    void main(){
      vec2 px = 1.0/resolution;
      // wobble UVs slightly so strokes feel hand-made
      vec2 wob = (vec2(noise(vUv*resolution*0.02), noise(vUv*resolution*0.02+7.0))-0.5)*px*2.0;
      vec3 col = kuwahara(vUv + wob, px);

      // pigment pooling at edges (watercolor darkening)
      vec3 gx = texture2D(tDiffuse, vUv+vec2(px.x,0.)).rgb - texture2D(tDiffuse, vUv-vec2(px.x,0.)).rgb;
      vec3 gy = texture2D(tDiffuse, vUv+vec2(0.,px.y)).rgb - texture2D(tDiffuse, vUv-vec2(0.,px.y)).rgb;
      float edge = length(gx)+length(gy);
      col *= 1.0 - smoothstep(0.08, 0.6, edge)*0.22;

      // wet-into-wet bleed: at hard edges, let the colors run into each other a few pixels
      if (bleed > 0.0) {
        vec3 run = (texture2D(tDiffuse, vUv+px*vec2( 2.5, 0.)).rgb + texture2D(tDiffuse, vUv-px*vec2( 2.5, 0.)).rgb
                  + texture2D(tDiffuse, vUv+px*vec2(0., 2.5)).rgb + texture2D(tDiffuse, vUv-px*vec2(0., 2.5)).rgb
                  + texture2D(tDiffuse, vUv+px*vec2( 1.8, 1.8)).rgb + texture2D(tDiffuse, vUv-px*vec2( 1.8, 1.8)).rgb) / 6.0;
        col = mix(col, run, smoothstep(0.15, 0.55, edge) * bleed);
      }

      // 4-point star glints on very bright pixels (sun on water)
      float g = 0.0;
      for(int k=1;k<=10;k++){
        float f = float(k)*3.0;
        float fall = 1.0 - float(k)/11.0;
        g += (step(0.93, luma(texture2D(tDiffuse, vUv+vec2(f*px.x,0.)).rgb))
            + step(0.93, luma(texture2D(tDiffuse, vUv-vec2(f*px.x,0.)).rgb))
            + step(0.93, luma(texture2D(tDiffuse, vUv+vec2(0.,f*px.y)).rgb))
            + step(0.93, luma(texture2D(tDiffuse, vUv-vec2(0.,f*px.y)).rgb))) * fall*fall;
      }
      col += vec3(1.0,0.97,0.88) * g * 0.06 * glint;

      // saturation + warm summer grade
      float l = luma(col);
      col = mix(vec3(l), col, saturation);
      col *= vec3(1.03, 1.0, 0.95);

      // cold-press paper grain (multiply)
      float paper = noise(vUv*resolution*0.45)*0.5 + noise(vUv*resolution*0.09)*0.5;
      col *= mix(0.92, 1.04, paper);

      // soft vignette
      vec2 q = vUv-0.5; col *= 1.0 - dot(q,q)*0.35;

      gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
    }`,
};

// 2) RIVERBED MATERIAL — limestone with animated caustics (the gold light net in your art)
export function makeRiverbedMaterial(baseColor = new THREE.Color('#b9a55a')) {
  const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.95 });
  mat.userData.uniforms = { uTime: { value: 0 } };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = mat.userData.uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime; varying vec3 vWPos;
        float caustic(vec2 p, float t){
          // bounded interference net: bright thin lines where waves cancel
          vec2 q = p; float c = 0.0;
          for(int n=0;n<3;n++){
            q += vec2(sin(q.y*1.3 + t), cos(q.x*1.1 - t*0.8)) * 0.6;
            c += abs(sin(q.x*2.0) * sin(q.y*2.0));
          }
          c = clamp(c / 3.0, 0.0, 1.0);
          return pow(1.0 - c, 6.0);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float cs = caustic(vWPos.xz*0.6, uTime*0.6);
        totalEmissiveRadiance += vec3(1.0,0.9,0.55) * cs * 0.9;`);
  };
  return mat;
}

// 3) WATER SURFACE — clear turquoise, fresnel, see-through to the bed
export function makeWaterMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#3fa79a', transmission: 0.85, roughness: 0.08, thickness: 1.5,
    ior: 1.33, attenuationColor: new THREE.Color('#1f7f74'), attenuationDistance: 2.5,
    transparent: true, opacity: 0.9,
  });
}

// 4) RENDERER + COMPOSER, tuned for 4K @ 60fps with dynamic resolution
export function createPainterlyRenderer(canvas) {
  const capture = new URLSearchParams(location.search).has('capture'); // for screenshots
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: capture });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const forced = parseFloat(new URLSearchParams(location.search).get('scale'));
  let scale = forced > 0 ? forced : 0.75; // internal render scale; paint filter hides upscaling
  const composer = new EffectComposer(renderer);
  const painterly = new ShaderPass(PainterlyShader);

  function setup(scene, camera) {
    composer.passes.length = 0;
    const useAO = new URLSearchParams(location.search).get('ao') !== '0'; // ?ao=0 turns it off
    if (useAO) {
      const ao = new N8AOPass(scene, camera, Math.max(1, innerWidth), Math.max(1, innerHeight));
      Object.assign(ao.configuration, { aoRadius: 1.6, distanceFalloff: 1.0, intensity: 2.6, gammaCorrection: false, halfRes: true });
      ao.configuration.color = new THREE.Color('#2b2416'); // warm umber shadows, like pigment
      ao.setQualityMode('Medium');
      composer.addPass(ao);
    } else composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new OutputPass()); // tone map + sRGB first, so we paint in display colors
    composer.addPass(painterly);
    resize();
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2) * scale;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    painterly.uniforms.resolution.value.set(w * dpr, h * dpr);
  }
  window.addEventListener('resize', resize);

  // dynamic resolution: holds 60fps by trading internal pixels
  let acc = 0, frames = 0;
  function render(dt) {
    painterly.uniforms.time.value += dt;
    composer.render(dt);
    acc += dt; frames++;
    if (acc > 1.0 && !(forced > 0)) {
      const fps = frames / acc;
      if (fps < 57 && scale > 0.5) { scale -= 0.05; resize(); }
      else if (fps > 59.5 && scale < 1.0) { scale += 0.05; resize(); }
      acc = 0; frames = 0;
    }
  }

  return { renderer, composer, painterly, setup, render, resize };
}

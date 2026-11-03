// Real-world surface detail from Poly Haven CC0 textures (public/textures/), applied as
// triplanar luminance detail so our painted vertex colors stay in charge of the palette.
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map();
export const TEX = {
  boulder: 'rock_boulder_dry', riverbed: 'dry_riverbed_rock', forest: 'forest_ground_04', pebbles: 'river_small_rocks',
};

export function detailTexture(name) {
  if (cache.has(name)) return cache.get(name);
  const t = loader.load(`${import.meta.env.BASE_URL}textures/${name}_diff_1k.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(name, t);
  return t;
}

/**
 * Add triplanar texture detail to any MeshStandard/Phong material (works with instancing and
 * with materials that already have onBeforeCompile, e.g. the caustic riverbed).
 * scale = texture repeats per meter, strength 0..1.
 */
export function addDetail(material, name, { scale = 0.35, strength = 0.85 } = {}) {
  const map = detailTexture(name);
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(material, sh, r);
    sh.uniforms.uDetail = { value: map };
    sh.uniforms.uDetailScale = { value: scale };
    sh.uniforms.uDetailStrength = { value: strength };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDW; varying vec3 vDN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 dw = vec4(transformed, 1.0);
        mat3 dn = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          dw = instanceMatrix * dw; dn = dn * mat3(instanceMatrix);
        #endif
        vDW = (modelMatrix * dw).xyz;
        vDN = normalize(dn * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uDetail; uniform float uDetailScale, uDetailStrength; varying vec3 vDW; varying vec3 vDN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 bw = pow(abs(normalize(vDN)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 tx = texture2D(uDetail, vDW.zy * uDetailScale).rgb * bw.x
                + texture2D(uDetail, vDW.xz * uDetailScale).rgb * bw.y
                + texture2D(uDetail, vDW.xy * uDetailScale).rgb * bw.z;
        float lum = dot(tx, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb *= mix(1.0, clamp(lum / 0.42, 0.45, 1.6), uDetailStrength);`);
  };
  material.customProgramCacheKey = () => 'detail-' + name + (prev ? '-chain' : '');
  material.needsUpdate = true;
  return material;
}

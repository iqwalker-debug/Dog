// Painted surfaces: vertex/instance colors carry the palette; an optional real-world photo
// texture adds triplanar luminance detail; optional gold caustics for riverbeds.
shader_type spatial;
render_mode cull_back;

uniform vec4 base_color : source_color = vec4(1.0);
uniform sampler2D detail_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform float detail_scale = 0.35;   // texture repeats per meter
uniform float detail_strength = 0.0; // 0..1
uniform sampler2D detail_normal : filter_linear_mipmap_anisotropic, repeat_enable;
uniform float normal_strength = 0.0; // 0 = flat
uniform float caustics = 0.0;        // 0..1 animated light net
uniform float roughness_v = 1.0;
uniform vec4 emission_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float emission_v = 0.0;

varying vec3 w_pos;
varying vec3 w_nrm;

#include "res://shaders/color.gdshaderinc"

float caustic(vec2 p, float t) {
	// bounded interference net: bright thin lines where waves cancel
	vec2 q = p;
	float c = 0.0;
	for (int n = 0; n < 3; n++) {
		q += vec2(sin(q.y * 1.3 + t), cos(q.x * 1.1 - t * 0.8)) * 0.6;
		c += abs(sin(q.x * 2.0) * sin(q.y * 2.0));
	}
	c = clamp(c / 3.0, 0.0, 1.0);
	return pow(1.0 - c, 6.0);
}

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	w_nrm = normalize(mat3(MODEL_MATRIX) * NORMAL);
}

void fragment() {
	vec3 col = base_color.rgb * to_linear(COLOR.rgb);
	if (detail_strength > 0.0) {
		vec3 bw = pow(abs(normalize(w_nrm)), vec3(4.0));
		bw /= (bw.x + bw.y + bw.z);
		vec3 tx = texture(detail_tex, w_pos.zy * detail_scale).rgb * bw.x
			+ texture(detail_tex, w_pos.xz * detail_scale).rgb * bw.y
			+ texture(detail_tex, w_pos.xy * detail_scale).rgb * bw.z;
		float lum = dot(tx, vec3(0.299, 0.587, 0.114));
		col *= mix(1.0, clamp(lum / 0.42, 0.45, 1.6), detail_strength);
		if (normal_strength > 0.0) {
			// triplanar relief from the scanned normal map (world space, whiteout-ish blend)
			vec2 nx = texture(detail_normal, w_pos.zy * detail_scale).rg * 2.0 - 1.0;
			vec2 ny = texture(detail_normal, w_pos.xz * detail_scale).rg * 2.0 - 1.0;
			vec2 nz = texture(detail_normal, w_pos.xy * detail_scale).rg * 2.0 - 1.0;
			vec3 wn = normalize(w_nrm
				+ (vec3(0.0, nx.y, nx.x) * bw.x + vec3(ny.x, 0.0, -ny.y) * bw.y + vec3(nz.x, nz.y, 0.0) * bw.z) * normal_strength);
			NORMAL = normalize((VIEW_MATRIX * vec4(wn, 0.0)).xyz);
		}
	}
	ALBEDO = col;
	ROUGHNESS = roughness_v;
	vec3 em = emission_color.rgb * emission_v;
	if (caustics > 0.0) {
		em += vec3(1.0, 0.9, 0.55) * caustic(w_pos.xz * 0.6, TIME * 0.6) * 0.9 * caustics;
	}
	EMISSION = em;
}

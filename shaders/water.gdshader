// Clear spring water. Reads the scene behind the surface (refraction) and the depth buffer, so
// the shallows are glass-clear over golden limestone and deeper water fades to jade; foam rims
// the shore and anything wading; ripple normals catch the sun for the paint pass's glints.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_schlick_ggx;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
uniform vec4 water_color : source_color = vec4(0.075, 0.54, 0.5, 1.0); // deep color
uniform vec4 shallow_tint : source_color = vec4(0.82, 1.0, 0.93, 1.0);
uniform float clear = 0.38;   // 0 = murky .. 1 = very clear (scales absorption)
uniform float ripple = 0.22;
uniform float refraction = 0.035;

varying vec3 w_pos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

float scene_dist(vec2 uv, mat4 inv_proj) {
	float d = texture(depth_tex, uv).r;
#if CURRENT_RENDERER == RENDERER_COMPATIBILITY
	vec4 ndc = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
#else
	vec4 ndc = vec4(uv * 2.0 - 1.0, d, 1.0);
#endif
	vec4 v = inv_proj * ndc;
	return length(v.xyz / v.w);
}

void fragment() {
	vec2 q = w_pos.xz;
	float t = TIME;
	float dx = cos(q.x * 1.7 + t * 1.6) * 0.5 + cos((q.x + q.y) * 2.9 - t * 2.1) * 0.3 + cos(q.y * 0.6 + q.x * 4.1 + t) * 0.2
		+ (noise(q * 3.0 + t * 0.7) - 0.5) * 0.6;
	float dz = sin(q.y * 1.9 - t * 1.4) * 0.5 + sin((q.x - q.y) * 3.3 + t * 1.8) * 0.3 + sin(q.x * 0.7 + q.y * 4.3 - t) * 0.2
		+ (noise(q * 3.0 - t * 0.6 + 9.0) - 0.5) * 0.6;
	vec3 n_world = normalize(vec3(dx * ripple, 1.0, dz * ripple));
	NORMAL = normalize((VIEW_MATRIX * vec4(n_world, 0.0)).xyz);

	// thickness of water along the view ray
	float surf = length(VERTEX);
	float thick = max(scene_dist(SCREEN_UV, INV_PROJECTION_MATRIX) - surf, 0.0);
	// refract: bend the view of the bed by the ripples, more where the water is deeper
	vec2 ruv = SCREEN_UV + n_world.xz * refraction * clamp(thick, 0.0, 1.5);
	if (scene_dist(ruv, INV_PROJECTION_MATRIX) < surf) {
		ruv = SCREEN_UV; // don't pull in things above the surface
	}
	float rthick = max(scene_dist(ruv, INV_PROJECTION_MATRIX) - surf, 0.0);
	vec3 bed = textureLod(screen_tex, ruv, 0.0).rgb;

	vec3 V = normalize(CAMERA_POSITION_WORLD - w_pos);
	float cos_v = max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0);
	float vert_depth = rthick * cos_v; // approx vertical depth
	float absorb = mix(0.75, 0.16, clear);
	float murk = 1.0 - exp(-rthick * absorb);
	vec3 col = mix(bed * shallow_tint.rgb, water_color.rgb, murk);
	// gold-green light in the shallows
	col += vec3(0.05, 0.06, 0.02) * exp(-vert_depth * 3.0);

	// fresnel sky reflection
	float fres = 0.02 + 0.98 * pow(1.0 - cos_v, 5.0);
	vec3 sky = mix(vec3(0.62, 0.78, 0.9), vec3(0.32, 0.55, 0.85), clamp(reflect(-V, n_world).y, 0.0, 1.0));
	col = mix(col, sky, clamp(fres * 0.85, 0.0, 0.9));

	// shoreline + wading foam
	float foam_n = noise(q * 6.0 + vec2(t * 0.4, -t * 0.3)) * 0.6 + noise(q * 14.0 - t * 0.5) * 0.4;
	float foam = (1.0 - smoothstep(0.0, 0.22, thick)) * smoothstep(0.35, 0.65, foam_n + (0.2 - thick));
	col = mix(col, vec3(0.97, 0.98, 0.95), foam * 0.85);

	ALBEDO = vec3(0.0);
	EMISSION = col;
	ROUGHNESS = 0.06;
	SPECULAR = 0.5;
	// soften the hard edge where water meets ground
	ALPHA = clamp(thick * 6.0, 0.0, 1.0);
}

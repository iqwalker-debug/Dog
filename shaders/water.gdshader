// Clear turquoise water: see-through when looking down, fresnel sky reflection at grazing angles,
// ripple normals so the sun throws glints for the paint pass.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, specular_schlick_ggx;

uniform vec4 water_color : source_color = vec4(0.075, 0.54, 0.5, 1.0);
uniform float clear = 0.38;
uniform float ripple = 0.2;

varying vec3 w_pos;

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 q = w_pos.xz;
	float t = TIME;
	float dx = cos(q.x * 1.7 + t * 1.6) * 0.5 + cos((q.x + q.y) * 2.9 - t * 2.1) * 0.3 + cos(q.y * 0.6 + q.x * 4.1 + t) * 0.2;
	float dz = sin(q.y * 1.9 - t * 1.4) * 0.5 + sin((q.x - q.y) * 3.3 + t * 1.8) * 0.3 + sin(q.x * 0.7 + q.y * 4.3 - t) * 0.2;
	vec3 n_world = normalize(vec3(dx * ripple, 1.0, dz * ripple));
	NORMAL = normalize((VIEW_MATRIX * vec4(n_world, 0.0)).xyz);
	vec3 V = normalize(CAMERA_POSITION_WORLD - w_pos);
	float fres = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
	ALBEDO = water_color.rgb;
	ROUGHNESS = 0.08;
	SPECULAR = 0.35;
	ALPHA = mix(clear, 0.9, fres);
	EMISSION = vec3(0.2, 0.45, 0.55) * fres * 0.25;
}

// Dam waterfall sheet: streaking white water.
shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled;

void fragment() {
	float streak = fract(UV.y * 6.0 + TIME * 1.8 + sin(UV.x * 60.0) * 0.3);
	ALBEDO = vec3(1.0);
	ROUGHNESS = 0.2;
	ALPHA = 0.75 * (0.4 + 0.6 * smoothstep(0.2, 0.9, streak));
}

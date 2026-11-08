// Tree canopy cards: painted leaf-cluster texture, alpha cut-out (so shadows are dappled),
// soft spherical canopy normals, sunlit translucency, and wind sway.
shader_type spatial;
render_mode cull_disabled;

uniform sampler2D leaf_tex : source_color, filter_linear_mipmap, repeat_disable;
uniform vec4 tint : source_color = vec4(1.0);
uniform float sway = 1.0;

#include "res://shaders/color.gdshaderinc"

void vertex() {
	vec3 w = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float k = clamp(VERTEX.y * 0.12, 0.0, 1.5) * sway;
	float t = TIME;
	VERTEX.x += (sin(t * 1.3 + w.x * 0.35 + w.z * 0.2) * 0.05 + sin(t * 3.1 + w.z * 1.7) * 0.02) * k;
	VERTEX.z += (cos(t * 1.1 + w.z * 0.3 + w.x * 0.15) * 0.05 + cos(t * 2.7 + w.x * 1.9) * 0.02) * k;
}

void fragment() {
	// keep the rounded canopy normals on both sides of the card
	if (!FRONT_FACING) { NORMAL = -NORMAL; }
	vec4 t = texture(leaf_tex, UV);
	ALBEDO = t.rgb * tint.rgb * to_linear(COLOR.rgb);
	ALPHA = t.a;
	ALPHA_SCISSOR_THRESHOLD = 0.5;
	ROUGHNESS = 0.85;
	BACKLIGHT = vec3(0.45, 0.5, 0.15);
	EMISSION = ALBEDO * vec3(0.18, 0.2, 0.05); // canopies glow yellow-green in the sun
}

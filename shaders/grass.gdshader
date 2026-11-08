// Wind-blown grass clumps (MultiMesh). UV.y = height along the blade (0 root .. 1 tip).
shader_type spatial;
render_mode cull_disabled;

#include "res://shaders/color.gdshaderinc"

uniform float wind = 1.0;

void vertex() {
	vec3 w = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	float h = UV.y * UV.y;
	float t = TIME;
	float gust = sin(t * 0.9 + w.x * 0.12 + w.z * 0.08) * 0.5 + 0.5;
	vec2 sway = vec2(sin(t * 2.1 + w.x * 0.7 + w.z * 0.3), cos(t * 1.7 + w.z * 0.6 - w.x * 0.2)) * (0.05 + 0.1 * gust);
	VERTEX.xz += sway * h * wind;
	// soft, rounded lighting for a lawn-like read
	NORMAL = normalize(mix(NORMAL, vec3(0.0, 1.0, 0.0), 0.65));
}

void fragment() {
	vec3 c = to_linear(COLOR.rgb) * mix(0.55, 1.2, UV.y);
	ALBEDO = c;
	ROUGHNESS = 0.9;
	BACKLIGHT = c * 0.6;
}

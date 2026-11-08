// Photoscanned rock (Poly Haven, CC0): real albedo, normal and AO/roughness, tinted toward the
// level's painted palette by the instance color so scans sit in the watercolor world.
shader_type spatial;

#include "res://shaders/color.gdshaderinc"

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : filter_linear_mipmap_anisotropic;
uniform sampler2D arm_tex : filter_linear_mipmap;
uniform float tint_amount = 0.82;
uniform float caustics = 0.0;

varying vec3 w_pos;

float caustic(vec2 p, float t) {
	vec2 q = p;
	float c = 0.0;
	for (int n = 0; n < 3; n++) {
		q += vec2(sin(q.y * 1.3 + t), cos(q.x * 1.1 - t * 0.8)) * 0.6;
		c += abs(sin(q.x * 2.0) * sin(q.y * 2.0));
	}
	return pow(1.0 - clamp(c / 3.0, 0.0, 1.0), 6.0);
}

void vertex() {
	w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec3 t = texture(albedo_tex, UV).rgb;
	float l = dot(t, vec3(0.299, 0.587, 0.114));
	vec3 tinted = to_linear(COLOR.rgb) * clamp(l / 0.2, 0.78, 1.15);
	ALBEDO = mix(t, tinted, tint_amount);
	vec3 n = texture(normal_tex, UV).rgb;
	NORMAL_MAP = n;
	NORMAL_MAP_DEPTH = 1.2;
	vec3 arm = texture(arm_tex, UV).rgb;
	AO = mix(1.0, arm.r, 0.45);
	AO_LIGHT_AFFECT = 0.12;
	ROUGHNESS = clamp(arm.g, 0.7, 1.0);
	SPECULAR = 0.3;
	if (caustics > 0.0) {
		EMISSION = vec3(1.0, 0.9, 0.55) * caustic(w_pos.xz * 0.6, TIME * 0.6) * 0.6 * caustics;
	}
}

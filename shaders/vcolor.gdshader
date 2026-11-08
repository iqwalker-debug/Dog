// Plain painted surface from vertex colors (dog skin under the fur, ears' undersides, etc.)
shader_type spatial;

uniform float roughness_v = 0.9;
uniform vec4 mult : source_color = vec4(1.0);

#include "res://shaders/color.gdshaderinc"

void fragment() {
	ALBEDO = to_linear(COLOR.rgb) * mult.rgb;
	ROUGHNESS = roughness_v;
}

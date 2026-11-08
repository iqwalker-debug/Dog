// Shell-texture fur: the mesh holds N copies of the skin (UV2.x = shell 0..1, UV2.y = fur length).
// Each shell is pushed out along the normal; a 3D strand pattern discards everything that isn't
// a hair. Supports curl (doodles), droop, wet clumping, and a max_shell LOD cut.
shader_type spatial;
render_mode cull_back;

uniform float density = 38.0;
uniform float wet = 0.0;
uniform float curl = 0.0;
uniform float droop = 0.25;
uniform float max_shell = 1.0;

varying vec3 v_base;
varying vec3 v_n;
varying float v_shell;

float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
#include "res://shaders/color.gdshaderinc"

void vertex() {
	float sh = UV2.x;
	float L = UV2.y * (1.0 - wet * 0.55);
	v_base = VERTEX;
	v_n = NORMAL;
	v_shell = sh;
	vec3 g = normalize(inverse(mat3(MODEL_MATRIX)) * vec3(0.0, -1.0, 0.0));
	VERTEX += NORMAL * sh * L;
	VERTEX += g * sh * sh * L * (droop + wet * 0.9);
	VERTEX += curl * L * sh * vec3(
		sin(sh * 9.0 + v_base.y * 30.0),
		cos(sh * 9.0 + v_base.x * 30.0),
		sin(sh * 7.0 + v_base.z * 30.0));
}

void fragment() {
	if (v_shell > max_shell) discard;
	vec3 q = v_base * density * mix(1.0, 0.45, wet); // wet fur clumps
	vec3 cell = floor(q);
	vec3 l = fract(q) - 0.5;
	vec3 nn = normalize(v_n);
	vec3 lp = l - dot(l, nn) * nn;
	float r = h3(cell);
	float strand = 0.5 + 0.5 * r;
	if (v_shell > strand) discard;
	if (length(lp) > (1.0 - v_shell / strand) * 0.6) discard;
	ALBEDO = to_linear(COLOR.rgb) * mix(0.6, 1.1, v_shell) * (1.0 - wet * 0.35) * (0.85 + 0.3 * r);
	ROUGHNESS = 0.85 - wet * 0.5;
}

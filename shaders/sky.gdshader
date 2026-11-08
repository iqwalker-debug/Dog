// Cerulean summer sky with soft cotton clouds; the lower half is the ground tint, so the
// sky's ambient light works like a hemisphere light (cool from above, warm olive from below).
shader_type sky;

uniform vec3 horizon = vec3(0.76, 0.88, 0.97);
uniform vec3 zenith = vec3(0.17, 0.47, 0.86);
uniform vec4 ground : source_color = vec4(0.48, 0.48, 0.27, 1.0);
uniform float cloud_amount = 1.0;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
	float v = 0.0, a = 0.5;
	for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
	return v;
}

void sky() {
	vec3 d = EYEDIR;
	float h = clamp(d.y, 0.0, 1.0);
	vec3 c = mix(horizon, zenith, pow(h, 0.45));
	if (d.y > 0.0) {
		vec2 uv = d.xz / (d.y + 0.12);
		float n = fbm(uv * 1.4 + vec2(3.0, 1.0));
		float puffs = smoothstep(0.52, 0.72, n) * smoothstep(0.0, 0.12, d.y) * (1.0 - smoothstep(0.55, 0.95, d.y));
		vec3 cloud = mix(vec3(0.86, 0.88, 0.92), vec3(1.0, 0.99, 0.96), smoothstep(0.5, 0.85, n));
		c = mix(c, cloud, puffs * 0.95 * cloud_amount);
	} else {
		c = mix(horizon, ground.rgb, smoothstep(0.0, -0.25, d.y));
	}
	COLOR = c;
}

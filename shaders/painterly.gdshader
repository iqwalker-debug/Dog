// Watercolor / gouache post pass: Kuwahara brush strokes, pigment pooling at edges,
// 4-point sun glints on water, warm summer grade, cold-press paper grain, vignette.
// Runs on a full-screen ColorRect that reads the finished 3D frame.
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float saturation = 1.15;
uniform float glint = 1.0;
uniform int radius : hint_range(2, 6) = 4; // brush size: 3 = sharper/faster, 5-6 = more painted/slower

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 kuwahara(vec2 uv, vec2 px) {
	vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
	vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
	for (int j = -radius; j <= radius; j++) {
		for (int i = -radius; i <= radius; i++) {
			vec3 c = texture(screen_tex, uv + vec2(float(i), float(j)) * px).rgb;
			vec3 c2 = c * c;
			if (i <= 0 && j <= 0) { m0 += c; s0 += c2; }
			if (i >= 0 && j <= 0) { m1 += c; s1 += c2; }
			if (i <= 0 && j >= 0) { m2 += c; s2 += c2; }
			if (i >= 0 && j >= 0) { m3 += c; s3 += c2; }
		}
	}
	float n = float((radius + 1) * (radius + 1));
	m0 /= n; m1 /= n; m2 /= n; m3 /= n;
	vec3 v0 = abs(s0 / n - m0 * m0), v1 = abs(s1 / n - m1 * m1), v2 = abs(s2 / n - m2 * m2), v3 = abs(s3 / n - m3 * m3);
	float a = v0.r + v0.g + v0.b, b = v1.r + v1.g + v1.b, c = v2.r + v2.g + v2.b, d = v3.r + v3.g + v3.b;
	vec3 col = m0;
	float best = a;
	if (b < best) { best = b; col = m1; }
	if (c < best) { best = c; col = m2; }
	if (d < best) { col = m3; }
	return col;
}

void fragment() {
	vec2 px = SCREEN_PIXEL_SIZE;
	vec2 res = 1.0 / px;
	vec2 uv = SCREEN_UV;
	// wobble UVs slightly so strokes feel hand-made
	vec2 wob = (vec2(noise(uv * res * 0.02), noise(uv * res * 0.02 + 7.0)) - 0.5) * px * 2.0;
	vec3 col = kuwahara(uv + wob, px);

	// pigment pooling at edges (watercolor darkening)
	vec3 gx = texture(screen_tex, uv + vec2(px.x, 0.0)).rgb - texture(screen_tex, uv - vec2(px.x, 0.0)).rgb;
	vec3 gy = texture(screen_tex, uv + vec2(0.0, px.y)).rgb - texture(screen_tex, uv - vec2(0.0, px.y)).rgb;
	float edge = length(gx) + length(gy);
	col *= 1.0 - smoothstep(0.08, 0.6, edge) * 0.22;

	// 4-point star glints on very bright pixels (sun on water)
	float g = 0.0;
	for (int k = 1; k <= 10; k++) {
		float f = float(k) * 3.0;
		float fall = 1.0 - float(k) / 11.0;
		g += (step(0.93, luma(texture(screen_tex, uv + vec2(f * px.x, 0.0)).rgb))
			+ step(0.93, luma(texture(screen_tex, uv - vec2(f * px.x, 0.0)).rgb))
			+ step(0.93, luma(texture(screen_tex, uv + vec2(0.0, f * px.y)).rgb))
			+ step(0.93, luma(texture(screen_tex, uv - vec2(0.0, f * px.y)).rgb))) * fall * fall;
	}
	col += vec3(1.0, 0.97, 0.88) * g * 0.06 * glint;

	// saturation + warm summer grade
	float l = luma(col);
	col = mix(vec3(l), col, saturation);
	col *= vec3(1.03, 1.0, 0.95);

	// cold-press paper grain (multiply)
	float paper = noise(uv * res * 0.45) * 0.5 + noise(uv * res * 0.09) * 0.5;
	col *= mix(0.92, 1.04, paper);

	// soft vignette
	vec2 q = uv - 0.5;
	col *= 1.0 - dot(q, q) * 0.35;
	COLOR = vec4(clamp(col, 0.0, 1.0), 1.0);
}

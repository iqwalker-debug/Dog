// Vertex/instance colors are authored as sRGB hex. Forward+/Mobile shade in linear space, so
// convert; the Compatibility renderer expects sRGB albedo and converts it itself.
vec3 to_linear(vec3 c) {
#if CURRENT_RENDERER == RENDERER_COMPATIBILITY
	return c;
#else
	return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
#endif
}

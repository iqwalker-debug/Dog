# Shell-texture fur: N copies of a skin mesh; the fur shader pushes each copy out along the
# normals and cuts strands out of it. UV2.x = shell 0..1, UV2.y = fur length in meters.
class_name Fur
extends RefCounted

const SHADER := preload("res://shaders/fur.gdshader")


## d = {v, n, i, c, len?}; len is a per-vertex length multiplier (short fur on the muzzle).
static func shells_mesh(d: Dictionary, shells: int, length: float, mat: Material) -> ArrayMesh:
	var v: PackedVector3Array = d.v
	var n: PackedVector3Array = d.n
	var c: PackedColorArray = d.c
	var idx: PackedInt32Array = d.i
	var lens: PackedFloat32Array = d.get("len", PackedFloat32Array())
	var cnt := v.size()
	var V := PackedVector3Array()
	var N := PackedVector3Array()
	var C := PackedColorArray()
	var U := PackedVector2Array()
	var I := PackedInt32Array()
	U.resize(cnt * shells)
	I.resize(idx.size() * shells)
	for s in shells:
		V.append_array(v)
		N.append_array(n)
		C.append_array(c)
		var sh := float(s + 1) / shells
		for k in cnt:
			U[s * cnt + k] = Vector2(sh, length * (lens[k] if lens.size() else 1.0))
		var off := s * cnt
		var base := s * idx.size()
		for k in idx.size():
			I[base + k] = idx[k] + off
	return MeshUtil.to_mesh({"v": V, "n": N, "c": C, "uv2": U, "i": I}, mat)


static func material(curl: float, density: float, droop: float) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = SHADER
	m.set_shader_parameter("curl", curl)
	m.set_shader_parameter("density", density)
	m.set_shader_parameter("droop", droop)
	return m

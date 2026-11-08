# Small mesh-building helpers shared by the dogs, trees and levels.
class_name MeshUtil
extends RefCounted

const VCOLOR := preload("res://shaders/vcolor.gdshader")
const GROUND := preload("res://shaders/ground.gdshader")


## three.js-style smoothstep(x, min, max)
static func ss(x: float, a: float, b: float) -> float:
	if x <= a:
		return 0.0
	if x >= b:
		return 1.0
	var t := (x - a) / (b - a)
	return t * t * (3.0 - 2.0 * t)


## Arrays from a Godot primitive, with a transform baked in. Returns {v, n, i}.
static func prim(mesh: PrimitiveMesh, xf := Transform3D.IDENTITY) -> Dictionary:
	var a := mesh.get_mesh_arrays()
	var v: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
	var n: PackedVector3Array = a[Mesh.ARRAY_NORMAL]
	var nb := xf.basis.inverse().transposed()
	for k in v.size():
		v[k] = xf * v[k]
		n[k] = (nb * n[k]).normalized()
	return {"v": v, "n": n, "i": a[Mesh.ARRAY_INDEX]}


## UV sphere (three.js convention: theta measured from +Y), optionally only a cap
## from the top down to theta_len. Returns {v, n, i}.
static func sphere(w_seg := 16, h_seg := 12, theta_len := PI, xf := Transform3D.IDENTITY) -> Dictionary:
	var v := PackedVector3Array()
	var n := PackedVector3Array()
	var idx := PackedInt32Array()
	for y in h_seg + 1:
		var th := float(y) / h_seg * theta_len
		for x in w_seg + 1:
			var ph := float(x) / w_seg * TAU
			var p := Vector3(-cos(ph) * sin(th), cos(th), sin(ph) * sin(th))
			v.append(p)
			n.append(p)
	for y in h_seg:
		for x in w_seg:
			var a := y * (w_seg + 1) + x
			var b := a + w_seg + 1
			idx.append_array([a, b, a + 1, b, b + 1, a + 1])
	var d := {"v": v, "n": n, "i": idx}
	return transform(fix_winding(d), xf)


static func transform(d: Dictionary, xf: Transform3D) -> Dictionary:
	if xf == Transform3D.IDENTITY:
		return d
	var v: PackedVector3Array = d.v
	var n: PackedVector3Array = d.n
	var nb := xf.basis.inverse().transposed()
	for k in v.size():
		v[k] = xf * v[k]
		n[k] = (nb * n[k]).normalized()
	return d


## Godot draws clockwise triangles as front faces: flip any triangle whose winding
## disagrees with its vertex normals (removes degenerate ones too).
static func fix_winding(d: Dictionary) -> Dictionary:
	var v: PackedVector3Array = d.v
	var n: PackedVector3Array = d.n
	var src: PackedInt32Array = d.i
	var out := PackedInt32Array()
	out.resize(src.size())
	var w := 0
	for t in range(0, src.size(), 3):
		var a := src[t]
		var b := src[t + 1]
		var c := src[t + 2]
		if a == b or b == c or a == c:
			continue
		var cr := (v[b] - v[a]).cross(v[c] - v[a])
		if cr.dot(n[a] + n[b] + n[c]) > 0.0:
			var tmp := b
			b = c
			c = tmp
		out[w] = a
		out[w + 1] = b
		out[w + 2] = c
		w += 3
	out.resize(w)
	d.i = out
	return d


## Per-vertex colors from fn(p: Vector3) -> Color.
static func colorize(d: Dictionary, fn: Callable) -> Dictionary:
	var v: PackedVector3Array = d.v
	var c := PackedColorArray()
	c.resize(v.size())
	for k in v.size():
		c[k] = fn.call(v[k])
	d.c = c
	return d


static func to_mesh(d: Dictionary, mat: Material = null) -> ArrayMesh:
	var a := []
	a.resize(Mesh.ARRAY_MAX)
	a[Mesh.ARRAY_VERTEX] = d.v
	a[Mesh.ARRAY_NORMAL] = d.n
	if d.has("c"):
		a[Mesh.ARRAY_COLOR] = d.c
	if d.has("uv"):
		a[Mesh.ARRAY_TEX_UV] = d.uv
	if d.has("uv2"):
		a[Mesh.ARRAY_TEX_UV2] = d.uv2
	a[Mesh.ARRAY_INDEX] = d.i
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a)
	if mat:
		m.surface_set_material(0, mat)
	return m


static func std(color: Color, roughness := 0.9, metallic := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	m.metallic = metallic
	return m


static func unshaded(color: Color, alpha := 1.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(color, alpha)
	if alpha < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.no_depth_test = false
		m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	return m


static func vcolor_mat(roughness := 0.9, mult := Color.WHITE) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = VCOLOR
	m.set_shader_parameter("roughness_v", roughness)
	m.set_shader_parameter("mult", mult)
	return m


## Poly Haven CC0 scans: name -> texture set in res://textures/<set>_{diff,nor_gl}_1k.jpg
const DETAIL := {
	"boulder": "rock_boulder_dry",
	"riverbed": "dry_riverbed_rock",
	"forest": "forest_ground_04",
	"pebbles": "river_small_rocks",
	"trail": "rocky_trail",
	"grassy": "sparse_grass",
	"bark": "bark_brown_02",
	"cliff": "rock_face_03",
}


## Painted material: vertex/instance colors, optional photo detail ("boulder", "riverbed",
## "forest", "pebbles") and optional riverbed caustics.
static func ground_mat(detail := "", scale := 0.35, strength := 0.85, caustics := 0.0, base := Color.WHITE, roughness := 1.0) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = GROUND
	m.set_shader_parameter("base_color", base)
	m.set_shader_parameter("roughness_v", roughness)
	m.set_shader_parameter("caustics", caustics)
	if detail != "":
		var set_name: String = DETAIL[detail]
		m.set_shader_parameter("detail_tex", load("res://textures/%s_diff_1k.jpg" % set_name))
		m.set_shader_parameter("detail_scale", scale)
		m.set_shader_parameter("detail_strength", strength)
		var nor := "res://textures/%s_nor_gl_1k.jpg" % set_name
		if ResourceLoader.exists(nor):
			m.set_shader_parameter("detail_normal", load(nor))
			m.set_shader_parameter("normal_strength", 0.55)
	return m


static func mesh_instance(mesh: Mesh, parent: Node3D, pos := Vector3.ZERO, shadow := true) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.position = pos
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi

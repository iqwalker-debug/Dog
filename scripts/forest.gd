# Procedural branching trees (live oaks, golden aspens, bushes) + painted leaf-blob canopies.
# A handful of tree variants are grown once and shared; every placement is one MultiMesh
# instance, so a whole level of trees costs a few draw calls. Leaves are alpha-cut cards with a
# painted leaf-cluster texture, so the sun throws dappled shadows through the canopy.
class_name Forest
extends RefCounted

const LEAF_SHADER := preload("res://shaders/leaf.gdshader")

# live-oak palette (yellow-green, like the paintings), multiplied onto the leaf texture
const LEAF_TINTS := ["#fff7b8", "#f4ffb0", "#fff0a0", "#eaffc0", "#ffe890"]
const OAK := {"trunk_len": 3.0, "trunk_r": 0.34, "gnarl": 0.28, "levels": 3, "children": [5, 4, 3],
	"angle": [1.0, 0.8, 0.65], "len_ratio": [0.8, 0.62, 0.5], "start": [0.5, 0.25, 0.2], "droop": [0.0, -0.08, -0.12],
	"leaf_size": 0.8, "leaves": 18, "leaf_spread": 0.95}
const ASPEN := {"trunk_len": 6.5, "trunk_r": 0.2, "gnarl": 0.12, "levels": 3, "children": [7, 3, 3],
	"angle": [0.6, 0.6, 0.5], "len_ratio": [0.38, 0.6, 0.5], "start": [0.35, 0.2, 0.2], "droop": [0.05, -0.02, -0.05],
	"leaf_size": 0.62, "leaves": 17, "leaf_spread": 0.85}
const BUSH := {"trunk_len": 0.15, "trunk_r": 0.06, "gnarl": 0.35, "levels": 2, "children": [7, 4],
	"angle": [1.05, 0.7], "len_ratio": [5.0, 0.55], "start": [0.3, 0.2], "droop": [0.0, -0.1],
	"leaf_size": 0.38, "leaves": 16, "leaf_spread": 0.6}
const VARIANTS := [
	{"p": OAK, "seed": 101, "tint": 0}, {"p": OAK, "seed": 202, "tint": 1}, {"p": OAK, "seed": 303, "tint": 2},
	{"p": OAK, "seed": 404, "tint": 3}, {"p": OAK, "seed": 505, "tint": 4}, {"p": ASPEN, "seed": 606, "yellow": true},
]
const BUSHES := [{"p": BUSH, "seed": 22, "tint": 1}, {"p": BUSH, "seed": 44, "tint": 3}, {"p": OAK, "seed": 55, "tint": 0}]

static var _grown := {}
static var _leaf_tex: ImageTexture
static var _bark_mat: ShaderMaterial
static var _blob_mesh: Mesh

var rng: RandomNumberGenerator
var _placed := {} # variant key -> Array[Transform3D]
var _blobs: Array[Transform3D] = []
var _blob_colors: Array[Color] = []


func _init(random: RandomNumberGenerator) -> void:
	rng = random


# ------------------------------------------------------------------ placement

## Real branching tree. base = ground point, h = height in m; yellow 0..1 = chance of a golden aspen.
func tree(base: Vector3, h := 7.0, yellow := 0.0, tilt := Basis()) -> void:
	var v := 5 if rng.randf() < yellow else int(rng.randf() * 5)
	place(base, h * 1.25, v, false, rng.randf() * TAU, tilt)


func bush(base: Vector3, h := 1.2) -> void:
	place(base, h, int(rng.randf() * BUSHES.size()), true, rng.randf() * TAU)


func place(base: Vector3, height: float, variant: int, is_bush := false, rot := 0.0, tilt := Basis()) -> void:
	var key := ("b%d" if is_bush else "t%d") % variant
	var g := grow(variant, is_bush)
	var s: float = height / g.height
	var b := tilt * Basis(Vector3.UP, rot) * Basis.from_scale(Vector3.ONE * s)
	if not _placed.has(key):
		_placed[key] = []
	_placed[key].append(Transform3D(b, base - Vector3(0, 0.1, 0)))


## Clustered leaf blob (distant hills, ledge shrubs, sumac).
func blob(x: float, y: float, z: float, s: float, c: Color) -> void:
	var b := Basis.from_euler(Vector3(rng.randf() * 3, rng.randf() * 3, rng.randf() * 3))
	b = b * Basis.from_scale(Vector3(s * (1 + rng.randf() * 0.4), s * (0.6 + rng.randf() * 0.3), s * (1 + rng.randf() * 0.4)))
	_blobs.append(Transform3D(b, Vector3(x, y, z)))
	_blob_colors.append(c)


## Build MultiMeshes for everything placed so far.
func flush(parent: Node3D) -> void:
	for key in _placed:
		var is_bush: bool = key.begins_with("b")
		var g := grow(int(key.substr(1)), is_bush)
		var xfs: Array = _placed[key]
		for part in ["branches", "leaves"]:
			var mm := MultiMesh.new()
			mm.transform_format = MultiMesh.TRANSFORM_3D
			mm.use_colors = true # instance color multiplies vertex color; must be set (white)
			mm.mesh = g[part]
			mm.instance_count = xfs.size()
			for i in xfs.size():
				mm.set_instance_transform(i, xfs[i])
				mm.set_instance_color(i, Color.WHITE)
			var mi := MultiMeshInstance3D.new()
			mi.multimesh = mm
			parent.add_child(mi)
	_placed.clear()
	if _blobs.size():
		if not _blob_mesh:
			var sm := SphereMesh.new()
			sm.radial_segments = 10
			sm.rings = 6
			_blob_mesh = sm
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.use_colors = true
		mm.mesh = _blob_mesh
		mm.instance_count = _blobs.size()
		for i in _blobs.size():
			mm.set_instance_transform(i, _blobs[i])
			mm.set_instance_color(i, _blob_colors[i])
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.material_override = MeshUtil.ground_mat("", 0.35, 0.0, 0.0, Color.WHITE, 0.9)
		parent.add_child(mi)
		_blobs.clear()
		_blob_colors.clear()


# ------------------------------------------------------------------ growing

static func grow(variant: int, is_bush: bool) -> Dictionary:
	var key := ("b%d" if is_bush else "t%d") % variant
	if _grown.has(key):
		return _grown[key]
	var spec: Dictionary = (BUSHES if is_bush else VARIANTS)[variant % (BUSHES if is_bush else VARIANTS).size()]
	var p: Dictionary = spec.p
	if is_bush and p == OAK:
		p = p.duplicate()
		p.levels = 2
	var r := RandomNumberGenerator.new()
	r.seed = spec.seed
	var bark := {"v": PackedVector3Array(), "n": PackedVector3Array(), "c": PackedColorArray(), "i": PackedInt32Array()}
	var leaves: Array[Transform3D] = []
	_branch(p, r, bark, leaves, Vector3.ZERO, Vector3.UP, p.trunk_len, p.trunk_r, 0)

	# leaf cards, with normals pointing out from the canopy center (soft, rounded shading)
	var center := Vector3.ZERO
	for l in leaves:
		center += l.origin
	center = center / maxf(1, leaves.size()) - Vector3(0, 0.6 if not is_bush else 0.1, 0)
	var lv := PackedVector3Array()
	var ln := PackedVector3Array()
	var lu := PackedVector2Array()
	var lc := PackedColorArray()
	var li := PackedInt32Array()
	var shades := [Color("#ffffff"), Color("#e8f0d0"), Color("#fff4c0"), Color("#d8e4b8"), Color("#f2f8dc")]
	for l in leaves:
		var base := lv.size()
		var c: Color = shades[r.randi() % shades.size()]
		for q in [Vector2(-0.5, -0.5), Vector2(0.5, -0.5), Vector2(0.5, 0.5), Vector2(-0.5, 0.5)]:
			var pt := l * Vector3(q.x, q.y, 0)
			lv.append(pt)
			ln.append((pt - center).normalized())
			lu.append(Vector2(q.x + 0.5, 0.5 - q.y))
			lc.append(c)
		li.append_array([base, base + 1, base + 2, base, base + 2, base + 3])
	var tint := Color("#ffd860") if spec.get("yellow", false) else Color(LEAF_TINTS[spec.get("tint", 0) % LEAF_TINTS.size()])
	var leaf_mesh := MeshUtil.to_mesh({"v": lv, "n": ln, "uv": lu, "c": lc, "i": li}, _leaf_mat(tint))
	var bark_mesh := MeshUtil.to_mesh(MeshUtil.fix_winding(bark), _bark())
	var aabb := bark_mesh.get_aabb().merge(leaf_mesh.get_aabb())
	var out := {"branches": bark_mesh, "leaves": leaf_mesh, "height": aabb.size.y}
	_grown[key] = out
	return out


static func _branch(p: Dictionary, r: RandomNumberGenerator, bark: Dictionary, leaves: Array[Transform3D],
		origin: Vector3, dir: Vector3, length: float, radius: float, level: int) -> void:
	var levels: int = p.levels
	var sections := 7 if level == 0 else 5
	var radial := 8 if level == 0 else (6 if level == 1 else 4)
	var seg := length / sections
	var centers: Array[Vector3] = [origin]
	var dirs: Array[Vector3] = [dir]
	var pos := origin
	var d := dir
	var droop: float = p.droop[mini(level, p.droop.size() - 1)]
	for s in sections:
		d = (d + Vector3(r.randf() - 0.5, (r.randf() - 0.5) * 0.4, r.randf() - 0.5) * p.gnarl + Vector3(0, droop, 0)).normalized()
		pos += d * seg
		centers.append(pos)
		dirs.append(d)
	var taper := 0.55 if level < levels else 0.25
	# rings
	var v: PackedVector3Array = bark.v
	var n: PackedVector3Array = bark.n
	var c: PackedColorArray = bark.c
	var idx: PackedInt32Array = bark.i
	var base := v.size()
	var bark_col := Color("#7a6550").lerp(Color("#5d4b38"), r.randf())
	for k in centers.size():
		var t := float(k) / sections
		var rr := radius * lerpf(1.0, taper, t)
		var dk: Vector3 = dirs[k]
		var u := dk.cross(Vector3.FORWARD if absf(dk.z) < 0.9 else Vector3.RIGHT).normalized()
		var w := dk.cross(u).normalized()
		for a in radial:
			var ang := float(a) / radial * TAU
			var nd := u * cos(ang) + w * sin(ang)
			v.append(centers[k] + nd * rr)
			n.append(nd)
			c.append(bark_col.darkened(0.15 * (1.0 - t)))
	for k in sections:
		for a in radial:
			var a0 := base + k * radial + a
			var a1 := base + k * radial + (a + 1) % radial
			var b0 := a0 + radial
			var b1 := a1 + radial
			idx.append_array([a0, b0, a1, a1, b0, b1])
	bark.v = v
	bark.n = n
	bark.c = c
	bark.i = idx

	if level < levels:
		var count: int = p.children[level]
		var start: float = p.start[level]
		var ang_base: float = p.angle[level]
		var ratio: float = p.len_ratio[level]
		var az0 := r.randf() * TAU
		for k in count:
			var t := lerpf(start, 0.97, (k + r.randf() * 0.8) / count)
			var fi := t * sections
			var i0 := mini(int(fi), sections - 1)
			var at: Vector3 = centers[i0].lerp(centers[i0 + 1], fi - i0)
			var dk: Vector3 = dirs[i0 + 1]
			var u := dk.cross(Vector3.FORWARD if absf(dk.z) < 0.9 else Vector3.RIGHT).normalized()
			var w := dk.cross(u).normalized()
			var az := az0 + k * 2.39996 + (r.randf() - 0.5) * 0.6
			var perp := u * cos(az) + w * sin(az)
			var ang := ang_base * (0.8 + r.randf() * 0.4)
			var cd := (dk * cos(ang) + perp * sin(ang)).normalized()
			var rr := radius * lerpf(1.0, taper, t) * 0.68
			_branch(p, r, bark, leaves, at, cd, length * ratio * (0.8 + r.randf() * 0.35), rr, level + 1)
	if level >= levels - 1:
		# leaf cards along the outer part of the twig
		var count: int = p.leaves if level == levels else maxi(2, p.leaves / 2)
		var size: float = p.leaf_size
		var spread: float = p.leaf_spread * size
		for k in count:
			var t := lerpf(0.35, 1.0, r.randf())
			var fi := t * sections
			var i0 := mini(int(fi), sections - 1)
			var at: Vector3 = centers[i0].lerp(centers[i0 + 1], fi - i0)
			at += Vector3(r.randf() - 0.5, (r.randf() - 0.5) * 0.7, r.randf() - 0.5) * spread
			var s := size * (0.7 + r.randf() * 0.6)
			var b := Basis.from_euler(Vector3((r.randf() - 0.5) * 2.2, r.randf() * TAU, (r.randf() - 0.5) * 1.2)) * Basis.from_scale(Vector3.ONE * s)
			leaves.append(Transform3D(b, at))


# ------------------------------------------------------------------ materials

static func _bark() -> ShaderMaterial:
	if not _bark_mat:
		_bark_mat = MeshUtil.ground_mat("bark", 1.4, 0.75, 0.0, Color("#e2d2bc"), 1.0)
	return _bark_mat


static func _leaf_mat(tint: Color) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = LEAF_SHADER
	m.set_shader_parameter("leaf_tex", leaf_texture())
	m.set_shader_parameter("tint", tint)
	return m


## A painted cluster of small pointed leaves on a transparent card.
static func leaf_texture() -> ImageTexture:
	if _leaf_tex:
		return _leaf_tex
	var S := 256
	var img := Image.create(S, S, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.42, 0.55, 0.2, 0.0))
	var r := RandomNumberGenerator.new()
	r.seed = 9
	var cols := [Color("#b9d04a"), Color("#94b83b"), Color("#6e9a34"), Color("#d8dc5c"), Color("#5a8a30"), Color("#c7d84f")]
	for k in 110:
		var a := r.randf() * TAU
		var rad := sqrt(r.randf()) * 0.36 * S
		var cx := S * 0.5 + cos(a) * rad
		var cy := S * 0.5 + sin(a) * rad
		var ln := S * (0.06 + r.randf() * 0.045)
		var wd := ln * 0.42
		var rot := r.randf() * TAU
		var col: Color = cols[r.randi() % cols.size()]
		var ca := cos(rot)
		var sa := sin(rot)
		var ext := int(ln) + 1
		for y in range(maxi(0, int(cy) - ext), mini(S, int(cy) + ext + 1)):
			for x in range(maxi(0, int(cx) - ext), mini(S, int(cx) + ext + 1)):
				var dx := x - cx
				var dy := y - cy
				var lx := (dx * ca + dy * sa) / ln
				var ly := (-dx * sa + dy * ca) / wd
				# pointed leaf: ellipse narrowed toward both tips
				var e := lx * lx + ly * ly / maxf(0.05, 1.0 - lx * lx * 0.6)
				if e < 1.0:
					var shade := 0.85 + 0.25 * (0.5 - lx * 0.5) - 0.12 * absf(ly)
					img.set_pixel(x, y, Color(col.r * shade, col.g * shade, col.b * shade, 1.0))
	img.generate_mipmaps()
	_leaf_tex = ImageTexture.create_from_image(img)
	return _leaf_tex

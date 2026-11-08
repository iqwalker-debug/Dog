# Level 7 — Hill-country creek (painting 15): oak canopy, prickly pear, black-eyed susans,
# limestone stepping slabs, a dirt path along the bank, and a swimmable pool.
extends World

const CELL := 4.0
var slabs: Array[Dictionary] = [] # limestone stepping slabs (flat tops, part of the ground)
var grid := {}


func _cx(z: float) -> float:
	return 7.0 * sin(z * 0.045) + 2.0 * sin(z * 0.13) # creek centerline


func _path_x(z: float) -> float:
	return _cx(z) - 11.0 + sin(z * 0.08) * 1.5


func _init() -> void:
	var d := RandomNumberGenerator.new()
	d.seed = 71
	var z := -50.0
	while z < 40.0:
		var n := 1 + int(d.randf() * 3)
		for k in n:
			slabs.append({"x": _cx(z) + (d.randf() - 0.5) * 9.0, "z": z + (d.randf() - 0.5) * 1.5, "w": 0.8 + d.randf() * 1.6,
				"d": 0.6 + d.randf() * 1.0, "top": 0.08 + d.randf() * 0.25, "rot": d.randf() * 3.0})
		z += 2.2 + d.randf() * 3.0
	# bank ledges
	z = -50.0
	while z < 40.0:
		for s in [-1.0, 1.0]:
			slabs.append({"x": _cx(z) + s * (5.2 + d.randf()), "z": z, "w": 1.6 + d.randf() * 2.0, "d": 1.0 + d.randf(),
				"top": 0.35 + d.randf() * 0.4, "rot": d.randf() * 0.5})
		z += 3.0 + d.randf() * 4.0
	for i in slabs.size():
		var s := slabs[i]
		var rad: float = Vector2(s.w, s.d).length() * 0.5
		for cx in range(floori((s.x - rad) / CELL), floori((s.x + rad) / CELL) + 1):
			for cz in range(floori((s.z - rad) / CELL), floori((s.z + rad) / CELL) + 1):
				var k := Vector2i(cx, cz)
				if not grid.has(k):
					grid[k] = []
				grid[k].append(i)


func _base(x: float, z: float) -> float:
	var d := absf(x - _cx(z))
	var pool := exp(-((z + 6.0) * (z + 6.0)) / 40.0) * 0.7 # deep swimming pool
	var bed := -0.55 - pool + sin(x * 1.1 + z * 0.7) * 0.05
	var h := lerpf(bed, 0.55, MeshUtil.ss(d, 3.5, 6.5))
	h += MeshUtil.ss(d, 8, 30) * 2.5 + 0.2 * sin(x * 0.2) * cos(z * 0.15)
	return h


func ground_h(x: float, z: float) -> float:
	var h := _base(x, z)
	var k := Vector2i(floori(x / CELL), floori(z / CELL))
	if grid.has(k):
		for i in grid[k]:
			var s := slabs[i]
			var c := cos(s.rot)
			var sn := sin(s.rot)
			var lx: float = (x - s.x) * c - (z - s.z) * sn
			var lz: float = (x - s.x) * sn + (z - s.z) * c
			if absf(lx) < s.w / 2.0 and absf(lz) < s.d / 2.0:
				h = maxf(h, s.top)
	return h


func _config() -> Dictionary:
	return {
		"name": "Hill-Country Creek", "seed": 72,
		"fog": ["#dbe8e4", 40, 150],
		"water_y": 0.0,
		"bounds": {"x0": -40, "x1": 40, "z0": -48, "z1": 38},
		"start": {"x": _path_x(28.0) + 3.0, "z": 28.0, "heading": PI * 0.82},
		"player": "golden", "buddies": ["doodle", "frenchie"],
	}


func treat_spot() -> Vector2:
	var z := -45.0 + r() * 80.0
	return Vector2(_cx(z) + (r() - 0.5) * 22.0, z)


func _bank(min_d: float, max_d: float) -> Vector3:
	var z := -48.0 + r() * 86.0
	var s := -1.0 if r() < 0.6 else 1.0
	var x := _cx(z) + s * (min_d + r() * (max_d - min_d))
	return Vector3(x, ground_h(x, z), z)


func _build() -> void:
	var bed_gold := Color("#b9a056")
	var bed_deep := Color("#6f8a55")
	var grass := Color("#8fae42")
	var grass_dry := Color("#c5bf62")
	var dirt := Color("#d9bf8c")
	var lime := Color("#e7dcc0")
	var color := func(x: float, z: float, y: float) -> Color:
		var n := sin(x * 2.1) * cos(z * 1.7) * 0.5 + 0.5
		if y < 0.05:
			return bed_gold.lerp(bed_deep, clampf(-y - 0.4, 0.0, 1.0) * 0.8) * (0.9 + n * 0.2)
		var c := grass.lerp(grass_dry, n * 0.6)
		if absf(x - _path_x(z)) < 1.1:
			c = c.lerp(dirt, 0.85)
		if y < 0.4:
			c = c.lerp(lime, 0.5)
		return c
	terrain({"w": 100.0, "d": 110.0, "cz": -5.0, "seg": 1.7, "detail": "forest", "caustics": 1.0, "color": color})

	# slabs
	var slab_cols := [Color("#cfc2a2"), Color("#bfb08c"), Color("#d6cbb0")]
	var place_slab := func(i: int) -> Dictionary:
		var s := slabs[i]
		return {"p": Vector3(s.x, s.top - 0.4, s.z), "s": Vector3(s.w, 0.8, s.d), "rot": Vector3(0, s.rot, 0), "c": pick(slab_cols)}
	var bm := box(1, 1, 1)
	bm.subdivide_width = 2
	bm.subdivide_depth = 2
	scatter(bm, MeshUtil.ground_mat("boulder", 0.5, 0.85), slabs.size(), place_slab, true)

	# the big framing oak + groves on both banks, distant hills
	var fx := _path_x(10.0) - 5.0
	forest.tree(Vector3(fx, ground_h(fx, 10.0), 10.0), 8.0, 0.2)
	for i in 34:
		var z := -55.0 + r() * 100.0
		var side := -1.0 if r() < 0.5 else 1.0
		var x := _cx(z) + side * (9.0 + r() * 18.0)
		forest.tree(Vector3(x, ground_h(x, z), z), 5.0 + r() * 4.0, 0.25)
	for i in 30:
		var z := -48.0 + r() * 86.0
		var s := -1.0 if r() < 0.5 else 1.0
		var x := _cx(z) + s * (7.0 + r() * 14.0)
		forest.bush(Vector3(x, ground_h(x, z), z), 0.9 + r())
	for i in 260:
		var a := -0.6 + r() * 1.2
		var rad := 70.0 + r() * 30.0
		forest.blob(sin(a) * rad, 3.0 + r() * 9.0 + cos(a * 4.0) * 3.0, -cos(a) * rad - 20.0, 3.0 + r() * 3.0,
			pick([Color("#6f9a62"), Color("#86a95c"), Color("#5d8a5c"), Color("#a3b85a")]))

	# prickly pear clumps
	var pads: Array[Vector3] = []
	for c in 26:
		var b := _bank(6.5, 16.0)
		for k in 7:
			pads.append(b + Vector3((r() - 0.5) * 0.7, 0.15 + r() * 0.6, (r() - 0.5) * 0.7))
	var place_pad := func(i: int) -> Dictionary:
		return {"p": pads[i], "s": Vector3(0.18, 0.22, 0.05), "rot": Vector3(r() - 0.5, r() * 6.0, r() - 0.5),
			"c": Color("#78a35b") if r() < 0.5 else Color("#8ab565")}
	scatter(orb(1.0, 10, 8), MeshUtil.ground_mat("", 0.35, 0.0, 0.0, Color("#ffffff"), 0.8), pads.size(), place_pad, true)
	# grass tufts
	var grass_cols := [Color("#8fb045"), Color("#a6bd4f"), Color("#c9c46a"), Color("#71953b")]
	var blade := CylinderMesh.new()
	blade.top_radius = 0.0
	blade.bottom_radius = 0.035
	blade.height = 0.45
	blade.radial_segments = 4
	blade.rings = 1
	var blade_mesh := MeshUtil.to_mesh(MeshUtil.prim(blade, Transform3D(Basis(), Vector3(0, 0.22, 0))))
	var place_blade := func(_i: int) -> Dictionary:
		return {"p": _bank(5.5, 22.0), "s": Vector3(1, 0.6 + r() * 1.2, 1), "rot": Vector3((r() - 0.5) * 0.5, r() * 6.0, (r() - 0.5) * 0.5), "c": pick(grass_cols)}
	scatter(blade_mesh, MeshUtil.ground_mat(), 3000, place_blade)
	# black-eyed susans + white wild carrot
	var flowers: Array[Dictionary] = []
	for i in 700:
		var p := _bank(5.5, 18.0)
		flowers.append({"p": p + Vector3(0, 0.3 + r() * 0.4, 0), "y": r() < 0.65})
	_flowers(flowers, 0.06)

	# riffle foam where water spills over slabs
	var place_foam := func(_i: int) -> Dictionary:
		var s := slabs[int(r() * slabs.size()) % slabs.size()]
		return {"p": Vector3(s.x + (r() - 0.5), 0.03, s.z + 0.6), "s": Vector3(1.0 + r(), 1, 0.5), "rot": Vector3.ZERO}
	var foam_mat := MeshUtil.unshaded(Color.WHITE, 0.35)
	foam_mat.render_priority = 2
	scatter(_disc(0.35, 12), foam_mat, 60, place_foam)
	animated.append(func(t: float, _dt: float) -> void: foam_mat.albedo_color.a = 0.28 + sin(t * 5.0) * 0.08)


## Flower heads (yellow susans with brown centers, small white carrot), with stems.
func _flowers(flowers: Array[Dictionary], size: float) -> void:
	var head := _disc(size, 10, Basis(Vector3.RIGHT, -PI / 2.6 + PI / 2))
	var head_mat := MeshUtil.ground_mat("", 0.35, 0.0, 0.0, Color.WHITE, 0.7)
	head_mat.set_shader_parameter("emission_color", Color("#3a2a00"))
	head_mat.set_shader_parameter("emission_v", 1.0)
	var place_head := func(i: int) -> Dictionary:
		var f: Dictionary = flowers[i]
		return {"p": f.p, "s": 1.0 if f.y else 0.7, "c": Color("#f2b818") if f.y else Color("#f6f3e8")}
	var hm := scatter(head, head_mat, flowers.size(), place_head)
	hm.material_override = head_mat
	var place_eye := func(i: int) -> Dictionary:
		var f: Dictionary = flowers[i]
		return {"p": f.p + Vector3(0, 0.012, 0), "s": 1.0 if f.y else 0.4, "c": Color("#3a2412")}
	scatter(orb(0.022, 6, 4), MeshUtil.ground_mat(), flowers.size(), place_eye)
	var stem := LevelBase.cyl(0.006, 0.008, 1.0, 4)
	var stem_mesh := MeshUtil.to_mesh(MeshUtil.prim(stem, Transform3D(Basis(), Vector3(0, -0.5, 0))))
	var place_stem := func(i: int) -> Dictionary:
		var f: Dictionary = flowers[i]
		var p: Vector3 = f.p
		return {"p": p, "s": Vector3(1, maxf(0.05, p.y - ground_h(p.x, p.z)), 1), "c": Color("#5f7d2e"), "rot": Vector3.ZERO}
	scatter(stem_mesh, MeshUtil.ground_mat(), flowers.size(), place_stem)


## Flat disc facing up (double-sided via two windings).
static func _disc(rad: float, segs: int, b := Basis()) -> ArrayMesh:
	var v := PackedVector3Array([Vector3.ZERO])
	var n := PackedVector3Array([b * Vector3.UP])
	for s in segs:
		var a := float(s) / segs * TAU
		v.append(b * Vector3(cos(a) * rad, 0, sin(a) * rad))
		n.append(b * Vector3.UP)
	var idx := PackedInt32Array()
	for s in segs:
		var a1 := 1 + s
		var a2 := 1 + (s + 1) % segs
		idx.append_array([0, a1, a2, 0, a2, a1])
	return MeshUtil.to_mesh({"v": v, "n": n, "i": idx})


func _grass_pass() -> void:
	var lush := Color("#8fb045")
	var dry := Color("#c9c46a")
	var where := func(x: float, z: float, y: float) -> Color:
		var d := absf(x - _cx(z))
		if y < 0.35 or d < 6.0 or absf(x - _path_x(z)) < 1.3:
			return Color(0, 0, 0, 0)
		var n := sin(x * 0.9) * cos(z * 0.7) * 0.5 + 0.5
		var c := lush.lerp(dry, n * 0.7)
		c.a = MeshUtil.ss(d, 6.0, 8.0)
		return c
	grass(Rect2(-50, -60, 100, 110), 11.0, where, 0.55)

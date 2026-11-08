# Level 6 — Dry limestone creek bed under a layered limestone bluff (painting 12). Boulder hopping.
extends World

const CELL := 4.0
var boulders: Array[Dictionary] = [] # boulders are part of the ground, so dogs climb over them
var grid := {} # Vector2i cell -> Array[int] boulder indices


func _init() -> void:
	var d := RandomNumberGenerator.new()
	d.seed = 61
	for i in 90:
		var big := d.randf() < 0.18
		var rad := (2.2 + d.randf() * 2.5) if big else (0.4 + d.randf() * 1.1)
		var b := {"x": -40.0 + d.randf() * 80.0, "z": -20.0 + d.randf() * 34.0, "r": rad, "slab": false}
		b.h = rad * (0.35 if big else 0.55 + d.randf() * 0.25)
		boulders.append(b)
	# the big flat slab the dogs cross in the painting
	boulders.append({"x": 0.0, "z": -2.0, "r": 6.5, "h": 1.3, "slab": true})
	for i in boulders.size():
		var b := boulders[i]
		b.base = _base(b.x, b.z)
		for cx in range(floori((b.x - b.r) / CELL), floori((b.x + b.r) / CELL) + 1):
			for cz in range(floori((b.z - b.r) / CELL), floori((b.z + b.r) / CELL) + 1):
				var k := Vector2i(cx, cz)
				if not grid.has(k):
					grid[k] = []
				grid[k].append(i)


func _base(x: float, z: float) -> float:
	return 0.25 * sin(x * 0.15) * cos(z * 0.2) + 0.12 * sin(x * 0.6 + z * 0.4) \
		+ MeshUtil.ss(-z, 22, 29) * 15.0 + MeshUtil.ss(-z, 29, 40) * 4.0 \
		+ MeshUtil.ss(z, 14, 26) * 2.5 # the bluff, and a grassy rise behind you


func ground_h(x: float, z: float) -> float:
	var h := _base(x, z)
	var k := Vector2i(floori(x / CELL), floori(z / CELL))
	if grid.has(k):
		for i in grid[k]:
			var b := boulders[i]
			var d2: float = ((x - b.x) * (x - b.x) + (z - b.z) * (z - b.z)) / (b.r * b.r)
			if d2 < 1.0:
				var bump: float = b.h * (minf(1.0, 1.6 * sqrt(1.0 - d2)) if b.slab else sqrt(1.0 - d2))
				h = maxf(h, b.base + bump)
	return h


func _config() -> Dictionary:
	return {
		"name": "Limestone Bluff", "seed": 62,
		"fog": ["#d9e3d6", 45, 170], "ground_tint": "#9a9478",
		"bounds": {"x0": -42, "x1": 42, "z0": -22, "z1": 22},
		"start": {"x": -8.0, "z": 8.0, "heading": PI * 0.85},
		"player": "redGolden", "buddies": ["doodle", "collie", "husky"],
	}


func treat_spot() -> Vector2:
	var b := boulders[int(r() * boulders.size()) % boulders.size()]
	return Vector2(b.x + (r() - 0.5) * b.r, b.z + (r() - 0.5) * b.r)


func _build() -> void:
	var lime := Color("#cfc8b4")
	var lime_warm := Color("#ddd0ae")
	var grey := Color("#a9a596")
	var soil := Color("#8f8458")
	var green := Color("#7d9440")
	var color := func(x: float, z: float, _y: float) -> Color:
		var n := sin(x * 2.3) * cos(z * 1.9) * 0.5 + 0.5
		var n2 := sin(x * 0.7 + z * 0.9) * 0.5 + 0.5
		var c := lime.lerp(grey, n * 0.45).lerp(lime_warm, n2 * 0.4)
		if -z > 21.0 and -z < 23.5:
			c = c.lerp(soil, 0.6) # talus at the cliff foot
		if z > 13.0:
			c = c.lerp(green, MeshUtil.ss(z, 13, 18) * 0.7)
		return c * 0.8
	terrain({"w": 110.0, "d": 90.0, "cz": -8.0, "seg": 1.8, "detail": "riverbed", "color": color})

	# boulder rocks (visual shells matching the height bumps)
	var rock_cols := [lime_warm, lime, Color("#e9dcb8")]
	var place_boulder := func(i: int) -> Dictionary:
		var b := boulders[i]
		var c: Color = pick(rock_cols)
		return {"p": Vector3(b.x, b.base - b.h * 0.15, b.z), "s": Vector3(b.r * 1.02, b.h * 1.15, b.r * (0.8 + r() * 0.3)), "c": c * (1.0 + r() * 0.12)}
	scatter(rock_mesh(2), MeshUtil.ground_mat("boulder", 0.45, 0.85), boulders.size() - 1, place_boulder, true)
	# pebbles across the bed
	var peb_cols := [lime, grey, lime_warm]
	var place_pebble := func(_i: int) -> Dictionary:
		var x := -45.0 + r() * 90.0
		var z := -21.0 + r() * 36.0
		var rad := 0.06 + r() * r() * 0.25
		return {"p": Vector3(x, ground_h(x, z), z), "s": Vector3(rad * 1.3, rad * 0.6, rad), "c": pick(peb_cols)}
	scatter(orb(1.0, 7, 5), MeshUtil.ground_mat(), 900, place_pebble)

	# layered bluff: stacked ledges with overhangs
	var ledge_mats := []
	for c in ["#e3d6b2", "#cfc0a0", "#efe2bf", "#c6b896", "#dccfa9"]:
		ledge_mats.append(MeshUtil.ground_mat("boulder", 0.3, 0.85, 0.0, Color(c)))
	for layer in 7:
		var y := 1.5 + layer * 2.1
		var x := -60.0
		while x < 60.0:
			var w := 2.4 + r() * 2.6
			var h := 1.4 + r() * 0.8
			var z := -25.5 - layer * 0.55 + (r() - 0.5) * 0.6
			var m := MeshUtil.mesh_instance(_jitter_box(w, h, 2.2), self, Vector3(x, y, z))
			m.material_override = pick(ledge_mats)
			x += 2.4 + r() * 2.0

	# vegetation on the bluff top and ledges, trees and yellow sumac in front
	var x2 := -60.0
	while x2 < 60.0:
		forest.blob(x2, 17.0 + r() * 2.0, -31.0 - r() * 6.0, 1.2 + r() * 1.4, pick([Color("#6e9a34"), Color("#94b83b"), Color("#5a8a30")]))
		x2 += 2.0 + r() * 2.0
	for i in 40:
		var layer := int(r() * 6)
		forest.blob(-55.0 + r() * 110.0, 2.6 + layer * 2.1, -24.8 - layer * 0.55, 0.4 + r() * 0.5, Color("#7fa33a"))
	for i in 14:
		var x := -45.0 + r() * 90.0
		var z := -21.0 + r() * 3.0
		forest.tree(Vector3(x, ground_h(x, z), z), 5.0 + r() * 4.0, 0.25)
	for i in 26:
		var x := -45.0 + r() * 90.0
		var z := (-20.0 + r() * 4.0) if r() < 0.5 else (12.0 + r() * 10.0)
		forest.bush(Vector3(x, ground_h(x, z), z), 1.0 + r() * 1.2)
	for i in 40:
		var x := -45.0 + r() * 90.0
		var z := (-20.0 + r() * 4.0) if r() < 0.5 else (12.0 + r() * 10.0)
		forest.blob(x, ground_h(x, z) + 0.4 + r() * 0.8, z, 0.4 + r() * 0.7, pick([Color("#c9cf3e"), Color("#a7c23f"), Color("#e0b640"), Color("#8fb03a")]))
	for i in 10:
		var x := -45.0 + r() * 90.0
		var z := 16.0 + r() * 8.0
		forest.tree(Vector3(x, ground_h(x, z), z), 6.0 + r() * 3.0, 0.3)
	# dry grass tufts in rock cracks
	var place_tuft := func(_i: int) -> Dictionary:
		var x := -45.0 + r() * 90.0
		var z := -20.0 + r() * 34.0
		return {"p": Vector3(x, ground_h(x, z), z), "s": Vector3(1, 0.6 + r(), 1), "c": Color("#c4ad62") if r() < 0.5 else Color("#9aa64e")}
	scatter(_tuft(), MeshUtil.ground_mat(), 400, place_tuft)


## Box with jittered vertices: weathered limestone ledge.
func _jitter_box(w: float, h: float, d: float) -> ArrayMesh:
	var bm := box(w, h, d)
	bm.subdivide_width = 2
	bm.subdivide_height = 1
	var a := MeshUtil.prim(bm)
	var v: PackedVector3Array = a.v
	var jit := {}
	for i in v.size():
		var key := v[i].snapped(Vector3.ONE * 0.001)
		if not jit.has(key):
			jit[key] = Vector3(v[i].x * (r() - 0.5) * 0.08, (r() - 0.5) * 0.15, (r() - 0.5) * 0.25)
		v[i] += jit[key]
	a.v = v
	return MeshUtil.to_mesh(a)


func _tuft() -> Mesh:
	var c := CylinderMesh.new()
	c.top_radius = 0.0
	c.bottom_radius = 0.12
	c.height = 0.35
	c.radial_segments = 5
	c.rings = 1
	var a := MeshUtil.prim(c, Transform3D(Basis(), Vector3(0, 0.17, 0)))
	return MeshUtil.to_mesh(a)


func _grass_pass() -> void:
	var where := func(x: float, z: float, y: float) -> Color:
		if z < 13.0 or y > 6.0:
			return Color(0, 0, 0, 0)
		var c := Color("#9aa64e").lerp(Color("#c4ad62"), sin(x * 0.6) * 0.5 + 0.5)
		c.a = MeshUtil.ss(z, 13.0, 17.0)
		return c
	grass(Rect2(-55, 12, 110, 26), 9.0, where, 0.45)

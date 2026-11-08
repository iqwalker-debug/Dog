# Level 1 — spring-fed swimming hole: graffiti retaining wall, low dam waterfall, railing,
# light poles, pavilion, submerged limestone slabs, live oaks on the sunny right bank.
extends World

const FALL_SHADER := preload("res://shaders/fall.gdshader")


func ground_h(x: float, z: float) -> float:
	# pool basin, rising bank on the right (+x)
	var h := -1.4 + sin(x * 0.35) * 0.15 + cos(z * 0.4 + x * 0.1) * 0.15
	return h + MeshUtil.ss(x, 22, 40) * 6.0


func _config() -> Dictionary:
	return {
		"name": "Swimming Hole", "seed": 12,
		"fog": ["#bfdcef", 60, 180], "ground_tint": "#6b6a3a",
		"water_y": 0.0, "water_opts": {"w": 140.0, "d": 120.0},
		"bounds": {"x0": -45, "x1": 46, "z0": -24, "z1": 30},
		"start": {"x": -6.0, "z": 14.0, "heading": PI},
		"player": "golden", "buddies": ["doodle", "lab"],
		"help": "climb out on the right",
	}


func treat_spot() -> Vector2:
	return Vector2(-38.0 + r() * 70.0, -20.0 + r() * 46.0)


func _build() -> void:
	# riverbed + banks
	var lime := Color("#b8a456")
	var moss := Color("#6f8a3a")
	var sand := Color("#e3cf9a")
	var color := func(x: float, z: float, y: float) -> Color:
		return lime.lerp(moss, maxf(0.0, sin(x * 0.7) * cos(z * 0.5)) * 0.5).lerp(sand, clampf((y + 0.2) / 2.0, 0.0, 1.0))
	terrain({"w": 140.0, "d": 120.0, "seg": 1.3, "detail": "pebbles", "detail_scale": 0.35, "detail_strength": 0.7, "caustics": 1.0, "color": color})

	# submerged limestone slabs
	var place_slab := func(_i: int) -> Dictionary:
		var x := -35.0 + r() * 55.0
		var z := -20.0 + r() * 45.0
		return {"p": Vector3(x, ground_h(x, z) - 0.15, z), "s": Vector3(2.0 + r() * 3.0, 0.5 + r() * 0.6, 1.5 + r() * 2.5), "c": Color("#c9b87a")}
	scan_scatter(26, place_slab, ["namaqualand_boulder_02", "namaqualand_boulder_05", "boulder_01"], true, 0.6)
	# bank boulders on the sunny right side
	var place_bank := func(_i: int) -> Dictionary:
		var z := -24.0 + r() * 50.0
		var x := 21.0 + r() * 8.0
		var rad := 0.4 + r() * 1.2
		return {"p": Vector3(x, ground_h(x, z) - 0.1, z), "s": Vector3(rad, rad * 0.8, rad), "c": Color("#ddd0ae")}
	scan_scatter(30, place_bank)

	# graffiti retaining wall + deck
	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_texture = _graffiti()
	wall_mat.roughness = 0.9
	wall_mat.uv1_scale = Vector3(3, 1, 1)
	var wall := MeshUtil.mesh_instance(box(90, 4, 1.2), self, Vector3(-5, 0.6, -26))
	wall.material_override = wall_mat
	prop(box(90, 0.4, 6), Color("#cfc6b0"), Vector3(-5, 2.7, -29))
	# railing, light poles, pavilion
	var rail := Color("#2b2f33")
	prop(box(90, 0.12, 0.12), rail, Vector3(-5, 4.2, -26.3), 0.5)
	var post := box(0.1, 1.5, 0.1)
	var x := -50.0
	while x <= 40.0:
		prop(post, rail, Vector3(x, 3.45, -26.3), 0.5)
		x += 3.0
	for px in [-22.0, 18.0]:
		prop(cyl(0.15, 0.2, 14), rail, Vector3(px, 9, -29), 0.5)
	prop(box(14, 0.4, 7), Color("#e8e2d2"), Vector3(10, 7, -36))
	for c in [Vector3(4, 3.6, -33), Vector3(16, 3.6, -33), Vector3(4, 3.6, -39), Vector3(16, 3.6, -39)]:
		prop(cyl(0.12, 0.12, 6.8), Color("#d9d2c0"), c)

	# dam waterfall at back-left
	var fall_mat := ShaderMaterial.new()
	fall_mat.shader = FALL_SHADER
	var pm := PlaneMesh.new()
	pm.size = Vector2(14, 2.2)
	pm.orientation = PlaneMesh.FACE_Z
	var fall := MeshUtil.mesh_instance(pm, self, Vector3(-42, 0.9, -25.2), false)
	fall.material_override = fall_mat
	fall.rotation.x = -0.25

	# live oaks on the right bank (a sunny landing beach kept clear) and behind the wall
	var spots: Array[Vector2] = []
	for i in 26:
		var tx := 26.0 + r() * 22.0
		var tz := -30.0 + r() * 60.0
		if tx < 44.0 and tz > -8.0 and tz < 18.0:
			continue
		spots.append(Vector2(tx, tz))
	for i in 18:
		spots.append(Vector2(-60.0 + r() * 100.0, -34.0 - r() * 14.0))
	for s in spots:
		var y := 2.7 if s.y < -28.0 else ground_h(s.x, s.y)
		forest.place(Vector3(s.x, y, s.y), 9.0 + r() * 5.0, int(r() * 5), false, r() * TAU)
	for i in 12:
		var bx := 24.0 + r() * 20.0
		var bz := -24.0 + r() * 48.0
		if not (bx < 44.0 and bz > -8.0 and bz < 18.0):
			forest.bush(Vector3(bx, ground_h(bx, bz), bz), 1.0 + r())


## Spray-painted graffiti on grey concrete.
func _graffiti() -> ImageTexture:
	var w := 1024
	var h := 256
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color("#9aa3a6"))
	var cols := ["#ff5fa2", "#32d3c2", "#ffd23f", "#6c5ce7", "#ff7b39", "#3dbbf5", "#2a2f45", "#b5f25a"]
	for i in 70:
		var col := Color(cols[i % cols.size()])
		var lw := 6 + int(r() * 18)
		var p := Vector2(r() * w, h * (0.25 + r() * 0.5))
		for k in 4:
			var q := p + Vector2((r() - 0.3) * 60.0, (r() - 0.5) * 50.0)
			var steps := int(p.distance_to(q) / 2.0) + 1
			for s in steps:
				var c := p.lerp(q, float(s) / steps)
				img.fill_rect(Rect2i(int(c.x) - lw / 2, int(c.y) - lw / 2, lw, lw).intersection(Rect2i(0, 0, w, h)), col)
			p = q
	# concrete stains
	for i in 300:
		var c := Vector2i(int(r() * w), int(r() * h))
		img.fill_rect(Rect2i(c, Vector2i(2 + int(r() * 5), 2 + int(r() * 5))).intersection(Rect2i(0, 0, w, h)), Color(0.5, 0.52, 0.5, 1).lerp(Color("#9aa3a6"), r()))
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)


func _grass_pass() -> void:
	var where := func(x: float, z: float, y: float) -> Color:
		if y < 0.6 or x < 28.0:
			return Color(0, 0, 0, 0)
		var c := Color("#8fae42").lerp(Color("#bfc05e"), sin(z * 0.4) * 0.5 + 0.5)
		c.a = MeshUtil.ss(x, 28.0, 32.0)
		return c
	grass(Rect2(26, -30, 44, 60), 9.0, where, 0.5)

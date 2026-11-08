# Level 8 — Shallow golden-bottom river wading with heavy sun sparkle (painting 16).
extends World


func _bank_l(z: float) -> float:
	return -14.0 + sin(z * 0.04) * 3.0 # rocky beach side


func _bank_r(z: float) -> float:
	return 26.0 + sin(z * 0.03 + 1.0) * 2.0 # retaining wall side


func ground_h(x: float, z: float) -> float:
	var l := _bank_l(z)
	var rr := _bank_r(z)
	# shallow golden shelf on the near side, deeper channel toward the far bank
	var across := clampf((x - l) / (rr - l), 0.0, 1.0)
	var h := -0.25 - MeshUtil.ss(across, 0.45, 0.75) * 1.0 + sin(x * 1.3 + z * 0.8) * 0.04 + sin(x * 0.3 - z * 0.2) * 0.06
	h = lerpf(h, 0.5 + (l - x) * 0.12, MeshUtil.ss(l - x, -1.5, 1.5))
	h = lerpf(h, 1.6, MeshUtil.ss(x - rr, -0.5, 0.5))
	return h


func _config() -> Dictionary:
	return {
		"name": "Golden River", "seed": 82, "glint": 2.2,
		"fog": ["#cfe3ea", 50, 220], "ground_tint": "#a39556",
		"water_y": 0.0, "water_opts": {"w": 400.0, "d": 400.0, "color": "#2a9c8c", "clear": 0.14},
		"bounds": {"x0": -26, "x1": 25, "z0": -70, "z1": 40},
		"start": {"x": -9.0, "z": 24.0, "heading": PI * 0.92},
		"player": "lab", "buddies": ["whiteDoodle", "doodle"],
	}


func treat_spot() -> Vector2:
	var z := -60.0 + r() * 90.0
	return Vector2(_bank_l(z) - 3.0 + r() * 22.0, z)


func _build() -> void:
	var gold := Color("#c9a64e")
	var ochre := Color("#a8873e")
	var teal := Color("#4f8d78")
	var beach := Color("#e3d6b6")
	var grass := Color("#9fb54a")
	var color := func(x: float, z: float, y: float) -> Color:
		var n := sin(x * 3.1) * cos(z * 2.6) * 0.5 + 0.5
		if y < 0.0:
			return gold.lerp(ochre, n * 0.6).lerp(teal, clampf(-y - 0.6, 0.0, 1.0) * 0.6)
		if x < 0.0:
			return beach.lerp(grass, MeshUtil.ss(_bank_l(z) - x, 3.0, 9.0) * 0.8)
		return grass
	terrain({"w": 120.0, "d": 180.0, "cx": 5.0, "cz": -20.0, "seg": 1.3, "detail": "pebbles", "caustics": 1.0, "color": color})

	# mottled stones on the bed + bank rocks
	var stones := [Color("#d6b55e"), Color("#b89448"), Color("#c9c0a2"), Color("#9e8a52"), Color("#e2c877")]
	var place_stone := func(_i: int) -> Dictionary:
		var z := -80.0 + r() * 130.0
		var x := _bank_l(z) - 4.0 + r() * 30.0
		var rad := 0.08 + r() * r() * 0.35
		return {"p": Vector3(x, ground_h(x, z) - rad * 0.2, z), "s": Vector3(rad * 1.4, rad * 0.5, rad), "c": pick(stones)}
	scatter(orb(1.0, 8, 6), MeshUtil.ground_mat("", 0.35, 0.0, 0.0, Color.WHITE, 0.9), 1600, place_stone)
	var place_rock := func(_i: int) -> Dictionary:
		var z := -80.0 + r() * 130.0
		var x := _bank_l(z) - r() * 3.0
		var rad := 0.3 + r() * 0.6
		return {"p": Vector3(x, ground_h(x, z), z), "s": Vector3(rad * 1.3, rad * 0.6, rad), "c": pick([Color("#e6dcc4"), Color("#d4c8aa")])}
	scatter(rock_mesh(1), MeshUtil.ground_mat("boulder", 0.5, 0.85), 120, place_rock, true)

	# stone retaining wall on the far bank
	var wall_a := MeshUtil.std(Color("#d8d2c2"), 1.0)
	var wall_b := MeshUtil.std(Color("#c7c0ad"), 1.0)
	var block := box(1, 1.8, 2.6)
	var wz := -90.0
	while wz < 50.0:
		var m := MeshUtil.mesh_instance(block, self, Vector3(_bank_r(wz) + 0.6, 0.7, wz), false)
		m.material_override = wall_a if r() < 0.5 else wall_b
		wz += 2.5

	# trees: golden-yellow cottonwoods on the near bank, deep green on the far bank
	for i in 26:
		var z := -85.0 + r() * 125.0
		var x := _bank_l(z) - 4.0 - r() * 10.0
		forest.tree(Vector3(x, ground_h(x, z), z), 7.0 + r() * 4.0, 0.65)
	for i in 26:
		var z := -85.0 + r() * 125.0
		var x := _bank_r(z) + 3.0 + r() * 10.0
		forest.tree(Vector3(x, 1.6, z), 7.0 + r() * 5.0, 0.05)

	# distant downtown skyline beyond the bend
	for i in 6:
		var h := 18.0 + r() * 30.0
		prop(box(6.0 + r() * 6.0, h, 6.0), Color("#8fa3b3"), Vector3(-10.0 + i * 7.0 + r() * 4.0, h / 2.0, -150.0 - r() * 20.0), 1.0, false)
	for i in 160:
		forest.blob(-50.0 + r() * 100.0, 2.0 + r() * 6.0, -120.0 - r() * 15.0, 3.0 + r() * 3.0, pick([Color("#7fa65a"), Color("#99b45a"), Color("#6a9a5f")]))


func _grass_pass() -> void:
	var g := Color("#9fb54a")
	var where := func(x: float, z: float, y: float) -> Color:
		if y < 0.4:
			return Color(0, 0, 0, 0)
		var c := g.lerp(Color("#c4c06a"), sin(x * 0.5 + z * 0.3) * 0.5 + 0.5)
		if x < 0.0:
			c.a = MeshUtil.ss(_bank_l(z) - x, 3.0, 8.0)
		else:
			c.a = 1.0 if x > _bank_r(z) + 1.5 else 0.0
		return c
	grass(Rect2(-55, -90, 105, 140), 9.0, where, 0.5)

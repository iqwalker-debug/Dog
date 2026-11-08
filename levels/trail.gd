# Level 5 — Shaded oak trail pack walk (paintings 11 & 14).
# You are the walker: 4 dogs on verlet-rope leashes trot ahead, sniff, pull, and sit when you stop.
extends LevelBase

const Z0 := 14.0
const Z1 := -150.0
const LEASH_LEN := 3.6
const LINKS := 15

var arc := PackedFloat32Array() # cumulative path length at each table sample (z from Z0 down)
var path_len := 0.0
var walker: Dictionary
var npcs: Array[Dictionary] = []
var pack: Array[Dictionary] = []
var third_person := false
var s := 6.0
var lateral := 0.0
var speed := 0.0
var autopilot := false
var ground_mat: ShaderMaterial
var _step_t := 0.0


# ------------------------------------------------------------------ path (winds gently downhill)

func _px(z: float) -> float:
	return 6.0 * sin(z * 0.04) + 3.0 * sin(z * 0.11)


func _dpx(z: float) -> float:
	return 0.24 * cos(z * 0.04) + 0.33 * cos(z * 0.11)


func _init() -> void:
	var z := Z0
	var prev := Vector2(_px(z), z)
	arc.append(0.0)
	while z > Z1:
		z -= 0.25
		var p := Vector2(_px(z), z)
		arc.append(arc[arc.size() - 1] + p.distance_to(prev))
		prev = p
	path_len = arc[arc.size() - 1]


func _z_at(sv: float) -> float:
	var i := clampi(arc.bsearch(clampf(sv, 0.0, path_len)), 1, arc.size() - 1)
	var f := (sv - arc[i - 1]) / maxf(1e-6, arc[i] - arc[i - 1])
	return Z0 - (i - 1 + clampf(f, 0.0, 1.0)) * 0.25


## unit tangent (direction of travel) at path z
func _tan(z: float) -> Vector3:
	return Vector3(-_dpx(z), 0, -1).normalized()


func path_dist(x: float, z: float) -> float:
	var zc := clampf(z, Z1, Z0)
	var d := absf(x - _px(zc)) / sqrt(1.0 + _dpx(zc) * _dpx(zc))
	return Vector2(d, absf(z - zc)).length()


func _base_h(x: float, z: float) -> float:
	return -z * 0.035 + 0.5 * sin(x * 0.07) * cos(z * 0.05) + 0.2 * sin(x * 0.21 + z * 0.17)


func ground_h(x: float, z: float) -> float:
	return ground_hd(x, z, path_dist(x, z))


func ground_hd(x: float, z: float, d: float) -> float:
	return _base_h(x, z) + MeshUtil.ss(d, 2.5, 14.0) * 1.8 + sin(x * 1.3 + z * 0.9) * 0.04


## point on the path at arc length sv, offset sideways by lat
func on_path(sv: float, lat := 0.0) -> Vector3:
	var z := _z_at(sv)
	var t := _tan(z)
	var x := _px(z) - t.z * lat
	var zz := z + t.x * lat
	return Vector3(x, ground_h(x, zz), zz)


func tan_at(sv: float) -> Vector3:
	return _tan(_z_at(sv))


# ------------------------------------------------------------------ build

func _ready() -> void:
	rng.seed = 7
	glint = 1.0
	setup_env(["#d8e6c8", 25, 95], Color("#7a7a45"), 300.0)
	env.ambient_light_energy = 0.8
	set_help("W/S walk · A/D drift · Shift brisk · V camera · Space call dogs · B bark · L next level · 1 swimming hole · M sound")
	_build_ground()
	_build_trees()
	_build_scatter()
	finish_build()
	_build_people()
	_build_pack()
	if main and main.args.has("walk"):
		autopilot = true


func _build_ground() -> void:
	var dirt := Color("#c9a77c")
	var dirt_light := Color("#e6cfa4")
	var litter := Color("#b07d45")
	var moss := Color("#6f8a3a")
	var under := Color("#4d6b2c")
	var color := func(x: float, z: float, _y: float) -> Color:
		var d := path_dist(x, z)
		var n := sin(x * 3.1) * cos(z * 2.7) * 0.5 + 0.5
		return dirt.lerp(dirt_light, n * 0.6).lerp(litter, MeshUtil.ss(d, 1.0, 2.2) * 0.8).lerp(moss.lerp(under, n), MeshUtil.ss(d, 2.0, 4.5))
	terrain({"w": 90.0, "d": 180.0, "cz": -68.0, "seg": 1.5, "detail": "trail", "detail_scale": 0.4, "detail_strength": 0.8, "color": color})


func _build_trees() -> void:
	var leaf_cols := [Color("#b9d04a"), Color("#94b83b"), Color("#6e9a34"), Color("#d8dc5c"), Color("#5a8a30"), Color("#c7d84f")]
	var sv := -10.0
	while sv < path_len + 10.0:
		for side in [-1.0, 1.0]:
			if r() < 0.25:
				continue
			var base := on_path(sv, side * (3.0 + r() * 6.0))
			# tilt slightly toward the path so canopies arch over it
			var t := tan_at(clampf(sv, 0.0, path_len))
			var tilt := Basis(t, side * (0.08 + r() * 0.1))
			forest.place(base, 9.0 + r() * 5.0, 5 if r() < 0.15 else int(r() * 5), false, r() * TAU, tilt)
			# understory shrubs
			for k in 2:
				forest.bush(on_path(sv + (r() - 0.5) * 4.0, side * (2.6 + r() * 3.0)), 0.9 + r() * 1.1)
			for k in 2:
				var p := on_path(sv + (r() - 0.5) * 4.0, side * (2.4 + r() * 3.0))
				var c: Color = pick(leaf_cols)
				forest.blob(p.x, p.y + 0.3 + r() * 0.6, p.z, 0.4 + r() * 0.5, c * 0.75)
		sv += 3.2 + r() * 2.5


func _build_scatter() -> void:
	# limestone rocks
	var rock_cols := [Color("#cfc8b6"), Color("#b9b3a3"), Color("#d9d2bf"), Color("#a9a596")]
	var place_rock := func(_i: int) -> Dictionary:
		var p := on_path(r() * path_len, (-1.0 if r() < 0.5 else 1.0) * (1.2 + r() * 3.5) * (0.4 if r() < 0.15 else 1.0))
		var rad := 0.12 + r() * r() * 0.7
		return {"p": p - Vector3(0, rad * 0.15, 0), "s": Vector3(rad * 1.4, rad * 0.9, rad), "c": pick(rock_cols)}
	scan_scatter(160, place_rock)
	# leaf litter
	var litter_cols := [Color("#c4772f"), Color("#9b5b2a"), Color("#d8a33c"), Color("#7d5530"), Color("#e0b850")]
	var leaf := PlaneMesh.new()
	leaf.size = Vector2(0.07, 0.045)
	var place_leaf := func(_i: int) -> Dictionary:
		var p := on_path(r() * path_len, (r() - 0.5) * 5.5)
		return {"p": p + Vector3(0, 0.02, 0), "s": 0.7 + r(), "c": pick(litter_cols), "rot": Vector3((r() - 0.5) * 0.4, r() * 6.0, (r() - 0.5) * 0.4)}
	var lm := MeshUtil.ground_mat()
	scatter(leaf, lm, 2500, place_leaf)
	# wildflowers
	var flowers: Array[Dictionary] = []
	for i in 520:
		var p := on_path(r() * path_len, (-1.0 if r() < 0.5 else 1.0) * (1.6 + r() * 2.5))
		flowers.append({"p": p + Vector3(0, 0.2 + r() * 0.25, 0), "y": r() < 0.7})
	var stem_mesh := MeshUtil.to_mesh(MeshUtil.prim(cyl(0.006, 0.008, 1.0, 4), Transform3D(Basis(), Vector3(0, -0.5, 0))))
	var place_stem := func(i: int) -> Dictionary:
		var p: Vector3 = flowers[i].p
		return {"p": p, "s": Vector3(1, maxf(0.05, p.y - ground_h(p.x, p.z)), 1), "c": Color("#5f7d2e"), "rot": Vector3.ZERO}
	scatter(stem_mesh, MeshUtil.ground_mat(), flowers.size(), place_stem)
	var head_mat := MeshUtil.ground_mat("", 0.35, 0.0, 0.0, Color.WHITE, 0.7)
	head_mat.set_shader_parameter("emission_color", Color("#3a2a00"))
	head_mat.set_shader_parameter("emission_v", 1.0)
	var place_head := func(i: int) -> Dictionary:
		var f: Dictionary = flowers[i]
		return {"p": f.p, "s": 1.0 if f.y else 0.6, "c": Color("#f2c218") if f.y else Color("#f4f1e6")}
	var disc := PlaneMesh.new()
	disc.size = Vector2(0.11, 0.11)
	scatter(disc, head_mat, flowers.size(), place_head)
	var place_eye := func(i: int) -> Dictionary:
		var f: Dictionary = flowers[i]
		return {"p": f.p + Vector3(0, 0.01, 0), "s": 1.0 if f.y else 0.5, "c": Color("#3a2412")}
	scatter(orb(0.02, 6, 4), MeshUtil.ground_mat(), flowers.size(), place_eye)


# ------------------------------------------------------------------ people

func _make_person(shirt := "#f2f0ea", bottoms := "#d9caa6", skin := "#d7a27c", hair := "#3b2a1e", long := false) -> Dictionary:
	var g := Node3D.new()
	add_child(g)
	var add := func(mesh: Mesh, color: String, pos: Vector3, parent: Node3D) -> MeshInstance3D:
		var mi := MeshUtil.mesh_instance(mesh, parent, pos)
		mi.material_override = MeshUtil.std(Color(color), 0.8)
		return mi
	var body: MeshInstance3D = add.call(_capsule(0.17, 0.45), shirt, Vector3(0, 1.25, 0), g)
	body.scale = Vector3(1.05, 1, 0.7)
	add.call(orb(0.12, 14, 10), skin, Vector3(0, 1.72, 0), g)
	var hair_cap := MeshUtil.to_mesh(MeshUtil.sphere(14, 10, PI * 0.55, Transform3D(Basis.from_scale(Vector3.ONE * 0.125), Vector3.ZERO)))
	add.call(hair_cap, hair, Vector3(0, 1.74, -0.01), g)
	if long:
		add.call(orb(0.06, 8, 6), hair, Vector3(0, 1.84, -0.08), g) # bun
	var limbs: Array[Dictionary] = []
	for sx in [-1.0, 1.0]:
		var hip := Node3D.new()
		hip.position = Vector3(sx * 0.1, 0.95, 0)
		g.add_child(hip)
		add.call(_capsule(0.07, 0.75), bottoms if long else skin, Vector3(0, -0.45, 0), hip)
		if not long:
			add.call(_capsule(0.085, 0.25), bottoms, Vector3(0, -0.12, 0), hip)
		add.call(box(0.1, 0.06, 0.24), "#e8e6e0", Vector3(0, -0.9, 0.04), hip)
		var sh := Node3D.new()
		sh.position = Vector3(sx * 0.24, 1.48, 0)
		g.add_child(sh)
		add.call(_capsule(0.05, 0.55), skin, Vector3(0, -0.32, 0), sh)
		limbs.append({"hip": hip, "sh": sh, "s": sx})
	return {"g": g, "body": body, "limbs": limbs, "ph": 0.0}


static func _capsule(rad: float, length: float) -> CapsuleMesh:
	var c := CapsuleMesh.new()
	c.radius = rad
	c.height = length + rad * 2.0
	c.radial_segments = 10
	c.rings = 4
	return c


func _person_update(p: Dictionary, dt: float, spd: float, hold := false) -> void:
	p.ph += dt * spd * 4.2
	var a := minf(1.0, spd) * 0.45
	for l in p.limbs:
		var hip: Node3D = l.hip
		var sh: Node3D = l.sh
		hip.rotation.x = sin(p.ph + (PI if l.s > 0 else 0.0)) * a
		sh.rotation.x = -0.55 if hold else sin(p.ph + (0.0 if l.s > 0 else PI)) * a * 0.8
	var body: MeshInstance3D = p.body
	body.position.y = 1.25 + absf(sin(p.ph)) * 0.03


func _hand(p: Dictionary, side: float) -> Vector3:
	var sh: Node3D = p.limbs[1 if side > 0 else 0].sh
	return sh.to_global(Vector3(0, -0.62, 0.05))


func _build_people() -> void:
	walker = _make_person("#f4f2ec", "#d6c7a3", "#d7a27c", "#4a3324")
	npcs = [
		{"p": _make_person("#9fb58a", "#3f5f8f", "#d7a27c", "#1c1714", true), "s": 16.0, "lat": 0.2, "v": 1.05},
		{"p": _make_person("#3f5e86", "#2d3346", "#d7a27c", "#c9a46a"), "s": 34.0, "lat": 0.5, "v": 1.15},
		{"p": _make_person("#f0eee6", "#33415a", "#d7a27c", "#e6d4ae", true), "s": 36.0, "lat": -0.3, "v": 1.15},
	]


# ------------------------------------------------------------------ the pack (painting 14 order)

func _build_pack() -> void:
	var spec := [
		{"breed": "creamGolden", "leash": "#d8364a", "slot": -0.8, "ahead": 2.4},
		{"breed": "bernedoodle", "leash": "#7fd6b8", "slot": -0.28, "ahead": 3.6},
		{"breed": "husky", "leash": "#e8822e", "slot": 0.28, "ahead": 3.9},
		{"breed": "redGolden", "leash": "#1d1d20", "slot": 0.8, "ahead": 2.5},
	]
	for i in spec.size():
		var d: Dictionary = spec[i].duplicate()
		var dog := Dog.new(d.breed)
		add_child(dog)
		var start := on_path(6.0 + d.ahead, d.slot)
		dog.position = start
		var pts: Array[Vector3] = []
		var prev: Array[Vector3] = []
		for k in LINKS + 1:
			pts.append(start)
			prev.append(start)
		var mat := MeshUtil.std(Color(d.leash), 0.6)
		mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		var mesh := ImmediateMesh.new()
		var mi := MeshInstance3D.new()
		mi.mesh = mesh
		mi.material_override = mat
		add_child(mi)
		var handle := MeshUtil.mesh_instance(_capsule(0.025, 0.09), self)
		handle.material_override = mat
		d.merge({"dog": dog, "pts": pts, "prev": prev, "mesh": mesh, "handle": handle, "heading": PI, "vel": Vector3.ZERO,
			"sniffT": 3.0 + r() * 8.0 + i * 2.0, "sniffing": 0.0, "wander": r() * 10.0})
		pack.append(d)


func _step_leash(L: Dictionary, hand: Vector3, collar: Vector3, dt: float) -> void:
	var pts: Array[Vector3] = L.pts
	var prev: Array[Vector3] = L.prev
	var g := -9.8 * dt * dt
	var seg := LEASH_LEN / LINKS
	for k in range(1, pts.size() - 1):
		var p := pts[k]
		var v := (p - prev[k]) * 0.96
		prev[k] = p
		p += v
		p.y += g
		var fl := ground_hd(p.x, p.z, 0.5) + 0.01
		if p.y < fl:
			p.y = fl
		pts[k] = p
	pts[0] = hand
	pts[pts.size() - 1] = collar
	for it in 18:
		for k in pts.size() - 1:
			var dvec := pts[k + 1] - pts[k]
			var ln := maxf(dvec.length(), 1e-6)
			if ln < seg:
				continue # rope: only resists stretching
			var diff := (ln - seg) / ln
			var wa := 0.0 if k == 0 else 0.5
			var wb := 0.0 if k + 1 == pts.size() - 1 else 0.5
			pts[k] += dvec * diff * wa
			pts[k + 1] -= dvec * diff * wb
	# draw as a thin tube
	var mesh: ImmediateMesh = L.mesh
	mesh.clear_surfaces()
	mesh.surface_begin(Mesh.PRIMITIVE_TRIANGLES)
	var radial := 5
	var rad := 0.011
	var rings: Array = []
	for k in pts.size():
		var dir := (pts[mini(k + 1, pts.size() - 1)] - pts[maxi(k - 1, 0)]).normalized()
		if dir.length_squared() < 0.5:
			dir = Vector3.FORWARD
		var u := dir.cross(Vector3.UP if absf(dir.y) < 0.9 else Vector3.RIGHT).normalized()
		var w := dir.cross(u).normalized()
		var ring := []
		for a in radial:
			var ang := float(a) / radial * TAU
			ring.append([pts[k] + (u * cos(ang) + w * sin(ang)) * rad, u * cos(ang) + w * sin(ang)])
		rings.append(ring)
	for k in pts.size() - 1:
		for a in radial:
			var b := (a + 1) % radial
			for q in [rings[k][a], rings[k + 1][a], rings[k][b], rings[k][b], rings[k + 1][a], rings[k + 1][b]]:
				mesh.surface_set_normal(q[1])
				mesh.surface_add_vertex(q[0])
	mesh.surface_end()


# ------------------------------------------------------------------ input + loop

func _key(k: Key) -> void:
	match k:
		KEY_V:
			third_person = not third_person
		KEY_B:
			if main and pack.size():
				var d: Dog = pack[randi() % pack.size()].dog
				main.sfx.play(d.bark_sound(), d.position, -3.0)
		KEY_SPACE:
			for d in pack:
				d.sniffing = 0.0
				d.dog.sniff(false)
		KEY_1:
			if main:
				main.call_deferred("load_level", "swimhole")
		KEY_L:
			if main:
				main.next_level()


func _process(delta: float) -> void:
	var dt := minf(delta, 0.05)
	time += dt

	# walker
	var fwd := (1.0 if (held(KEY_W) or held(KEY_UP)) else 0.0) - (1.0 if (held(KEY_S) or held(KEY_DOWN)) else 0.0)
	var side := (1.0 if (held(KEY_D) or held(KEY_RIGHT)) else 0.0) - (1.0 if (held(KEY_A) or held(KEY_LEFT)) else 0.0)
	if drag != null:
		fwd = clampf(-drag.dy / 100.0 + 0.5, -1, 1)
		side = clampf(drag.dx / 100.0, -1, 1)
	if autopilot:
		fwd = 1.0
	var top := 2.4 if held(KEY_SHIFT) else 1.4
	speed = lerpf(speed, fwd * top, 1.0 - exp(-dt * 3))
	# dogs that are sniffing hold you back a little
	var holding := 0
	for d in pack:
		if d.sniffing > 0:
			holding += 1
	s = clampf(s + speed * dt * (1.0 - holding * 0.12), 0.0, path_len - 12.0)
	lateral = clampf(lateral + side * dt * 1.2, -1.1, 1.1)
	var wp := on_path(s, lateral)
	var tan := tan_at(s)
	var yaw := atan2(tan.x, tan.z)
	var wg: Node3D = walker.g
	wg.position = wp
	wg.rotation.y = yaw
	_person_update(walker, dt, absf(speed), true)
	if absf(speed) > 0.3 and main and main.sfx:
		_step_t -= dt * absf(speed)
		if _step_t <= 0.0:
			_step_t = 0.62
			main.sfx.play("step_dirt", wp, -10.0)

	# other walkers ahead, looping
	for n in npcs:
		n.s += n.v * dt
		if n.s > s + 60.0:
			n.s = s + 14.0 + r() * 6.0
		if n.s < s + 8.0:
			n.s = s + 8.0
		var ng: Node3D = n.p.g
		ng.position = on_path(n.s, n.lat)
		var nt := tan_at(n.s)
		ng.rotation.y = atan2(nt.x, nt.z)
		_person_update(n.p, dt, n.v)

	# camera: POV holding leashes, or 3rd-person behind
	var look: Vector3
	if third_person:
		var tgt := wp - tan * 4.2
		tgt.y = wp.y + 2.6
		camera.position = camera.position.lerp(tgt, 1.0 - exp(-dt * 4))
		look = wp + tan * 3.0
		look.y = wp.y + 0.6
	else:
		camera.position = wp - tan * 0.05
		camera.position.y = wp.y + 1.62
		look = wp + tan * 7.0
		look.y = ground_h(look.x, look.z) + 0.25
	camera.look_at(look)
	wg.visible = third_person

	# dogs
	var right := Vector3(-tan.z, 0, tan.x)
	for i in pack.size():
		var d := pack[i]
		var dog: Dog = d.dog
		var p := dog.position
		# hand: in POV the leashes gather just below the camera; in 3rd person, the walker's hands
		var hand: Vector3
		if third_person:
			hand = _hand(walker, -1.0 if i < 2 else 1.0)
		else:
			hand = camera.position + tan * 0.42 + right * ((i - 1.5) * 0.04)
			hand.y = camera.position.y - 0.55
		var handle: MeshInstance3D = d.handle
		handle.position = hand
		handle.rotation = Vector3(0.4, yaw, 0)

		# sniff breaks
		d.sniffT -= dt
		if d.sniffT < 0 and d.sniffing <= 0:
			d.sniffing = 1.5 + r() * 2.5
			d.sniffT = 6.0 + r() * 10.0
			d.wander = r() * 10.0
		if d.sniffing > 0:
			d.sniffing -= dt
		dog.sniff(d.sniffing > 0)

		# target slot ahead on the path, with a little weave
		var lat: float = d.slot + sin(time * 0.4 + d.wander) * 0.35 + (signf(d.slot) * 0.6 if d.sniffing > 0 else 0.0)
		var tgt := on_path(s + d.ahead + sin(time * 0.3 + i) * 0.4, lat)
		var want := tgt - p
		want.y = 0
		var dist := want.length()
		var max_v: float = 0.0 if d.sniffing > 0 else maxf(0.2, absf(speed) * 1.15 + dist * 0.8)
		d.vel = d.vel.lerp(want.normalized() * minf(max_v, dist * 2.2), 1.0 - exp(-dt * 3))
		# personal space
		for o in pack:
			if o.dog == dog:
				continue
			var away: Vector3 = p - o.dog.position
			away.y = 0
			var l := away.length()
			if l < 0.7 and l > 1e-4:
				d.vel += away.normalized() * (0.7 - l) * 3.0 * dt * 20.0
		p.x += d.vel.x * dt
		p.z += d.vel.z * dt
		# leash keeps them within reach
		var from_hand := p - hand
		from_hand.y = 0
		var reach := LEASH_LEN * 0.9
		if from_hand.length() > reach:
			var np := hand + from_hand.normalized() * reach
			p.x = np.x
			p.z = np.z
		dog.position.x = p.x
		dog.position.z = p.z

		var v := Vector2(d.vel.x, d.vel.z).length()
		if v > 0.15:
			d.heading = atan2(d.vel.x, d.vel.z)
		elif d.sniffing <= 0:
			d.heading = lerp_angle(d.heading, yaw, dt)
		dog.rotation.y = d.heading
		dog.update(dt, v, false, ground_hd(p.x, p.z, 0.5))
		dog.set_fur_detail(24 if camera.position.distance_to(p) < 6.0 else 12)
		_step_leash(d, hand, dog.collar_world(), dt)

	if main:
		main.set_debug("%d fps · %d/%d m" % [Engine.get_frames_per_second(), s, path_len])


func _grass_pass() -> void:
	var where := func(x: float, z: float, _y: float) -> Color:
		var d := path_dist(x, z)
		if d < 2.2:
			return Color(0, 0, 0, 0)
		var n := sin(x * 1.1) * cos(z * 0.9) * 0.5 + 0.5
		var c := Color("#6f8a3a").lerp(Color("#93a845"), n)
		c.a = MeshUtil.ss(d, 2.2, 3.6) * 0.9
		return c
	grass(Rect2(-30, -155, 60, 172), 9.0, where, 0.45)

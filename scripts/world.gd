# Shared engine for dog-controlled outdoor levels: player dog (swim / wade / walk), buddy AI
# (follow, wander, sniff, chase the ball, bring it back), 12 treats per level, and a fetch race.
# Levels extend this, describe themselves in _config(), and only build scenery in _build().
class_name World
extends LevelBase

var cfg: Dictionary
var water_y = null # float, or null for a dry level
var dog: Dog
var buddies: Array[Dictionary] = []
var treats: Array[Node3D] = []
var got := 0
var fetch_score := 0
var ball: MeshInstance3D
var ball_v := Vector3.ZERO
var ball_state := "idle" # idle | flying | down | atFeet | carried
var carrier: Dog = null
var heading := 0.0
var speed := 0.0
var ripples: Array[Dictionary] = []
var autopilot := false # --walk: drive forward on a gentle curve (for testing)
var _step_t := 0.0
var _paddle_t := 0.0
var _pant_t := 0.0
var _bark_reply := -1.0

static var _ripple_mesh: ArrayMesh
static var _bone_mat: StandardMaterial3D


## Level description. Keys: name, fog [color, near, far], ground_tint, water_y (or absent),
## water_opts, bounds {x0, x1, z0, z1}, start {x, z, heading}, player, buddies, treats, seed, glint, help
func _config() -> Dictionary:
	return {}


## Build the scenery (terrain, rocks, trees...).
func _build() -> void:
	pass


## Where a treat may go.
func treat_spot() -> Vector2:
	return Vector2.ZERO


## Extra no-go areas inside the bounds.
func blocked(_x: float, _z: float) -> bool:
	return false


func _ready() -> void:
	cfg = _config()
	rng.seed = cfg.get("seed", 11)
	water_y = cfg.get("water_y", null)
	glint = cfg.get("glint", 1.0)
	setup_env(cfg.get("fog", ["#cfe0e8", 40, 160]), Color(cfg.get("ground_tint", "#7a7a45")))
	if water_y != null and cfg.get("water", true):
		var wo: Dictionary = cfg.get("water_opts", {})
		wo = wo.duplicate()
		wo.y = water_y
		water(wo)
	_build()
	finish_build()
	_spawn_dogs()
	_spawn_treats()
	_make_ball()
	set_help("%s · WASD move · Shift run · Space splash · F fetch · B bark · E shake · C sit · L level · 1-0 breed · M mute%s"
		% [cfg.get("name", ""), (" · " + cfg.help) if cfg.has("help") else ""])
	_score()
	snap_camera()


# ------------------------------------------------------------------ setup

func _spawn_dogs() -> void:
	var st: Dictionary = cfg.start
	heading = st.heading
	dog = Dog.new(cfg.get("player", "golden"))
	add_child(dog)
	dog.position = Vector3(st.x, ground_h(st.x, st.z), st.z)
	dog.rotation.y = heading
	var i := 0
	for b in cfg.get("buddies", []):
		var d := Dog.new(b)
		add_child(d)
		var x: float = st.x + (i + 1) * 1.6
		d.position = Vector3(x, ground_h(x, st.z + 1), st.z + 1)
		buddies.append({"dog": d, "heading": st.heading, "vel": Vector3.ZERO,
			"off": Vector3((1 if i % 2 else -1) * (1.4 + i * 0.6), 0, -1.2 - i * 0.8), "wanderT": rng.randf() * 5, "sniff": 0.0})
		i += 1


func _spawn_treats() -> void:
	if not _bone_mat:
		_bone_mat = MeshUtil.std(Color("#f6e7c3"), 0.5)
		_bone_mat.emission_enabled = true
		_bone_mat.emission = Color("#6b4a10")
		_bone_mat.emission_energy_multiplier = 0.6
	for i in cfg.get("treats", 12):
		var p := treat_spot()
		var b := Node3D.new()
		var shaft := MeshInstance3D.new()
		shaft.mesh = cyl(0.035, 0.035, 0.22, 10)
		shaft.rotation.z = PI / 2
		shaft.material_override = _bone_mat
		b.add_child(shaft)
		for x in [-0.11, 0.11]:
			for z in [-0.035, 0.035]:
				var k := MeshInstance3D.new()
				k.mesh = orb(0.045, 10, 8)
				k.position = Vector3(x, 0, z)
				k.material_override = _bone_mat
				b.add_child(k)
		var gy := ground_h(p.x, p.y)
		var y: float = (water_y + 0.05) if (water_y != null and gy < water_y) else gy + 0.25
		b.position = Vector3(p.x, y, p.y)
		b.set_meta("y", y)
		add_child(b)
		treats.append(b)


func _make_ball() -> void:
	ball = MeshInstance3D.new()
	ball.mesh = LevelBase.orb(0.06, 14, 10)
	ball.material_override = MeshUtil.std(Color("#d4ef3a"), 0.7)
	ball.visible = false
	add_child(ball)


func _ripple(x: float, z: float, k := 1.0) -> void:
	if water_y == null:
		return
	if not _ripple_mesh:
		var v := PackedVector3Array()
		var n := PackedVector3Array()
		var idx := PackedInt32Array()
		var segs := 40
		for s in segs:
			var a := float(s) / segs * TAU
			v.append(Vector3(cos(a) * 0.9, 0, sin(a) * 0.9))
			v.append(Vector3(cos(a), 0, sin(a)))
			n.append(Vector3.UP)
			n.append(Vector3.UP)
		for s in segs:
			var a0 := s * 2
			var a1 := ((s + 1) % segs) * 2
			idx.append_array([a0, a0 + 1, a1, a1, a0 + 1, a1 + 1])
		_ripple_mesh = MeshUtil.to_mesh(MeshUtil.fix_winding({"v": v, "n": n, "i": idx}))
	var m := MeshInstance3D.new()
	m.mesh = _ripple_mesh
	var mat := MeshUtil.unshaded(Color.WHITE, 0.5 * k)
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.render_priority = 2
	m.material_override = mat
	m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	m.position = Vector3(x, water_y + 0.03, z)
	add_child(m)
	ripples.append({"m": m, "mat": mat, "t": 0.0, "k": k})


func _sfx(name: String, pos = null, db := 0.0) -> void:
	if main and main.sfx:
		main.sfx.play(name, pos, db)


func _toast(msg: String) -> void:
	if main:
		main.toast(msg)


func _score() -> void:
	if main:
		main.set_score("🦴 %d/%d  ·  🎾 %d" % [got, treats.size(), fetch_score])


# ------------------------------------------------------------------ input

func _key(k: Key) -> void:
	match k:
		KEY_E:
			dog.shake()
		KEY_C:
			dog.set_pose("lie" if dog.pose == "sit" else ("auto" if dog.pose == "lie" else "sit"))
		KEY_L:
			if main:
				main.next_level()
		KEY_F:
			throw_ball()
		KEY_SPACE:
			if dog.mode == "swim":
				for i in 3:
					_ripple(dog.position.x, dog.position.z, 1.6)
				dog.splash()
				_sfx("splash_big", dog.position, -2.0)
		KEY_B:
			_sfx(dog.bark_sound(), dog.position, -1.0)
			_bark_reply = 0.5 + randf() * 0.6
	if k >= KEY_0 and k <= KEY_9:
		swap_breed(Breeds.ORDER[(int(k - KEY_0) + 9) % 10])


func _double_click() -> void:
	throw_ball()


func swap_breed(key: String) -> void:
	var old := dog
	dog = Dog.new(key)
	add_child(dog)
	dog.position = old.position
	dog.rotation.y = heading
	if carrier == old:
		carrier = dog
	old.queue_free()
	_toast(dog.dog_name)


func throw_ball() -> void:
	if ball_state == "flying":
		return
	if carrier == dog:
		fetch_score += 1
		_score()
	carrier = null
	ball_state = "flying"
	ball.visible = true
	var p := dog.position
	ball.position = Vector3(p.x, p.y + 1.2, p.z)
	var dist := 9.0 + randf() * 6.0
	var a := heading + (randf() - 0.5) * 0.5
	ball_v = Vector3(sin(a) * dist * 0.55, 6, cos(a) * dist * 0.55)
	_sfx("whoosh", ball.position, -4.0)
	_toast("Fetch! 🎾")


# ------------------------------------------------------------------ loop

func in_bounds(x: float, z: float) -> bool:
	var b: Dictionary = cfg.bounds
	return x > b.x0 and x < b.x1 and z > b.z0 and z < b.z1 and not blocked(x, z)


## swim if deeper than ~80% of leg height; wade otherwise
func step_dog(d: Dog, dt: float, spd: float) -> bool:
	var p := d.position
	var gy := ground_h(p.x, p.z)
	var depth: float = 0.0 if water_y == null else water_y - gy
	var swim := depth > 0.8 * (0.66 if d == dog else 0.6)
	if not swim and depth > 0.05:
		d.wetten(dt * 0.6)
		if absf(spd) > 0.3 and randf() < dt * 4:
			_ripple(p.x, p.z, 0.6)
	d.update(dt, spd, swim, gy, water_y if water_y != null else 0.0)
	if swim and randf() < dt * (1 + absf(spd)):
		_ripple(p.x, p.z, 0.7)
	if d.shook:
		d.shook = false
		_sfx("shake", d.position, -3.0 if d == dog else -9.0)
	if d == dog:
		_dog_sounds(dt, spd, swim, depth)
	return swim


## Paws, paddling and panting for the player's dog.
func _dog_sounds(dt: float, spd: float, swim: bool, depth: float) -> void:
	var p := dog.position
	var mv := absf(spd)
	if swim:
		_paddle_t -= dt
		if _paddle_t <= 0.0 and mv > 0.2:
			_paddle_t = 0.42
			_sfx("paddle", p, -10.0)
		return
	if mv > 0.3:
		_step_t -= dt * (1.0 + mv * 0.45)
		if _step_t <= 0.0:
			_step_t = 0.3
			_sfx("step_water" if depth > 0.05 else "step_dirt", p, -12.0 if depth > 0.05 else -16.0)
	_pant_t -= dt
	if _pant_t <= 0.0:
		_pant_t = 0.5 / (1.0 + minf(mv / 4.0, 1.0) * 0.6)
		if dog.pose != "lie":
			_sfx("pant", p + Vector3(0, 0.4, 0), -20.0 + minf(mv, 4.0) * 1.2)


func _process(delta: float) -> void:
	var dt := minf(delta, 0.05)
	time += dt
	for a in animated:
		a.call(time, dt)

	# player
	var turn := (1.0 if (held(KEY_A) or held(KEY_LEFT)) else 0.0) - (1.0 if (held(KEY_D) or held(KEY_RIGHT)) else 0.0)
	var thrust := (1.0 if (held(KEY_W) or held(KEY_UP)) else 0.0) - (0.5 if (held(KEY_S) or held(KEY_DOWN)) else 0.0)
	if drag != null:
		turn = clampf(-drag.dx / 120.0, -1, 1)
		thrust = clampf(-drag.dy / 120.0 + 0.6, -0.5, 1)
	if autopilot:
		thrust = 1.0
		turn = sin(time * 0.3) * 0.35
	var swimming := dog.mode == "swim"
	var top := 2.6 if swimming else (7.0 if held(KEY_SHIFT) else 3.2)
	heading += turn * dt * 2.0
	speed = lerpf(speed, thrust * top, 1.0 - exp(-dt * (2.0 if swimming else 4.0)))
	var p := dog.position
	var nx := p.x + sin(heading) * speed * dt
	var nz := p.z + cos(heading) * speed * dt
	# can't climb walls steeper than ~1:1 (keeps you off the bluff face)
	var rise := ground_h(nx, nz) - ground_h(p.x, p.z)
	if in_bounds(nx, nz) and rise < absf(speed * dt) * 1.2 + 0.05:
		dog.position.x = nx
		dog.position.z = nz
	else:
		speed *= 0.4
	dog.rotation.y = heading
	dog.look_target = ball.position if (ball_state == "flying" or ball_state == "down") else null
	step_dog(dog, dt, speed)
	p = dog.position

	# buddies: follow, wander, chase the ball
	var fwd := Vector3(sin(heading), 0, cos(heading))
	for b in buddies:
		var bd: Dog = b.dog
		var bp := bd.position
		var target: Vector3
		if ball_state == "down" or (ball_state == "flying" and ball_v.y < 0):
			target = ball.position
		elif carrier == bd:
			target = p + fwd * 1.2
		else:
			b.wanderT -= dt
			if b.wanderT < 0:
				b.wanderT = 4 + rng.randf() * 6
				b.off = Vector3((rng.randf() - 0.5) * 6, 0, (rng.randf() - 0.5) * 6)
				b.sniff = (2 + rng.randf() * 2) if rng.randf() < 0.4 else 0.0
			target = p + b.off
		b.sniff = maxf(0.0, b.sniff - dt)
		bd.sniff(b.sniff > 0 and ball_state != "down")
		var want := target - bp
		want.y = 0
		var dist := want.length()
		var chasing := ball_state == "down" or carrier == bd
		var max_v: float = 0.0 if (b.sniff > 0 and not chasing) else (5.5 if chasing else minf(4.0, dist * 0.9))
		var goal: Vector3 = want.normalized() * max_v if dist > 0.6 else Vector3.ZERO
		b.vel = b.vel.lerp(goal, 1.0 - exp(-dt * 3))
		var bx: float = bp.x + b.vel.x * dt
		var bz: float = bp.z + b.vel.z * dt
		if in_bounds(bx, bz) and ground_h(bx, bz) - ground_h(bp.x, bp.z) < 0.25:
			bd.position.x = bx
			bd.position.z = bz
		else:
			b.vel *= -0.3
		var v := Vector2(b.vel.x, b.vel.z).length()
		if v > 0.2:
			b.heading = atan2(b.vel.x, b.vel.z)
		bd.rotation.y = b.heading
		bd.look_target = ball.position if (ball_state == "flying" or ball_state == "down") else dog.position + Vector3(0, 0.4, 0)
		step_dog(bd, dt, v)
		# buddy drops the ball at your feet
		if carrier == bd and dist < 1.4:
			carrier = null
			ball.position = Vector3(bd.position.x, ground_h(bd.position.x, bd.position.z) + 0.06, bd.position.z)
			ball_state = "atFeet"
			_sfx(bd.bark_sound(), bd.position, -3.0)
			_toast("%s brought it back!" % bd.dog_name)

	# a buddy answers your bark
	if _bark_reply > 0.0:
		_bark_reply -= dt
		if _bark_reply <= 0.0 and buddies.size():
			var bd: Dog = buddies[randi() % buddies.size()].dog
			_sfx(bd.bark_sound(), bd.position, -4.0)

	# ball physics + pickup
	if ball_state == "flying":
		ball_v.y -= 9.8 * dt
		ball.position += ball_v * dt
		var floor_y := maxf(ground_h(ball.position.x, ball.position.z), water_y if water_y != null else -1e9) + 0.06
		if ball.position.y < floor_y:
			ball.position.y = floor_y
			ball_state = "down"
			_ripple(ball.position.x, ball.position.z, 1.2)
			var wet_landing: bool = water_y != null and ground_h(ball.position.x, ball.position.z) < water_y
			_sfx("splash" if wet_landing else "thud", ball.position, -4.0)
	if ball_state == "down" or ball_state == "atFeet":
		if water_y != null and ground_h(ball.position.x, ball.position.z) < water_y:
			ball.position.y = water_y + 0.04 + sin(time * 3) * 0.01
		var everyone: Array[Dog] = [dog]
		for b in buddies:
			everyone.append(b.dog)
		for d in everyone:
			if ball_state == "atFeet" and d != dog:
				continue
			if d.position.distance_to(ball.position) < 0.9:
				carrier = d
				ball_state = "carried"
				if d == dog:
					_toast("Got it! Press F to throw again")
				break
	if ball_state == "carried" and carrier:
		ball.position = carrier.mouth_world()

	# treats
	for b in treats:
		if not b.visible:
			continue
		b.rotation.y += dt * 1.5
		b.position.y = b.get_meta("y") + sin(time * 2 + b.position.x) * 0.05
		if b.position.distance_to(p) < 1.0:
			b.visible = false
			got += 1
			_sfx("fanfare" if got == treats.size() else "treat", null, -6.0)
			_toast("All treats found! 🏆 Press L for the next level" if got == treats.size() else "Treat! %d/%d" % [got, treats.size()])
			_score()

	# ripples
	for i in range(ripples.size() - 1, -1, -1):
		var rp: Dictionary = ripples[i]
		rp.t += dt
		var s: float = 0.3 + rp.t * 2.0 * rp.k
		var m: MeshInstance3D = rp.m
		m.scale = Vector3(s, 1, s)
		var mat: StandardMaterial3D = rp.mat
		mat.albedo_color.a = maxf(0.0, 0.45 * rp.k * (1.0 - rp.t / 2.0))
		if rp.t > 2:
			m.queue_free()
			ripples.remove_at(i)

	# chase camera, low like the paintings
	var base := maxf(p.y, water_y if water_y != null else -1e9)
	var cam_pos := Vector3(p.x - sin(heading) * 4.6, base + 1.5, p.z - cos(heading) * 4.6)
	var gh := ground_h(cam_pos.x, cam_pos.z)
	if gh + 0.6 > cam_pos.y:
		cam_pos.y = gh + 0.6
	var look := Vector3(p.x + sin(heading) * 8, base + 0.3, p.z + cos(heading) * 8)
	camera.position = camera.position.lerp(cam_pos, 1.0 - exp(-dt * 4))
	if camera.position.distance_to(look) > 0.01:
		camera.look_at(look)
	var all_dogs: Array[Dog] = [dog]
	for b in buddies:
		all_dogs.append(b.dog)
	for d in all_dogs:
		var cd := d.position.distance_to(camera.position)
		d.set_fur_detail(24 if cd < 10 else (12 if cd < 25 else 6))

	if main:
		main.set_debug("%d fps · %s · wet %.2f" % [Engine.get_frames_per_second(), dog.mode, dog.wet])


## Snap the camera behind the dog (no easing) — used on level start.
func snap_camera() -> void:
	var p := dog.position
	var base := maxf(p.y, water_y if water_y != null else -1e9)
	camera.position = Vector3(p.x - sin(heading) * 4.6, base + 1.5, p.z - cos(heading) * 4.6)
	camera.look_at(Vector3(p.x + sin(heading) * 8, base + 0.3, p.z + cos(heading) * 8))

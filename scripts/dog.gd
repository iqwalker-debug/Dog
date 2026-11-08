# Sculpted dog: one smooth body + head (blended shapes), breed markings painted into the fur,
# two-segment legs, breed ears/tails, collar or harness. Gaits: swim, walk/trot/run, shake.
# Poses: sit / lie (auto when idle), sniff. Face: blinking eyes, panting jaw, tongue.
class_name Dog
extends Node3D

static var _cache := {} # "breed/part" -> [skin ArrayMesh, fur ArrayMesh]; sculpted once per breed
static var _skin_mat: ShaderMaterial
static var _dark: StandardMaterial3D
static var _eye: StandardMaterial3D
static var _pupil: StandardMaterial3D
static var _white: StandardMaterial3D
static var _nostril: StandardMaterial3D
static var _tongue: StandardMaterial3D
static var _mouth: StandardMaterial3D
static var _drop_mesh: SphereMesh

const TAILS := {
	"feather": {"n": 5, "len": 0.1, "r0": 0.045, "r1": 0.025, "root": -0.55, "bend": -0.12, "fur": 2.0},
	"plume": {"n": 5, "len": 0.1, "r0": 0.05, "r1": 0.035, "root": 0.9, "bend": 0.5, "fur": 1.8},
	"otter": {"n": 4, "len": 0.11, "r0": 0.06, "r1": 0.022, "root": -0.35, "bend": -0.06, "fur": 1.0},
	"pom": {"n": 4, "len": 0.1, "r0": 0.045, "r1": 0.04, "root": 0.6, "bend": 0.22, "fur": 1.1},
	"stub": {"n": 1, "len": 0.05, "r0": 0.04, "r1": 0.03, "root": 0.3, "bend": 0.0, "fur": 1.0},
}
const DROPS := 160

var breed: String
var dog_name: String
var B: Dictionary
var W: float
var S: float
var D: float
var fl: float
var coat: Color
var second: Color

var rig: Node3D
var neck: Node3D
var head: Node3D
var jaw: Node3D
var nose: Node3D
var tongue: Node3D
var tail_root: Node3D
var tail_segs: Array[Node3D] = []
var legs: Array[Dictionary] = []
var ears: Array[Dictionary] = []
var lids: Array[Node3D] = []
var fur_mat: ShaderMaterial
var tail_mat: ShaderMaterial
var shells := 20

var drops: MultiMeshInstance3D
var _d_pos := PackedVector3Array()
var _d_vel := PackedVector3Array()
var _d_life := PackedFloat32Array()
var _d_idx := 0
var _d_alive := false

var t := randf() * 10.0
var gait := 0.0
var splash_t := 0.0
var shake_t := 0.0
var wet := 0.0
var land_time := 0.0
var prev_y := 0.0
var prev_vy := 0.0
var mode := "swim"
var mouth_open := 0.0
var idle := 0.0
var blink_t := 2.0
var pose_mode := "auto"
var pose := "stand"
var sit_b := 0.0
var lie_b := 0.0
var sniffing := false
var sniff_b := 0.0
var wag_base := 0.0
var eye_x := 0.0
var eye_y := 0.0
var eye_z := 0.0


static func _materials() -> void:
	if _skin_mat:
		return
	_skin_mat = MeshUtil.vcolor_mat(0.9, Color("#b8b8b8"))
	_dark = MeshUtil.std(Color("#1a1412"), 0.3)
	_eye = MeshUtil.std(Color("#3b2210"), 0.05)
	_pupil = MeshUtil.std(Color("#050403"), 0.05)
	_white = MeshUtil.unshaded(Color.WHITE)
	_nostril = MeshUtil.unshaded(Color("#050404"))
	_tongue = MeshUtil.std(Color("#e46f7c"), 0.3)
	_mouth = MeshUtil.std(Color("#5b2329"), 0.5)
	_drop_mesh = SphereMesh.new()
	_drop_mesh.radius = 0.028
	_drop_mesh.height = 0.056
	_drop_mesh.radial_segments = 6
	_drop_mesh.rings = 3
	_drop_mesh.material = MeshUtil.unshaded(Color("#e8f6ff"), 0.85)


func _init(key := "golden") -> void:
	_materials()
	breed = key if Breeds.DATA.has(key) else "golden"
	B = Breeds.DATA[breed]
	dog_name = B.name
	W = B.width
	S = B.size
	D = B.get("depth", 0.82) # torso depth (vertical)
	fl = B.furLen
	coat = Color(B.coat)
	second = Color(B.second)
	var dens := 52.0 if B.curl > 0.5 else 72.0
	fur_mat = Fur.material(B.curl, dens, 0.25)
	tail_mat = Fur.material(B.curl, dens, 0.6)
	shells = mini(32, int(B.shells * 1.5))
	_build()


func _tint(p: Vector3, part: String) -> Color:
	return coat.lerp(second, clampf(Breeds.mark(breed, p, part), 0.0, 1.0))


func _node(parent: Node3D, pos := Vector3.ZERO) -> Node3D:
	var n := Node3D.new()
	n.rotation_order = EULER_ORDER_XYZ
	n.position = pos
	parent.add_child(n)
	return n


## skin + fur shells for one part; meshes are sculpted once per breed and shared
func _furred(id: String, make: Callable, parent: Node3D, fur_scale := 1.0, tail := false) -> void:
	var key := breed + "/" + id
	if not _cache.has(key):
		var d: Dictionary = make.call()
		_cache[key] = [MeshUtil.to_mesh(d, _skin_mat), Fur.shells_mesh(d, shells, fl * fur_scale, null)]
	var pair: Array = _cache[key]
	MeshUtil.mesh_instance(pair[0], parent)
	var f := MeshUtil.mesh_instance(pair[1], parent, Vector3.ZERO, false)
	f.material_override = tail_mat if tail else fur_mat


func _plain(mesh: Mesh, mat: Material, pos: Vector3, parent: Node3D, scl := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshUtil.mesh_instance(mesh, parent, pos)
	mi.material_override = mat
	mi.scale = scl
	return mi


static func _sphere_mesh(r: float, w := 16, h := 12) -> SphereMesh:
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = w
	m.rings = h
	return m


static func _capsule(r: float, length: float, radial := 10, rings := 4) -> CapsuleMesh:
	var m := CapsuleMesh.new()
	m.radius = r
	m.height = length + 2.0 * r
	m.radial_segments = radial
	m.rings = rings
	return m


static func _cone(r: float, h: float, seg := 8) -> CylinderMesh:
	var m := CylinderMesh.new()
	m.top_radius = 0.0
	m.bottom_radius = r
	m.height = h
	m.radial_segments = seg
	m.rings = 1
	m.cap_top = false
	return m


## three-style transform: scale, then rotate about Z, then translate
static func _srt(scl: Vector3, rot_z: float, tr: Vector3, rot_x := 0.0) -> Transform3D:
	var b := Basis(Vector3.RIGHT, rot_x) * Basis(Vector3.BACK, rot_z) * Basis.from_scale(scl)
	return Transform3D(b, tr)


func _build() -> void:
	rig = _node(self)
	rig.scale = Vector3.ONE * S
	var v3 := func(x: float, y: float, z: float) -> Vector3: return Vector3(x, y, z)

	# ---- body: chest, ribs, hips, neck, shoulders, thighs blended like clay ----
	var make_body := func() -> Dictionary:
		var s := Sculpt.new(0.1)
		s.ellipsoid(v3.call(0, 0.0, 0.3), v3.call(0.23 * W, 0.29 * D, 0.28))
		s.capsule(v3.call(0, 0.03, 0.3), v3.call(0, 0.06, -0.32), 0.215 * W * D, 0.17 * W * D)
		s.ellipsoid(v3.call(0, 0.06, -0.42), v3.call(0.2 * W, 0.21 * D, 0.23))
		s.capsule(v3.call(0, 0.12, 0.38), v3.call(0, 0.36, 0.6), 0.16 * W, 0.12 * W)
		for sx in [1.0, -1.0]:
			s.ellipsoid(v3.call(sx * 0.15 * W, -0.04, 0.3), v3.call(0.09, 0.2, 0.13))
			s.ellipsoid(v3.call(sx * 0.13 * W, -0.06, -0.42), v3.call(0.1, 0.21, 0.16))
		return MeshUtil.colorize(s.build(v3.call(0, 0.08, 0.05), 0.85, 54), _tint.bind("body"))
	_furred("body", make_body, rig)

	# ---- head: skull + upper muzzle + brows + cheeks + lips, eye sockets carved; separate jaw ----
	neck = _node(rig, Vector3(0, 0.4, 0.64))
	head = _node(neck)
	var sn: float = B.snout
	var frenchie := breed == "frenchie"
	var skull_r := Vector3(0.165, 0.15, 0.145) if frenchie else Vector3(0.13 * W, 0.13, 0.15)
	var muzzle_r := 0.095 if frenchie else 0.072
	var muzzle_end := 0.06 + sn
	eye_x = (0.085 if frenchie else 0.065) * W
	eye_y = 0.035 if frenchie else 0.05
	eye_z = 0.115 if frenchie else 0.105
	var ex := eye_x
	var ey := eye_y
	var ez := eye_z

	# fur is short on the muzzle and around the eyes, longer on skull and cheeks
	var face_len := func(p: Vector3) -> float:
		var muzzle := MeshUtil.ss(p.z, 0.04, 0.1)
		var near_eye := minf(Vector3(absf(p.x) - ex, p.y - ey, p.z - ez).length(), 0.1) / 0.1
		return maxf(0.15, (1.0 - 0.8 * muzzle) * (0.3 + 0.7 * near_eye))
	var with_len := func(d: Dictionary, fn: Callable) -> Dictionary:
		var a := PackedFloat32Array()
		var verts: PackedVector3Array = d.v
		a.resize(verts.size())
		for i in verts.size():
			a[i] = fn.call(verts[i])
		d.len = a
		return d
	var head_fur := 0.75
	var short_fur := func(_p: Vector3) -> float: return 0.35
	var make_head := func() -> Dictionary:
		var s := Sculpt.new(0.04)
		s.ellipsoid(Vector3(0, 0.04, -0.02), skull_r)
		s.capsule(Vector3(0, -0.02, 0.05), Vector3(0, -0.035, muzzle_end), muzzle_r, muzzle_r * 0.82) # upper muzzle
		for sx in [1.0, -1.0]:
			s.ellipsoid(Vector3(sx * ex, ey + 0.03, ez - 0.02), Vector3(0.035, 0.018, 0.03)) # brows
			s.ellipsoid(Vector3(sx * 0.075 * W, -0.03, 0.03), Vector3(0.065, 0.065, 0.075)) # cheeks
			s.ellipsoid(Vector3(sx * 0.045, -0.07, 0.04 + sn * 0.6), Vector3(0.03, 0.035, maxf(0.05, sn * 0.5))) # lips
		if frenchie: # nose-roll and forehead wrinkles
			s.capsule(Vector3(-0.06, 0.005, 0.15), Vector3(0.06, 0.005, 0.15), 0.022)
			s.capsule(Vector3(-0.05, 0.11, 0.11), Vector3(0.05, 0.11, 0.11), 0.014)
			s.capsule(Vector3(-0.04, 0.14, 0.09), Vector3(0.04, 0.14, 0.09), 0.012)
		s.carve_sphere(Vector3(ex, ey, ez + 0.015), 0.03)
		s.carve_sphere(Vector3(-ex, ey, ez + 0.015), 0.03)
		var d := MeshUtil.colorize(s.build(Vector3(0, 0, 0.08), 0.34, 46), _tint.bind("head"))
		return with_len.call(d, face_len)
	_furred("head", make_head, head, head_fur)

	# nose: wide leather pad with nostrils
	var nose_z := muzzle_end + muzzle_r * 0.82 - 0.012
	nose = _node(head, Vector3(0, -0.02, nose_z))
	var nose_w := 0.05 if frenchie else 0.034
	_plain(_sphere_mesh(1.0, 18, 12), _dark, Vector3.ZERO, nose, Vector3(nose_w, nose_w * 0.72, nose_w * 0.7))
	for sx in [-1.0, 1.0]:
		_plain(_sphere_mesh(nose_w * 0.28, 8, 6), _nostril, Vector3(sx * nose_w * 0.42, -nose_w * 0.2, nose_w * 0.52), nose)

	# eyes: brown iris, pupil, catch-light; lids = rotating skin caps
	for sx in [-1.0, 1.0]:
		var g := _node(head, Vector3(sx * ex, ey, ez + 0.004))
		var r := 0.03 if frenchie else 0.022
		_plain(_sphere_mesh(r, 16, 12), _eye, Vector3.ZERO, g)
		_plain(_sphere_mesh(r * 0.55, 12, 8), _pupil, Vector3(0, 0, r * 0.62), g)
		_plain(_sphere_mesh(r * 0.18, 8, 6), _white, Vector3(-sx * r * 0.3, r * 0.35, r * 0.9), g)
		var lid := _node(g)
		var cap := MeshUtil.to_mesh(MeshUtil.sphere(14, 8, PI * 0.6, Transform3D(Basis.from_scale(Vector3.ONE * r * 1.12), Vector3.ZERO)))
		_plain(cap, MeshUtil.std(_tint(Vector3(sx * ex, ey + 0.03, ez), "head") * Color(0.8, 0.8, 0.8), 0.9), Vector3.ZERO, lid)
		lid.rotation.x = -0.9
		lids.append(lid)

	# jaw hinges open for panting; mouth interior + tongue ride on it
	jaw = _node(head, Vector3(0, -0.065, 0.02))
	var jaw_tint := func(p: Vector3) -> Color: return _tint(Vector3(p.x, p.y - 0.065, p.z + 0.04), "head")
	var make_jaw := func() -> Dictionary:
		var s := Sculpt.new(0.04)
		s.capsule(Vector3(0, -0.01, 0.0), Vector3(0, -0.012, sn * 0.85 + 0.03), 0.06 if frenchie else 0.045, 0.055 if frenchie else 0.04)
		s.ellipsoid(Vector3(0, -0.03, 0.0), Vector3(0.06, 0.04, 0.06))
		var d := MeshUtil.colorize(s.build(Vector3(0, -0.02, 0.07), 0.2, 30), jaw_tint)
		return with_len.call(d, short_fur)
	_furred("jaw", make_jaw, jaw, head_fur)
	_plain(_sphere_mesh(1.0, 14, 10), _mouth, Vector3(0, 0.02, sn * 0.45 + 0.02), jaw, Vector3(0.05, 0.022, maxf(0.06, sn * 0.5)))
	tongue = _node(jaw, Vector3(0, 0.012, sn * 0.5))
	var tg := MeshUtil.to_mesh(MeshUtil.prim(_capsule(0.03, 0.11, 10, 6), Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3(0, 0, 0.07))))
	_plain(tg, _tongue, Vector3.ZERO, tongue, Vector3(1.7 if frenchie else 1.4, 0.35, 1.0))

	# ---- ears ----
	for sx in [-1.0, 1.0]:
		var pivot := _node(head)
		var ear_type: String = B.ears
		var make: Callable
		if ear_type == "flop":
			pivot.position = Vector3(sx * 0.15 * W, 0.09, -0.01)
			make = func() -> Dictionary: return MeshUtil.sphere(14, 10, PI, _srt(Vector3(0.03, 0.105, 0.07), sx * 0.18, Vector3(sx * 0.04, -0.07, 0)))
		elif ear_type == "erect":
			pivot.position = Vector3(sx * 0.075, 0.15, -0.04)
			make = func() -> Dictionary: return MeshUtil.prim(_cone(0.055, 0.13), _srt(Vector3(1, 1, 0.45), -sx * 0.25, Vector3(sx * 0.015, 0.06, 0)))
		else: # bat
			pivot.position = Vector3(sx * 0.1, 0.14, -0.03)
			make = func() -> Dictionary: return MeshUtil.prim(_cone(0.07, 0.15, 10), _srt(Vector3(1, 1, 0.4), -sx * 0.35, Vector3(sx * 0.03, 0.06, 0)))
		var make_ear := func() -> Dictionary: return MeshUtil.colorize(make.call(), _tint.bind("ear"))
		_furred("ear%d" % int(sx), make_ear, pivot, 1.1 if ear_type == "flop" else 0.4)
		ears.append({"pivot": pivot, "s": sx, "ang": 0.0, "vel": 0.0})

	# ---- tail: chain of segments ----
	var T: Dictionary = TAILS[B.tail]
	tail_root = _node(rig, Vector3(0, 0.14, -0.6))
	tail_root.rotation.x = T.root
	wag_base = T.root
	var parent := tail_root
	var n: int = T.n
	for i in n:
		var seg := _node(parent)
		if i > 0:
			seg.position.z = -T.len
			seg.rotation.x = T.bend
		tail_segs.append(seg)
		var r: float = lerpf(T.r0, T.r1, float(i) / maxf(1.0, n - 1))
		var part := "tailTip" if (i >= n - 2 and n > 2) else "tail"
		var tl: float = T.len
		var make_tail := func() -> Dictionary: return MeshUtil.colorize(MeshUtil.prim(_capsule(r, tl, 8, 4), Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3(0, 0, -tl / 2))), _tint.bind(part))
		_furred("tail%d" % i, make_tail, seg, T.fur, true)
		parent = seg

	# ---- legs: upper + lower + paw, pivots at shoulder/hip and elbow/knee ----
	var top := 0.12
	var paw_r := 0.045
	var seg_len: float = (B.legH / S - top - paw_r) / 2.0
	var spec := [[-1.0, 0.3, true], [1.0, 0.3, true], [-1.0, -0.42, false], [1.0, -0.42, false]]
	var phases := [0.0, PI, PI * 0.5, PI * 1.5]
	for i in 4:
		var sx: float = spec[i][0]
		var front: bool = spec[i][2]
		var hip := _node(rig, Vector3(sx * 0.13 * W, -top, spec[i][1]))
		var knee := _node(hip, Vector3(0, -seg_len, 0))
		var r_u := 0.07 if front else 0.085
		var make_upper := func() -> Dictionary: return MeshUtil.colorize(MeshUtil.prim(_capsule(r_u, seg_len), Transform3D(Basis(), Vector3(0, -seg_len / 2, 0))), _tint.bind("leg"))
		_furred("upper%d" % i, make_upper, hip, 0.7)
		var make_lower := func() -> Dictionary: return MeshUtil.colorize(MeshUtil.prim(_capsule(0.05, seg_len), Transform3D(Basis(), Vector3(0, -seg_len / 2, 0))), _tint.bind("paw"))
		_furred("lower%d" % i, make_lower, knee, 0.5)
		var make_paw := func() -> Dictionary: return MeshUtil.colorize(MeshUtil.sphere(12, 8, PI, Transform3D(Basis.from_scale(Vector3(0.055, paw_r, 0.075)), Vector3(0, -seg_len, 0.025))), _tint.bind("paw"))
		_furred("paw%d" % i, make_paw, knee, 0.4)
		legs.append({"hip": hip, "knee": knee, "front": front, "restU": -0.04 if front else 0.32, "restK": 0.06 if front else -0.62, "phase": phases[i]})

	# ---- gear ----
	var gear: Array = B.gear
	if gear.size():
		var gm := MeshUtil.std(Color(gear[1]), 0.6)
		var off := fl * 0.7
		var collar := _plain(_torus(0.09, 28, 8), gm, Vector3(0, 0.3, 0.53), rig, Vector3(0.15 * W + off, 0.15 + off, 0.15))
		collar.rotation.x = -0.75
		if gear[0] == "harness":
			for zr in [[0.38, 0.24], [0.08, 0.22]]:
				var z: float = zr[0]
				var band := _plain(_torus(0.035, 32, 6), gm, Vector3(0, 0.03, z), rig,
					Vector3(zr[1] * W * (0.6 + 0.4 * D) + off * 0.6, 0.29 * D + off * 0.6, 1.0))
				band.rotation.x = -0.35 if z > 0.2 else 0.0
			var bx := BoxMesh.new()
			bx.size = Vector3(0.2 * W, 0.04, 0.34)
			_plain(bx, gm, Vector3(0, 0.29 * D + 0.03 + off * 0.6, 0.22), rig)

	# ---- droplets (shake-off spray), simulated in world space ----
	drops = MultiMeshInstance3D.new()
	drops.top_level = true
	drops.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = _drop_mesh
	mm.instance_count = DROPS
	mm.visible_instance_count = 0
	drops.multimesh = mm
	drops.custom_aabb = AABB(Vector3(-1e4, -1e4, -1e4), Vector3(2e4, 2e4, 2e4))
	add_child(drops)
	_d_pos.resize(DROPS)
	_d_vel.resize(DROPS)
	_d_life.resize(DROPS)


## ring in the XY plane (like THREE.TorusGeometry(1, tube)), scaled by its node
static func _torus(tube: float, radial: int, tubular: int) -> ArrayMesh:
	var key := "torus%.3f" % tube
	if _cache.has(key):
		return _cache[key]
	var m := TorusMesh.new()
	m.inner_radius = 1.0 - tube
	m.outer_radius = 1.0 + tube
	m.rings = radial
	m.ring_segments = tubular
	var mesh := MeshUtil.to_mesh(MeshUtil.prim(m, Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3.ZERO)))
	_cache[key] = mesh
	return mesh


# ------------------------------------------------------------------ api

func splash() -> void:
	splash_t = 0.6


func shake() -> void:
	if shake_t <= 0.0:
		shake_t = 1.1


## 'auto' (sits after 4s idle, lies down after 12s), 'stand', 'sit', 'lie'
func set_pose(p: String) -> void:
	pose_mode = p


func sniff(on := true) -> void:
	sniffing = on


## wading: get wet without swimming
func wetten(amount: float) -> void:
	wet = minf(1.0, wet + amount)
	land_time = 0.0


func mouth_world() -> Vector3:
	return jaw.to_global(Vector3(0, 0.02, B.snout * 0.6 + 0.05))


func collar_world() -> Vector3:
	return rig.to_global(Vector3(0, 0.3, 0.55))


## fur LOD: 24 = full shells, fewer when far from the camera
func set_fur_detail(k: int) -> void:
	var use := ceili(k / 24.0 * shells)
	var frac := float(clampi(use, 1, shells)) / shells + 0.001
	fur_mat.set_shader_parameter("max_shell", frac)
	tail_mat.set_shader_parameter("max_shell", frac)


func _emit_drops(count: int, spread: float) -> void:
	var wp := rig.global_position
	for k in count:
		var i := _d_idx % DROPS
		_d_idx += 1
		var a := randf() * TAU
		_d_pos[i] = Vector3(wp.x + cos(a) * 0.4 * S, wp.y + 0.1 + randf() * 0.3, wp.z + sin(a) * 0.4 * S)
		_d_vel[i] = Vector3(cos(a) * spread * (0.5 + randf()), 1.0 + randf() * 2.5, sin(a) * spread * (0.5 + randf()))
		_d_life[i] = 1.0
	_d_alive = true


static func _damp(dt: float, rate: float) -> float:
	return 1.0 - exp(-dt * rate)


## speed: forward speed (m/s); in_water: swimming; ground_y / water_y: heights under the dog
func update(dt: float, speed: float, in_water := true, ground_y := -1.4, water_y := 0.0) -> void:
	t += dt
	var run := minf(absf(speed) / 5.0, 1.0)
	mode = "swim" if in_water else "land"
	var wag_speed := 2.0
	var wag_amp := 0.3
	var tail_lift := 0.0
	var leg_h: float = B.legH

	if in_water:
		wet = minf(1.0, wet + dt * 2.0)
		land_time = 0.0
		position.y = lerpf(position.y, water_y, _damp(dt, 6.0))
		gait += dt * (4.0 + absf(speed) * 1.5)
		rig.position.y = -0.1 * S + sin(t * 2.6) * 0.035 + (sin(splash_t * 10.0) * 0.12 if splash_t > 0.0 else 0.0)
		rig.rotation.x = -0.2
		for l in legs:
			var ph: float = gait + l.phase
			var hip: Node3D = l.hip
			var knee: Node3D = l.knee
			hip.rotation.x = (-0.9 if l.front else 0.1) + sin(ph) * 0.7
			knee.rotation.x = (0.9 if l.front else -0.6) + maxf(0.0, sin(ph + 1.3)) * 0.8 * (1.0 if l.front else -1.0)
		tail_lift = -0.4
		wag_amp = 0.25
		tongue.visible = false
		mouth_open = 0.04
		sit_b = 0.0
		lie_b = 0.0
	else:
		land_time += dt
		if land_time > 0.5 and land_time < 0.6 and wet > 0.6:
			shake()
		wet = maxf(0.0, wet - dt * (0.6 if shake_t > 0.0 else 0.02))
		position.y = lerpf(position.y, ground_y + leg_h, _damp(dt, 10.0))
		gait += dt * (3.0 + absf(speed) * 2.6 / maxf(S, 0.6))
		var move := minf(1.0, absf(speed) * 2.0)
		var swing := (0.25 + run * 0.55) * move
		for l in legs:
			var ph: float = gait + l.phase
			var hip: Node3D = l.hip
			var knee: Node3D = l.knee
			hip.rotation.x = l.restU + sin(ph) * swing
			var lift := maxf(0.0, sin(ph + 1.2)) * (0.5 + run * 0.6) * move
			knee.rotation.x = l.restK + (lift if l.front else -lift)
		rig.position.y = absf(sin(gait)) * 0.04 * run
		rig.rotation.x = sin(gait * 2.0) * 0.03 * run
		wag_speed = 8.0 + run * 6.0
		wag_amp = 0.55
		tail_lift = 0.15
		tongue.visible = true
		mouth_open = 0.32 + run * 0.12 + sin(t * 9.0) * 0.05 # panting
		idle = idle + dt if absf(speed) < 0.2 else 0.0

		# ---- poses: sit / lie, blended in when stopped ----
		pose = ("lie" if idle > 12.0 else ("sit" if idle > 4.0 else "stand")) if pose_mode == "auto" else pose_mode
		if absf(speed) > 0.3:
			pose = "stand"
		var k := _damp(dt, 4.0)
		sit_b = lerpf(sit_b, 1.0 if pose == "sit" else 0.0, k)
		lie_b = lerpf(lie_b, 1.0 if pose == "lie" else 0.0, k)
		var lie_drop := leg_h - 0.22 * S
		rig.position.y += -0.3 * leg_h * sit_b - lie_drop * lie_b
		rig.rotation.x += -0.42 * sit_b
		for l in legs:
			var hip: Node3D = l.hip
			var knee: Node3D = l.knee
			if l.front:
				hip.rotation.x = lerpf(hip.rotation.x, 0.42, sit_b)
				knee.rotation.x = lerpf(knee.rotation.x, 0.0, sit_b)
				hip.rotation.x = lerpf(hip.rotation.x, -1.45, lie_b) # paws forward
				knee.rotation.x = lerpf(knee.rotation.x, 0.15, lie_b)
			else:
				hip.rotation.x = lerpf(hip.rotation.x, -0.75, sit_b) # haunches
				knee.rotation.x = lerpf(knee.rotation.x, 2.3, sit_b)
				hip.rotation.x = lerpf(hip.rotation.x, -1.3, lie_b)
				knee.rotation.x = lerpf(knee.rotation.x, 2.5, lie_b)
		tail_lift -= 0.6 * (sit_b + lie_b)
		wag_amp *= 1.0 - 0.6 * lie_b

	sniff_b = lerpf(sniff_b, 1.0 if (sniffing and not in_water) else 0.0, _damp(dt, 5.0))
	neck.rotation.x = 0.75 * sniff_b
	if sniff_b > 0.5:
		mouth_open = 0.02
		nose.scale = Vector3.ONE * (1.0 + sin(t * 30.0) * 0.06)
	else:
		nose.scale = Vector3.ONE

	# tail wag travels down the chain
	tail_root.rotation.x = wag_base + tail_lift
	tail_root.rotation.y = sin(t * wag_speed) * wag_amp
	for i in range(1, tail_segs.size()):
		tail_segs[i].rotation.y = sin(t * wag_speed - i * 0.7) * wag_amp * 0.35

	if shake_t > 0.0:
		var env := sin(minf(shake_t / 1.1, 1.0) * PI)
		rig.rotation.z = sin(t * 42.0) * 0.45 * env
		neck.rotation.z = sin(t * 42.0 - 0.8) * 0.6 * env
		tail_root.rotation.z = sin(t * 42.0 - 1.6) * 0.8 * env
		if wet > 0.05:
			_emit_drops(ceili(dt * 220.0 * env * wet), 3.5)
		shake_t -= dt
	else:
		rig.rotation.z = sin(t * 1.7) * 0.04 if in_water else 0.0
		neck.rotation.z = 0.0
		tail_root.rotation.z = 0.0

	# jaw, tongue, blink, happy squint
	jaw.rotation.x = lerpf(jaw.rotation.x, mouth_open, _damp(dt, 10.0))
	tongue.rotation.x = 0.35 + jaw.rotation.x * 0.8
	tongue.scale.z = 1.0 + sin(t * 9.0) * 0.08
	blink_t -= dt
	if blink_t < -0.14:
		blink_t = 2.5 + randf() * 3.0
	var bliss := MeshUtil.ss(sin(idle * 0.6), 0.2, 0.6) if (not in_water and idle > 2.5) else 0.0 # eyes-closed contentment
	var shut := maxf(maxf(1.0 if blink_t < 0.0 else 0.0, bliss), maxf(0.0 if in_water else 0.12, 0.9 if shake_t > 0.0 else 0.0))
	for lid in lids:
		lid.rotation.x = lerpf(lid.rotation.x, -0.9 + shut * 1.85, _damp(dt, 25.0))
	head.rotation.x = (0.15 + sin(t * 2.6 + 0.5) * 0.04) if in_water else (0.05 + sin(gait * 2.0) * 0.04 * run)
	splash_t = maxf(0.0, splash_t - dt)

	# ear springs
	var y := position.y + rig.position.y
	var vy := (y - prev_y) / maxf(dt, 1e-4)
	var ay := (vy - prev_vy) / maxf(dt, 1e-4)
	prev_y = y
	prev_vy = vy
	var flop: bool = B.ears == "flop"
	for e in ears:
		var force: float = -60.0 * e.ang - 6.0 * e.vel - clampf(ay, -60.0, 60.0) * 0.02 + rig.rotation.z * e.s * 8.0
		e.vel += force * dt
		e.ang = clampf(e.ang + e.vel * dt, -0.8, 0.8)
		var pivot: Node3D = e.pivot
		pivot.rotation.z = e.s * e.ang * (1.4 if flop else 0.4)
		pivot.rotation.x = (e.ang * 0.4 + (-0.3 if in_water else 0.0)) if flop else 0.0

	fur_mat.set_shader_parameter("wet", wet)
	tail_mat.set_shader_parameter("wet", wet)

	# droplets
	if _d_alive:
		var mm := drops.multimesh
		var alive := 0
		for i in DROPS:
			if _d_life[i] <= 0.0:
				continue
			_d_vel[i].y -= 9.8 * dt
			_d_pos[i] += _d_vel[i] * dt
			_d_life[i] -= dt * 1.2
			if _d_life[i] > 0.0:
				mm.set_instance_transform(alive, Transform3D(Basis(), _d_pos[i]))
				alive += 1
		mm.visible_instance_count = alive
		_d_alive = alive > 0

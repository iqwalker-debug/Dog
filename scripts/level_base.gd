# Shared scenery toolkit for every level: summer sky, sun, fog, camera, height-field terrain with
# painted vertex colors, instanced scatter, clear water, and the forest.
class_name LevelBase
extends Node3D

const WATER_SHADER := preload("res://shaders/water.gdshader")
const SKY_SHADER := preload("res://shaders/sky.gdshader")

var id := ""
var main: Node # the Main node (HUD, post-processing, level switching)
var rng := RandomNumberGenerator.new()
var camera: Camera3D
var sun: DirectionalLight3D
var env: Environment
var forest: Forest
var animated: Array[Callable] = [] # called every frame with (t, dt)
var keys := {} # physical keycode -> held
var drag = null # {x, y, dx, dy} while the pointer is held
var glint := 1.0 # paint-pass sun sparkle strength
var help_text := ""
var time := 0.0


## Height of the ground at (x, z). Levels override this.
func ground_h(_x: float, _z: float) -> float:
	return 0.0


func r() -> float:
	return rng.randf()


func pick(a: Array):
	return a[int(rng.randf() * a.size()) % a.size()]


func held(k: Key) -> bool:
	return keys.get(k, false)


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey:
		keys[e.physical_keycode] = e.pressed
		if e.pressed and not e.echo:
			_key(e.physical_keycode)
	elif e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
		if e.double_click:
			_double_click()
		drag = {"x": e.position.x, "y": e.position.y, "dx": 0.0, "dy": 0.0} if e.pressed else null
	elif e is InputEventMouseMotion and drag != null:
		drag.dx = e.position.x - drag.x
		drag.dy = e.position.y - drag.y
	elif e is InputEventScreenTouch:
		drag = {"x": e.position.x, "y": e.position.y, "dx": 0.0, "dy": 0.0} if e.pressed else null
	elif e is InputEventScreenDrag and drag != null:
		drag.dx = e.position.x - drag.x
		drag.dy = e.position.y - drag.y


func _key(_k: Key) -> void:
	pass


func _double_click() -> void:
	pass


# ------------------------------------------------------------------ environment

## fog = [color, near, far]; ground_tint colors the sky's lower half (warm bounce light).
func setup_env(fog: Array, ground_tint := Color("#7a7a45"), far := 400.0) -> void:
	env = Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sm := ShaderMaterial.new()
	sm.shader = SKY_SHADER
	sm.set_shader_parameter("ground", ground_tint)
	sky.sky_material = sm
	sky.radiance_size = Sky.RADIANCE_SIZE_64
	env.sky = sky
	# hemisphere-style fill: half sky, half warm summer bounce (keeps shade colorful, not blue-black)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#cfd8c0").lerp(ground_tint, 0.25)
	env.ambient_light_sky_contribution = 0.45
	env.ambient_light_energy = 0.7
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_AGX # keeps saturated coats (red goldens) natural
	env.tonemap_exposure = 1.0
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = Color(fog[0])
	env.fog_light_energy = 1.0
	env.fog_density = 1.0
	env.fog_depth_begin = fog[1]
	env.fog_depth_end = fog[2]
	env.fog_depth_curve = 1.0
	env.fog_sky_affect = 0.0
	env.fog_sun_scatter = 0.0
	# Forward+ only (ignored by the Compatibility renderer): warm ambient occlusion
	env.ssao_enabled = true
	env.ssao_radius = 1.6
	env.ssao_intensity = 2.2
	env.ssao_light_affect = 0.15
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	# high sun, warm key light, soft shadows near the camera
	sun = DirectionalLight3D.new()
	sun.light_color = Color("#fff1d0")
	sun.light_energy = 1.35
	sun.shadow_enabled = true
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.2
	sun.shadow_blur = 1.5
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_max_distance = 70.0
	add_child(sun)
	sun.look_at_from_position(Vector3(-16, 34, 12), Vector3.ZERO)

	camera = Camera3D.new()
	camera.fov = 70.0
	camera.near = 0.05
	camera.far = far
	add_child(camera)
	camera.make_current()

	forest = Forest.new(rng)


# ------------------------------------------------------------------ builders

## Ground mesh from ground_h() with per-vertex colors.
## o: w, d, cx, cz, seg (verts per meter), color: Callable(x, z, y) -> Color, material, height: Callable(x, z)
func terrain(o: Dictionary) -> MeshInstance3D:
	var w: float = o.w
	var d: float = o.d
	var cx: float = o.get("cx", 0.0)
	var cz: float = o.get("cz", 0.0)
	var seg: float = o.get("seg", 1.6)
	var nx := maxi(1, roundi(w * seg))
	var nz := maxi(1, roundi(d * seg))
	var height: Callable = o.get("height", ground_h)
	var color: Callable = o.color
	var v := PackedVector3Array()
	var c := PackedColorArray()
	v.resize((nx + 1) * (nz + 1))
	c.resize(v.size())
	for j in nz + 1:
		var z := cz - d / 2 + d * j / nz
		for i in nx + 1:
			var x := cx - w / 2 + w * i / nx
			var y: float = height.call(x, z)
			v[j * (nx + 1) + i] = Vector3(x, y, z)
			c[j * (nx + 1) + i] = color.call(x, z, y)
	var n := PackedVector3Array()
	n.resize(v.size())
	for j in nz + 1:
		for i in nx + 1:
			var l := v[j * (nx + 1) + maxi(i - 1, 0)]
			var rr := v[j * (nx + 1) + mini(i + 1, nx)]
			var u := v[maxi(j - 1, 0) * (nx + 1) + i]
			var dd := v[mini(j + 1, nz) * (nx + 1) + i]
			n[j * (nx + 1) + i] = (dd - u).cross(rr - l).normalized()
	var idx := PackedInt32Array()
	idx.resize(nx * nz * 6)
	var k := 0
	for j in nz:
		for i in nx:
			var a := j * (nx + 1) + i
			var b := a + 1
			var e := a + nx + 1
			var f := e + 1
			idx[k] = a
			idx[k + 1] = b
			idx[k + 2] = e
			idx[k + 3] = b
			idx[k + 4] = f
			idx[k + 5] = e
			k += 6
	var mat: Material = o.get("material", MeshUtil.ground_mat(o.get("detail", ""), o.get("detail_scale", 0.3), o.get("detail_strength", 0.75), o.get("caustics", 0.0)))
	var mesh := MeshUtil.to_mesh({"v": v, "n": n, "c": c, "i": idx}, mat)
	var mi := MeshUtil.mesh_instance(mesh, self, Vector3.ZERO, true)
	return mi


## Instanced scatter. place(i) -> {p: Vector3, s: float|Vector3, c: Color?, rot: Vector3 euler?}
func scatter(mesh: Mesh, mat: Material, n: int, place: Callable, cast := false) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	mm.instance_count = n
	for i in n:
		var o: Dictionary = place.call(i)
		var s = o.get("s", 1.0)
		var sv: Vector3 = s if s is Vector3 else Vector3.ONE * float(s)
		var rot: Vector3 = o.get("rot", Vector3(0, rng.randf() * TAU, 0))
		mm.set_instance_transform(i, Transform3D(Basis.from_euler(rot, EULER_ORDER_XYZ) * Basis.from_scale(sv), o.p))
		mm.set_instance_color(i, o.get("c", Color.WHITE))
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = mm
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)
	return mi


## Clear water plane. o: w, d, cx, cz, y, color, clear
func water(o: Dictionary) -> MeshInstance3D:
	var pm := PlaneMesh.new()
	pm.size = Vector2(o.get("w", 400.0), o.get("d", 400.0))
	var mat := ShaderMaterial.new()
	mat.shader = WATER_SHADER
	mat.set_shader_parameter("water_color", Color(o.get("color", "#138a80")))
	mat.set_shader_parameter("clear", o.get("clear", 0.38))
	mat.render_priority = 1
	pm.material = mat
	var mi := MeshUtil.mesh_instance(pm, self, Vector3(o.get("cx", 0.0), o.get("y", 0.0), o.get("cz", 0.0)), false)
	return mi


## A box/sphere/cylinder etc. with a plain painted material.
func prop(mesh: Mesh, color: Color, pos: Vector3, roughness := 0.9, shadow := true) -> MeshInstance3D:
	var mi := MeshUtil.mesh_instance(mesh, self, pos, shadow)
	mi.material_override = MeshUtil.std(color, roughness)
	return mi


static func box(x: float, y: float, z: float) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = Vector3(x, y, z)
	return b


static func cyl(top: float, bottom: float, h: float, seg := 8) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = top
	c.bottom_radius = bottom
	c.height = h
	c.radial_segments = seg
	c.rings = 1
	return c


static func orb(r: float, seg := 8, rings := 6) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = r
	s.height = r * 2
	s.radial_segments = seg
	s.rings = rings
	return s


## Low-poly faceted rock (like THREE.DodecahedronGeometry), unit radius.
static func rock_mesh(detail := 1) -> Mesh:
	var s := SphereMesh.new()
	s.radial_segments = 7 + detail * 3
	s.rings = 4 + detail * 2
	return s


func finish_build() -> void:
	forest.flush(self)


func set_help(text: String) -> void:
	help_text = text
	if main:
		main.set_help(text)

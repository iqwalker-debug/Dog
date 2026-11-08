# Root node: loads levels, draws the watercolor post pass and the HUD, and keeps the frame rate
# up by trading internal 3D resolution (the paint filter hides the upscaling).
#
# Command line (after `--`):  --level=trail  --scale=0.5  --capture=shot.png  --wait=6  --walk
#   --showroom[=husky]  --breed=lab  --frames=N  --ao=0
extends Node

const PAINTERLY := preload("res://shaders/painterly.gdshader")
const LEVELS := ["swimhole", "trail", "bluff", "creek", "river"]

var level: LevelBase
var level_name := "swimhole"
var args := {}
var post: ColorRect
var help_label: Label
var score_label: Label
var toast_label: Label
var debug_label: Label
var toast_t := 0.0
var forced_scale := 0.0
var scale_3d := 0.75
var fps_acc := 0.0
var fps_frames := 0
var capture_t := -1.0


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else ""
	forced_scale = float(args.get("scale", "0"))
	if forced_scale > 0.0:
		scale_3d = forced_scale
	get_viewport().scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	get_viewport().scaling_3d_scale = scale_3d
	_build_ui()
	if args.has("capture"):
		capture_t = float(args.get("wait", "8"))
	if args.has("showroom"):
		load_level("showroom")
	else:
		load_level(args.get("level", "swimhole"))


func _build_ui() -> void:
	# watercolor post pass over the 3D frame
	var post_layer := CanvasLayer.new()
	post_layer.layer = 0
	add_child(post_layer)
	post = ColorRect.new()
	post.set_anchors_preset(Control.PRESET_FULL_RECT)
	post.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var pm := ShaderMaterial.new()
	pm.shader = PAINTERLY
	post.material = pm
	post_layer.add_child(post)

	var hud := CanvasLayer.new()
	hud.layer = 10
	add_child(hud)
	help_label = _label(hud, 15)
	help_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	help_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	help_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	help_label.position.y -= 34
	score_label = _label(hud, 17)
	score_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	score_label.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	score_label.position += Vector2(-16, 12)
	toast_label = _label(hud, 17)
	toast_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	toast_label.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	toast_label.position += Vector2(-16, 40)
	debug_label = _label(hud, 13)
	debug_label.position = Vector2(10, 10)
	debug_label.visible = false


func _label(parent: Node, size: int) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color.WHITE)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.6))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 1)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(l)
	return l


func load_level(name: String) -> void:
	if level:
		level.queue_free()
		remove_child(level)
		level = null
	if name != "showroom" and not name in LEVELS:
		name = "swimhole"
	level_name = name
	var script: GDScript = load("res://levels/%s.gd" % name)
	level = script.new()
	level.id = name
	level.main = self
	level.name = "Level"
	if args.has("walk") and level is World:
		level.autopilot = true
	add_child(level)
	score_label.text = ""
	toast_label.text = ""
	(post.material as ShaderMaterial).set_shader_parameter("glint", level.glint)
	if args.has("breed") and level is World:
		level.swap_breed(args.breed)


## Sun position on screen for the paint pass's light shafts.
func _update_sun() -> void:
	if not level or not level.camera or not level.sun:
		return
	var cam := level.camera
	var to_sun := level.sun.global_transform.basis.z.normalized()
	var mat := post.material as ShaderMaterial
	var facing := to_sun.dot(-cam.global_transform.basis.z)
	if facing <= 0.0:
		mat.set_shader_parameter("sun_vis", 0.0)
		return
	var sp := cam.unproject_position(cam.global_position + to_sun * 1000.0)
	var vp := get_viewport().get_visible_rect().size
	mat.set_shader_parameter("sun_uv", sp / vp)
	mat.set_shader_parameter("sun_vis", smoothstep(0.0, 0.5, facing))


func next_level() -> void:
	call_deferred("load_level", LEVELS[(LEVELS.find(level_name) + 1) % LEVELS.size()])


func set_help(text: String) -> void:
	help_label.text = text


func set_score(text: String) -> void:
	score_label.text = text


func toast(msg: String) -> void:
	toast_label.text = msg
	toast_t = 2.5


func set_debug(text: String) -> void:
	if debug_label.visible:
		debug_label.text = "%s · internal %d%%" % [text, roundi(scale_3d * 100)]


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and not e.echo and e.physical_keycode == KEY_F3:
		debug_label.visible = not debug_label.visible


func _process(delta: float) -> void:
	_update_sun()
	toast_t -= delta
	if toast_t <= 0.0:
		toast_label.text = ""

	# dynamic resolution: hold 60 fps by trading internal pixels
	fps_acc += delta
	fps_frames += 1
	if fps_acc > 1.0 and forced_scale <= 0.0:
		var fps := fps_frames / fps_acc
		if fps < 57 and scale_3d > 0.5:
			scale_3d -= 0.05
		elif fps > 59.5 and scale_3d < 1.0:
			scale_3d += 0.05
		get_viewport().scaling_3d_scale = scale_3d
		fps_acc = 0.0
		fps_frames = 0

	if capture_t >= 0.0:
		capture_t -= delta
		if capture_t < 0.0:
			await RenderingServer.frame_post_draw
			var img := get_viewport().get_texture().get_image()
			img.save_png(args.capture)
			print("captured ", args.capture)
			get_tree().quit()

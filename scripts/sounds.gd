# Music, per-level ambience and pooled sound effects (2D for UI, 3D for things in the world).
# All audio is synthesized by tools/make_audio.py into res://audio/.
class_name Sounds
extends Node

const VARIANTS := {"step_dirt": 3, "step_water": 3}

var music: AudioStreamPlayer
var amb: AudioStreamPlayer
var amb_fade: AudioStreamPlayer
var pool3d: Array[AudioStreamPlayer3D] = []
var pool2d: Array[AudioStreamPlayer] = []
var _next3d := 0
var _next2d := 0
var _cache := {}
var muted := false


func _ready() -> void:
	music = _player(-15.0)
	amb = _player(-7.0)
	amb_fade = _player(-7.0)
	var m := _stream("music_greenbelt", true)
	if m:
		music.stream = m
		music.play()
	for i in 14:
		var p := AudioStreamPlayer3D.new()
		p.unit_size = 5.0
		p.max_distance = 70.0
		p.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
		add_child(p)
		pool3d.append(p)
	for i in 6:
		pool2d.append(_player(0.0))


func _player(db: float) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.volume_db = db
	add_child(p)
	return p


func _stream(name: String, loop := false) -> AudioStream:
	var key := name + ("_loop" if loop else "")
	if _cache.has(key):
		return _cache[key]
	var path := "res://audio/%s.ogg" % name
	if not ResourceLoader.exists(path):
		_cache[key] = null
		return null
	var s: AudioStreamOggVorbis = load(path)
	if loop:
		s = s.duplicate()
		s.loop = true
	_cache[key] = s
	return s


func _pick(name: String) -> String:
	if VARIANTS.has(name):
		return "%s%d" % [name, randi() % VARIANTS[name]]
	return name


## Crossfade to a level's ambience loop (amb_<level>).
func set_ambience(level_name: String) -> void:
	var s := _stream("amb_" + level_name, true)
	var old := amb
	amb = amb_fade
	amb_fade = old
	if amb_fade.playing:
		var tw := create_tween()
		tw.tween_property(amb_fade, "volume_db", -60.0, 1.5)
		tw.tween_callback(amb_fade.stop)
	if s:
		amb.stream = s
		amb.volume_db = -40.0
		amb.play()
		create_tween().tween_property(amb, "volume_db", -7.0, 2.0)


## Play an effect. pos = world position for 3D sound, or null for a flat UI sound.
func play(name: String, pos = null, db := 0.0, pitch_var := 0.08) -> void:
	var s := _stream(_pick(name))
	if not s:
		return
	var pitch := 1.0 + randf_range(-pitch_var, pitch_var)
	if pos == null:
		var p := pool2d[_next2d]
		_next2d = (_next2d + 1) % pool2d.size()
		p.stream = s
		p.volume_db = db
		p.pitch_scale = pitch
		p.play()
	else:
		var p := pool3d[_next3d]
		_next3d = (_next3d + 1) % pool3d.size()
		p.stream = s
		p.volume_db = db
		p.pitch_scale = pitch
		p.global_position = pos
		p.play()


func toggle_mute() -> bool:
	muted = not muted
	AudioServer.set_bus_mute(0, muted)
	return muted

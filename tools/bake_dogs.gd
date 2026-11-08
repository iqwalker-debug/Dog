# Bakes every breed's sculpted meshes into res://dogcache/ so the game never sculpts at runtime.
#   godot --headless --path . -s tools/bake_dogs.gd
extends SceneTree

func _initialize() -> void:
	var t0 := Time.get_ticks_msec()
	for k in Breeds.ORDER:
		var d := Dog.new(k)
		d.free()
		print("baked ", k)
	print("done in %d ms" % (Time.get_ticks_msec() - t0))
	quit()

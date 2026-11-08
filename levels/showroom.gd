# Showroom: every breed lined up on the swimming-hole beach (--showroom), or one close-up
# (--showroom=husky), or a 3/4 face portrait (--showroom=golden --face). --pose=sit|lie|stand
extends "res://levels/swimhole.gd"

var lineup: Array[Dog] = []


func _ready() -> void:
	super._ready()
	set_help("Showroom · " + ", ".join(Breeds.ORDER))
	dog.visible = false
	for b in buddies:
		b.dog.visible = false
	var solo: String = main.args.get("showroom", "") if main else ""
	var keys_list: Array = [solo] if Breeds.DATA.has(solo) else Breeds.ORDER
	for i in keys_list.size():
		var d := Dog.new(keys_list[i])
		add_child(d)
		var x := 30.0 + (i % 5) * 2.2
		var z := 6.0 + floorf(i / 5.0) * 3.0
		d.position = Vector3(x, ground_h(x, z) + 0.6, z)
		d.rotation.y = -PI / 2 + 0.5
		if main and main.args.has("pose"):
			d.set_pose(main.args.pose)
		lineup.append(d)


func _process(delta: float) -> void:
	var dt := minf(delta, 0.05)
	time += dt
	for d in lineup:
		d.update(dt, 0.0, false, ground_h(d.position.x, d.position.z))
		d.set_fur_detail(24)
	if lineup.size() == 1:
		var d := lineup[0]
		var ry := d.rotation.y
		if main and main.args.has("face"): # 3/4 portrait of the face, like the close-up paintings
			var hp := d.head.global_position
			camera.position = Vector3(hp.x + sin(ry + 0.55) * 0.95, hp.y + 0.08, hp.z + cos(ry + 0.55) * 0.95)
			camera.look_at(hp - Vector3(0, 0.02, 0))
		else:
			camera.position = d.position + Vector3(-1.2, 0.35, 2.0)
			camera.look_at(d.position - Vector3(0, 0.05, 0))
	else:
		camera.position = Vector3(34.4, ground_h(34, 13) + 1.6, 13.5)
		camera.look_at(Vector3(34.4, ground_h(34, 7) + 0.3, 6.8))

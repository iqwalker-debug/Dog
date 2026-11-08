# Repairs NaN/degenerate normals+tangents in baked scans (NaNs show up as black blobs through bloom).
#   godot --headless --path . -s tools/sanitize_scans.gd
extends SceneTree
func _initialize():
	for f in DirAccess.get_files_at("res://assets/scans"):
		if not f.ends_with(".res"):
			continue
		var m: ArrayMesh = load("res://assets/scans/" + f)
		var a := m.surface_get_arrays(0)
		var n: PackedVector3Array = a[Mesh.ARRAY_NORMAL]
		var t: PackedFloat32Array = a[Mesh.ARRAY_TANGENT]
		var bad := 0
		for i in n.size():
			var nv := n[i]
			if not nv.is_finite() or nv.length() < 0.5:
				n[i] = Vector3.UP
				nv = Vector3.UP
				bad += 1
			var tv := Vector3(t[i * 4], t[i * 4 + 1], t[i * 4 + 2])
			if not tv.is_finite() or tv.length() < 0.5 or absf(tv.normalized().dot(nv)) > 0.99 or not is_finite(t[i * 4 + 3]):
				var alt := Vector3.RIGHT if absf(nv.x) < 0.9 else Vector3.FORWARD
				tv = nv.cross(alt).normalized()
				t[i * 4] = tv.x
				t[i * 4 + 1] = tv.y
				t[i * 4 + 2] = tv.z
				t[i * 4 + 3] = 1.0
				bad += 1
		a[Mesh.ARRAY_NORMAL] = n
		a[Mesh.ARRAY_TANGENT] = t
		var out := ArrayMesh.new()
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a)
		out.set_meta("height", m.get_meta("height", 1.0))
		ResourceSaver.save(out, "res://assets/scans/" + f, ResourceSaver.FLAG_COMPRESS)
		print(f, " fixed ", bad)
	quit()

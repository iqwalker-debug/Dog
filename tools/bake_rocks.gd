# Bakes Poly Haven photoscanned rocks (assets/rocks/*/x.gltf) into light game meshes:
# each scan is simplified to ~3k triangles and saved with its textures to assets/scans/<name>.res.
#   godot --headless --path . -s tools/bake_rocks.gd
extends SceneTree

const TARGET_TRIS := 3200


func _initialize() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://assets/scans"))
	# raw scans come from tools/fetch_polyhaven.py
	var dir := DirAccess.open("res://assets/rocks")
	for name in dir.get_directories():
		var path := "res://assets/rocks/%s/%s.gltf" % [name, name]
		var doc := GLTFDocument.new()
		var state := GLTFState.new()
		if doc.append_from_file(ProjectSettings.globalize_path(path), state) != OK:
			print("failed ", name)
			continue
		var gm: GLTFMesh = state.get_meshes()[0]
		var im: ImporterMesh = gm.mesh
		im.generate_lods(60.0, 25.0, [])
		var arrays := im.get_surface_arrays(0)
		var idx: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
		var tris := idx.size() / 3
		for l in im.get_surface_lod_count(0):
			var li := im.get_surface_lod_indices(0, l)
			if li.size() / 3 < tris and li.size() / 3 >= TARGET_TRIS * 0.6:
				idx = li
				tris = li.size() / 3
		# drop unused vertices
		var remap := {}
		var keep := PackedInt32Array()
		var nidx := PackedInt32Array()
		nidx.resize(idx.size())
		for i in idx.size():
			var v := idx[i]
			if not remap.has(v):
				remap[v] = keep.size()
				keep.append(v)
			nidx[i] = remap[v]
		var out := []
		out.resize(Mesh.ARRAY_MAX)
		for a in [Mesh.ARRAY_VERTEX, Mesh.ARRAY_NORMAL, Mesh.ARRAY_TANGENT, Mesh.ARRAY_TEX_UV]:
			var src = arrays[a]
			if src == null:
				continue
			var stride := 4 if a == Mesh.ARRAY_TANGENT else 1
			var dst = src.duplicate()
			dst.resize(keep.size() * stride)
			for i in keep.size():
				for s in stride:
					dst[i * stride + s] = src[keep[i] * stride + s]
			out[a] = dst
		out[Mesh.ARRAY_INDEX] = nidx
		# normalize: center on the base, fit into a unit radius
		var v: PackedVector3Array = out[Mesh.ARRAY_VERTEX]
		var aabb := AABB(v[0], Vector3.ZERO)
		for p in v:
			aabb = aabb.expand(p)
		var c := aabb.get_center()
		c.y = aabb.position.y
		var s := 1.0 / maxf(aabb.size.x, aabb.size.z) * 2.0
		for i in v.size():
			v[i] = (v[i] - c) * s
		out[Mesh.ARRAY_VERTEX] = v
		var raw := ArrayMesh.new()
		raw.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, out)
		var st := SurfaceTool.new() # normal maps need tangents
		st.create_from(raw, 0)
		st.generate_tangents()
		var mesh := st.commit()
		mesh.set_meta("height", aabb.size.y * s)
		ResourceSaver.save(mesh, "res://assets/scans/%s.res" % name, ResourceSaver.FLAG_COMPRESS)
		for k in ["diff", "nor_gl", "arm"]:
			DirAccess.copy_absolute(ProjectSettings.globalize_path("res://assets/rocks/%s/textures/%s_%s_1k.jpg" % [name, name, k]), ProjectSettings.globalize_path("res://assets/scans/%s_%s_1k.jpg" % [name, k]))
		print("%s: %d -> %d tris, height %.2f" % [name, im.get_surface_arrays(0)[Mesh.ARRAY_INDEX].size() / 3, tris, aabb.size.y * s])
	quit()

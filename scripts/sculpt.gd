# Sculpt smooth organic meshes from signed-distance shapes (ellipsoids, tapered capsules, spheres)
# blended like clay with a polynomial smooth-min, with optional smooth carving (eye sockets).
# Polygonized with surface nets. Used for the dogs' bodies, heads and jaws.
class_name Sculpt
extends RefCounted

const SPHERE := 0
const ELLIPSOID := 1
const CAPSULE := 2

var shapes: Array[PackedFloat32Array] = []
var k := 0.08
var carves: Array = [] # [PackedFloat32Array shape, k]


func _init(blend := 0.08) -> void:
	k = blend


func sphere(c: Vector3, r: float) -> Sculpt:
	shapes.append(PackedFloat32Array([SPHERE, c.x, c.y, c.z, r]))
	return self


func ellipsoid(c: Vector3, r: Vector3) -> Sculpt:
	shapes.append(PackedFloat32Array([ELLIPSOID, c.x, c.y, c.z, r.x, r.y, r.z]))
	return self


## tapered capsule a -> b, radius ra at a, rb at b
func capsule(a: Vector3, b: Vector3, ra: float, rb := -1.0) -> Sculpt:
	if rb < 0.0:
		rb = ra
	shapes.append(PackedFloat32Array([CAPSULE, a.x, a.y, a.z, b.x, b.y, b.z, ra, rb]))
	return self


## carve a sphere out of the blended shape (smooth max(a, -b))
func carve_sphere(c: Vector3, r: float, ck := 0.02) -> Sculpt:
	carves.append([PackedFloat32Array([SPHERE, c.x, c.y, c.z, r]), ck])
	return self


static func _shape(s: PackedFloat32Array, p: Vector3) -> float:
	var t := int(s[0])
	if t == SPHERE:
		return Vector3(p.x - s[1], p.y - s[2], p.z - s[3]).length() - s[4]
	if t == ELLIPSOID:
		var x := (p.x - s[1]) / s[4]
		var y := (p.y - s[2]) / s[5]
		var z := (p.z - s[3]) / s[6]
		var k0 := sqrt(x * x + y * y + z * z)
		var k1 := sqrt(x * x / (s[4] * s[4]) + y * y / (s[5] * s[5]) + z * z / (s[6] * s[6]))
		return (k0 * (k0 - 1.0)) / maxf(k1, 1e-6)
	# capsule
	var ax := s[1]
	var ay := s[2]
	var az := s[3]
	var bax := s[4] - ax
	var bay := s[5] - ay
	var baz := s[6] - az
	var pax := p.x - ax
	var pay := p.y - ay
	var paz := p.z - az
	var h := clampf((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0.0, 1.0)
	var r := s[7] + (s[8] - s[7]) * h
	var dx := pax - bax * h
	var dy := pay - bay * h
	var dz := paz - baz * h
	return sqrt(dx * dx + dy * dy + dz * dz) - r


func dist(p: Vector3) -> float:
	var d := _shape(shapes[0], p)
	for i in range(1, shapes.size()):
		var b := _shape(shapes[i], p)
		var h := clampf(0.5 + 0.5 * (b - d) / k, 0.0, 1.0)
		d = b + (d - b) * h - k * h * (1.0 - h)
	for cv in carves:
		var db := _shape(cv[0], p)
		var ck: float = cv[1]
		var h := clampf(0.5 + 0.5 * (d + db) / ck, 0.0, 1.0)
		d = -db + (d + db) * h + ck * h * (1.0 - h)
	return d


## Polygonize inside the cube (center, half-size) at res^3 samples. Returns {v, n, i}.
func build(center: Vector3, half: float, res: int) -> Dictionary:
	var n := res
	var nn := n * n
	var step := 2.0 * half / float(n - 1)
	var origin := center - Vector3(half, half, half)
	var f := PackedFloat32Array()
	f.resize(n * nn)
	for z in n:
		for y in n:
			for x in n:
				f[x + y * n + z * nn] = dist(origin + Vector3(x, y, z) * step)

	# one vertex per sign-changing cell, at the mean of its edge crossings
	var m := n - 1
	var cell := PackedInt32Array()
	cell.resize(m * m * m)
	cell.fill(-1)
	var verts := PackedVector3Array()
	var corner := [Vector3i(0, 0, 0), Vector3i(1, 0, 0), Vector3i(0, 1, 0), Vector3i(1, 1, 0),
		Vector3i(0, 0, 1), Vector3i(1, 0, 1), Vector3i(0, 1, 1), Vector3i(1, 1, 1)]
	var edges := [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
	var cv := PackedFloat32Array()
	cv.resize(8)
	for z in m:
		for y in m:
			for x in m:
				var neg := 0
				for c in 8:
					var o: Vector3i = corner[c]
					cv[c] = f[(x + o.x) + (y + o.y) * n + (z + o.z) * nn]
					if cv[c] < 0.0:
						neg += 1
				if neg == 0 or neg == 8:
					continue
				var acc := Vector3.ZERO
				var cnt := 0
				for e in edges:
					var a: float = cv[e[0]]
					var b: float = cv[e[1]]
					if (a < 0.0) == (b < 0.0):
						continue
					var t := a / (a - b)
					var pa := Vector3(corner[e[0]])
					var pb := Vector3(corner[e[1]])
					acc += pa.lerp(pb, t)
					cnt += 1
				cell[x + y * m + z * m * m] = verts.size()
				verts.append(origin + (Vector3(x, y, z) + acc / cnt) * step)

	# one quad per sign-changing grid edge, joining the 4 cells around it
	var idx := PackedInt32Array()
	for z in range(1, m):
		for y in range(1, m):
			for x in range(1, m):
				var f0 := f[x + y * n + z * nn]
				# edge along x (cells vary in y,z), along y (x,z), along z (x,y)
				if (f0 < 0.0) != (f[x + 1 + y * n + z * nn] < 0.0):
					_quad(idx, cell, m, Vector3i(x, y - 1, z - 1), Vector3i(x, y, z - 1), Vector3i(x, y, z), Vector3i(x, y - 1, z))
				if (f0 < 0.0) != (f[x + (y + 1) * n + z * nn] < 0.0):
					_quad(idx, cell, m, Vector3i(x - 1, y, z - 1), Vector3i(x, y, z - 1), Vector3i(x, y, z), Vector3i(x - 1, y, z))
				if (f0 < 0.0) != (f[x + y * n + (z + 1) * nn] < 0.0):
					_quad(idx, cell, m, Vector3i(x - 1, y - 1, z), Vector3i(x, y - 1, z), Vector3i(x, y, z), Vector3i(x - 1, y, z))

	# outward normals from the distance field's gradient
	var nrm := PackedVector3Array()
	nrm.resize(verts.size())
	var e := step * 0.5
	for i in verts.size():
		var p := verts[i]
		var g := Vector3(
			dist(p + Vector3(e, 0, 0)) - dist(p - Vector3(e, 0, 0)),
			dist(p + Vector3(0, e, 0)) - dist(p - Vector3(0, e, 0)),
			dist(p + Vector3(0, 0, e)) - dist(p - Vector3(0, 0, e)))
		nrm[i] = g.normalized() if g.length_squared() > 0.0 else Vector3.UP
	return MeshUtil.fix_winding({"v": verts, "n": nrm, "i": idx})


static func _quad(idx: PackedInt32Array, cell: PackedInt32Array, m: int, a: Vector3i, b: Vector3i, c: Vector3i, d: Vector3i) -> void:
	var ia := cell[a.x + a.y * m + a.z * m * m]
	var ib := cell[b.x + b.y * m + b.z * m * m]
	var ic := cell[c.x + c.y * m + c.z * m * m]
	var id := cell[d.x + d.y * m + d.z * m * m]
	if ia < 0 or ib < 0 or ic < 0 or id < 0:
		return
	idx.append_array([ia, ib, ic, ia, ic, id])

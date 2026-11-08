# Breed library, tuned to Ian's reference paintings.
# Dog-local space: +z forward, +y up, origin = torso center.
# mark(key, p, part) returns 0..1 = how much of the secondary color shows at point p.
class_name Breeds
extends RefCounted

const DATA := {
	"golden": {"name": "Golden Retriever", "size": 1.0, "legH": 0.68, "width": 1.0, "snout": 0.17, "ears": "flop", "tail": "feather",
		"coat": "#d79b45", "second": "#f1d08d", "furLen": 0.07, "curl": 0.15, "shells": 20, "gear": ["collar", "#b7e34a"]},
	"redGolden": {"name": "Red Golden", "size": 1.02, "legH": 0.68, "width": 1.0, "snout": 0.18, "ears": "flop", "tail": "feather",
		"coat": "#b5541d", "second": "#d27a3b", "furLen": 0.08, "curl": 0.2, "shells": 20, "gear": ["harness", "#26272b"]},
	"creamGolden": {"name": "Cream Golden", "size": 0.98, "legH": 0.66, "width": 1.0, "snout": 0.16, "ears": "flop", "tail": "feather",
		"coat": "#e7c27e", "second": "#f6e3b6", "furLen": 0.075, "curl": 0.15, "shells": 20, "gear": ["harness", "#d8364a"]},
	"doodle": {"name": "Red Goldendoodle", "size": 0.95, "legH": 0.66, "width": 1.0, "snout": 0.14, "ears": "flop", "tail": "pom",
		"coat": "#b0612b", "second": "#c87a3f", "furLen": 0.11, "curl": 0.9, "shells": 22, "gear": ["harness", "#2f63c9"]},
	"whiteDoodle": {"name": "White Doodle", "size": 0.95, "legH": 0.64, "width": 1.0, "snout": 0.14, "ears": "flop", "tail": "pom",
		"coat": "#efe6cf", "second": "#fff8e8", "furLen": 0.12, "curl": 0.9, "shells": 22, "gear": []},
	"husky": {"name": "Husky", "size": 1.0, "legH": 0.66, "width": 1.0, "snout": 0.17, "ears": "erect", "tail": "plume",
		"coat": "#24252b", "second": "#f3f0ea", "furLen": 0.08, "curl": 0.05, "shells": 20, "gear": ["collar", "#2aa6a0"]},
	"lab": {"name": "Black Lab", "size": 1.0, "legH": 0.66, "width": 0.95, "snout": 0.18, "ears": "flop", "tail": "otter",
		"coat": "#17171a", "second": "#2a2a2e", "furLen": 0.025, "curl": 0.0, "shells": 10, "gear": ["harness", "#7b3fb0"]},
	"bernedoodle": {"name": "Bernedoodle", "size": 1.0, "legH": 0.68, "width": 1.0, "snout": 0.15, "ears": "flop", "tail": "pom",
		"coat": "#18181b", "second": "#f1ede4", "furLen": 0.11, "curl": 0.85, "shells": 22, "gear": ["harness", "#5d6b4a"]},
	"frenchie": {"name": "French Bulldog", "size": 0.7, "legH": 0.34, "depth": 1.0, "width": 1.25, "snout": 0.035, "ears": "bat", "tail": "stub",
		"coat": "#c98843", "second": "#2a211c", "furLen": 0.018, "curl": 0.0, "shells": 8, "gear": ["harness", "#2f63c9"]},
	"collie": {"name": "Border Collie Mix", "size": 0.9, "legH": 0.64, "width": 0.9, "snout": 0.17, "ears": "flop", "tail": "feather",
		"coat": "#161618", "second": "#f3f0ea", "furLen": 0.07, "curl": 0.1, "shells": 18, "gear": []},
}

const ORDER := ["golden", "doodle", "husky", "lab", "frenchie", "redGolden", "bernedoodle", "creamGolden", "whiteDoodle", "collie"]


static func _under(p: Vector3, y0 := -0.08, soft := 0.08) -> float:
	return MeshUtil.ss(-p.y, -y0 - soft, -y0 + soft)


static func mark(key: String, p: Vector3, part: String) -> float:
	match key:
		"golden":
			return _under(p, -0.12) * 0.8 if part == "body" else (0.15 if part == "head" else 0.3)
		"redGolden":
			return _under(p, -0.1) * 0.7 if part == "body" else 0.2
		"creamGolden":
			return _under(p, -0.1) if part == "body" else 0.4
		"doodle":
			return 0.2
		"whiteDoodle":
			return 0.3
		"husky":
			if part == "body":
				return maxf(_under(p, -0.02, 0.06), MeshUtil.ss(p.z, 0.3, 0.5) * _under(p, 0.12))
			if part == "head":
				var mask := 1.0 if (p.y < -0.01 or (p.z > 0.13 and p.y < 0.04)) else 0.0 # white muzzle, cheeks, jaw
				var spectacles := 1.0 if (Vector2(absf(p.x) - 0.065, p.y - 0.035).length() < 0.03 and p.z > 0.05) else 0.0
				var stripe := 1.0 if (absf(p.x) < 0.018 and p.z > 0.05) else 0.0 # white forehead blaze
				return maxf(mask, maxf(spectacles, stripe))
			return 1.0 if part == "leg" or part == "tailTip" else 0.0
		"lab":
			return 0.0
		"bernedoodle":
			if part == "body":
				return MeshUtil.ss(p.z, 0.32, 0.5) * _under(p, 0.1)
			if part == "head":
				return 1.0 if (p.z > 0.12 or (absf(p.x) < 0.03 and p.y > 0.0)) else 0.0
			return 1.0 if part == "paw" or part == "tailTip" else 0.0
		"frenchie":
			return 1.0 if (part == "head" and p.z > 0.08 and p.y < 0.02) else 0.0 # black mask on muzzle
		"collie":
			if part == "body":
				return MeshUtil.ss(p.z, 0.35, 0.5) * _under(p, 0.2)
			if part == "head":
				return 1.0 if (absf(p.x) < 0.035 or p.z > 0.14) else 0.0
			return 1.0 if part == "paw" or part == "tailTip" else 0.0
	return 0.0

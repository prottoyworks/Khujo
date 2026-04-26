/* ============================================================
   AUTH ROUTES — Register, Login, Logout, Get Current User
   ============================================================ */

const express = require("express");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

// ── Helper: Get user from Authorization header ──────────────
function getUser(req) {
	const token = req.headers.authorization;
	if (!token) return null;

	const session = db.get(
		`SELECT users.* FROM sessions
     JOIN users ON sessions.user_id = users.id
     WHERE sessions.token = ?`,
		[token],
	);

	return session || null;
}

const PASSWORD_MIN = 6;

function validateCredentials(username, password) {
	if (typeof username !== "string" || typeof password !== "string") {
		return "Username and password are required";
	}
	if (password.length < PASSWORD_MIN) {
		return `Password must be at least ${PASSWORD_MIN} characters`;
	}
	return null;
}

// ── POST /api/auth/register ─────────────────────────────────
router.post("/register", (req, res) => {
	const username = (req.body.username || "").trim().toLowerCase();
	const password = req.body.password || "";
	const fullName = (req.body.fullName || "").trim();
	const phone = (req.body.phone || "").trim();

	const err = validateCredentials(username, password);
	if (err) return res.status(400).json({ error: err });

	const existing = db.get("SELECT id FROM users WHERE username = ?", [
		username,
	]);
	if (existing) {
		return res.status(409).json({ error: "Username already taken" });
	}

	const id = crypto.randomUUID();
	db.run(
		"INSERT INTO users (id, username, password, full_name, phone) VALUES (?, ?, ?, ?, ?)",
		[id, username, password, fullName, phone],
	);

	// Create session token
	const token = crypto.randomUUID();
	db.run("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [token, id]);

	const user = db.get("SELECT * FROM users WHERE id = ?", [id]);

	res.json({
		token,
		user: {
			id: user.id,
			username: user.username,
			fullName: user.full_name,
			phone: user.phone,
		},
	});
});

// ── POST /api/auth/login ────────────────────────────────────
router.post("/login", (req, res) => {
	const username = (req.body.username || "").trim().toLowerCase();
	const password = req.body.password || "";

	if (!username || !password) {
		return res
			.status(400)
			.json({ error: "Username and password are required" });
	}

	const user = db.get(
		"SELECT * FROM users WHERE username = ? AND password = ?",
		[username, password],
	);

	if (!user) {
		return res.status(401).json({ error: "Invalid username or password" });
	}

	const token = crypto.randomUUID();
	db.run("INSERT INTO sessions (token, user_id) VALUES (?, ?)", [
		token,
		user.id,
	]);

	res.json({
		token,
		user: { id: user.id, username: user.username, fullName: user.full_name },
	});
});

// ── POST /api/auth/logout ───────────────────────────────────
router.post("/logout", (req, res) => {
	const token = req.headers.authorization;
	if (token) {
		db.run("DELETE FROM sessions WHERE token = ?", [token]);
	}
	res.json({ message: "Logged out" });
});

// ── GET /api/auth/me ────────────────────────────────────────
router.get("/me", (req, res) => {
	const user = getUser(req);
	if (!user) {
		return res.status(401).json({ error: "Not logged in" });
	}
	res.json({
		id: user.id,
		username: user.username,
		fullName: user.full_name,
		phone: user.phone,
	});
});

module.exports = router;
module.exports.getUser = getUser;

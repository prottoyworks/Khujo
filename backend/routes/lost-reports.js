/* ============================================================
   LOST REPORTS ROUTES — CRUD for missing person reports
   ============================================================ */

const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { getUser } = require("./auth");

const router = express.Router();

// Helper: convert DB row to camelCase
function formatReport(r) {
	return {
		id: r.id,
		reporterId: r.reporter_id,
		familyMemberId: r.family_member_id,
		name: r.name,
		photo: r.photo,
		description: r.description,
		lastSeenLocation: r.last_seen_location,
		lastSeenClothes: r.last_seen_clothes,
		status: r.status,
		finalFoundVerdict: r.final_found_verdict === 1,
		createdAt: r.created_at,
		updatedAt: r.updated_at,
	};
}

// ── GET /api/lost-reports ───────────────────────────────────
router.get("/", (req, res) => {
	const reports = db.all("SELECT * FROM lost_reports ORDER BY created_at DESC");
	res.json(reports.map(formatReport));
});

// ── GET /api/lost-reports/:id ───────────────────────────────
router.get("/:id", (req, res) => {
	const report = db.get("SELECT * FROM lost_reports WHERE id = ?", [
		req.params.id,
	]);

	if (!report) {
		return res.status(404).json({ error: "Report not found" });
	}

	const sightings = db.all(
		"SELECT * FROM found_reports WHERE lost_report_id = ? ORDER BY created_at DESC",
		[req.params.id],
	);

	res.json({
		...formatReport(report),
		sightings: sightings.map((s) => ({
			id: s.id,
			lostReportId: s.lost_report_id,
			reporterId: s.reporter_id,
			proofPhoto: s.proof_photo,
			description: s.description,
			contactInfo: s.contact_info,
			verified: s.verified === 1,
			createdAt: s.created_at,
		})),
	});
});

// ── POST /api/lost-reports ──────────────────────────────────
router.post("/", (req, res) => {
	const user = getUser(req);
	if (!user) return res.status(401).json({ error: "Not logged in" });

	const {
		name,
		description,
		lastSeenLocation,
		lastSeenClothes,
		photo,
		familyMemberId,
	} = req.body;

	if (!name || !description || !lastSeenLocation) {
		return res
			.status(400)
			.json({
				error: "Name, description, and last seen location are required",
			});
	}

	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	db.run(
		`INSERT INTO lost_reports (id, reporter_id, family_member_id, name, photo, description, last_seen_location, last_seen_clothes, status, final_found_verdict, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'missing', 0, ?, ?)`,
		[
			id,
			user.id,
			familyMemberId || null,
			name,
			photo || "",
			description,
			lastSeenLocation,
			lastSeenClothes || "",
			now,
			now,
		],
	);

	// Create alert
	db.run(
		`INSERT INTO alerts (id, user_id, type, message, related_id)
     VALUES (?, ?, ?, ?, ?)`,
		[
			crypto.randomUUID(),
			user.id,
			"LOST_REPORTED",
			`Missing person report filed for ${name}`,
			id,
		],
	);

	const report = db.get("SELECT * FROM lost_reports WHERE id = ?", [id]);
	res.json(formatReport(report));
});

// ── PUT /api/lost-reports/:id ───────────────────────────────
router.put("/:id", (req, res) => {
	const user = getUser(req);
	if (!user) return res.status(401).json({ error: "Not logged in" });

	const existing = db.get("SELECT * FROM lost_reports WHERE id = ?", [
		req.params.id,
	]);

	if (!existing) {
		return res.status(404).json({ error: "Report not found" });
	}

	if (existing.reporter_id !== user.id) {
		return res
			.status(403)
			.json({ error: "Only the original reporter can update this" });
	}

	const {
		status,
		finalFoundVerdict,
		name,
		description,
		lastSeenLocation,
		lastSeenClothes,
		photo,
	} = req.body;

	db.run(
		`UPDATE lost_reports
     SET status = COALESCE(?, status),
         final_found_verdict = COALESCE(?, final_found_verdict),
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         last_seen_location = COALESCE(?, last_seen_location),
         last_seen_clothes = COALESCE(?, last_seen_clothes),
         photo = COALESCE(?, photo),
         updated_at = datetime('now')
     WHERE id = ?`,
		[
			status,
			finalFoundVerdict !== undefined ? (finalFoundVerdict ? 1 : 0) : null,
			name,
			description,
			lastSeenLocation,
			lastSeenClothes,
			photo,
			req.params.id,
		],
	);

	if (finalFoundVerdict) {
		db.run(
			`INSERT INTO alerts (id, user_id, type, message, related_id)
       VALUES (?, ?, ?, ?, ?)`,
			[
				crypto.randomUUID(),
				user.id,
				"CASE_CLOSED",
				`Case closed: ${existing.name} has been found`,
				req.params.id,
			],
		);
	}

	const updated = db.get("SELECT * FROM lost_reports WHERE id = ?", [
		req.params.id,
	]);
	res.json(formatReport(updated));
});

module.exports = router;

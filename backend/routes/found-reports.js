/* ============================================================
   FOUND REPORTS ROUTES — Sighting submissions and verification
   ============================================================ */

const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { getUser } = require("./auth");

const router = express.Router();

// Helper: convert DB row to camelCase
function formatSighting(s) {
  return {
    id: s.id,
    lostReportId: s.lost_report_id,
    reporterId: s.reporter_id,
    proofPhoto: s.proof_photo,
    description: s.description,
    contactInfo: s.contact_info,
    verified: s.verified === 1,
    createdAt: s.created_at,
  };
}

// ── GET /api/found-reports ──────────────────────────────────
router.get("/", (req, res) => {
  const { lostReportId } = req.query;

  let sightings;
  if (lostReportId) {
    sightings = db.all(
      "SELECT * FROM found_reports WHERE lost_report_id = ? ORDER BY created_at DESC",
      [lostReportId]
    );
  } else {
    sightings = db.all(
      "SELECT * FROM found_reports ORDER BY created_at DESC"
    );
  }

  res.json(sightings.map(formatSighting));
});

// ── POST /api/found-reports ─────────────────────────────────
router.post("/", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const { lostReportId, description, contactInfo, proofPhoto } = req.body;

  if (!lostReportId || !description || !contactInfo) {
    return res
      .status(400)
      .json({ error: "Lost report ID, description, and contact info are required" });
  }

  const lostReport = db.get("SELECT * FROM lost_reports WHERE id = ?", [
    lostReportId,
  ]);

  if (!lostReport) {
    return res.status(404).json({ error: "Lost report not found" });
  }

  const id = crypto.randomUUID();
  db.run(
    `INSERT INTO found_reports (id, lost_report_id, reporter_id, proof_photo, description, contact_info, verified)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, lostReportId, user.id, proofPhoto || "", description, contactInfo]
  );

  // Create alert for the original reporter
  db.run(
    `INSERT INTO alerts (id, user_id, type, message, related_id)
     VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), lostReport.reporter_id, "FOUND_REPORTED", `New sighting reported for ${lostReport.name}`, lostReportId]
  );

  const sighting = db.get("SELECT * FROM found_reports WHERE id = ?", [id]);
  res.json(formatSighting(sighting));
});

// ── PATCH /api/found-reports/:id/verify ─────────────────────
router.patch("/:id/verify", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const sighting = db.get("SELECT * FROM found_reports WHERE id = ?", [
    req.params.id,
  ]);

  if (!sighting) {
    return res.status(404).json({ error: "Sighting not found" });
  }

  const lostReport = db.get("SELECT * FROM lost_reports WHERE id = ?", [
    sighting.lost_report_id,
  ]);

  if (!lostReport || lostReport.reporter_id !== user.id) {
    return res
      .status(403)
      .json({ error: "Only the original reporter can verify sightings" });
  }

  db.run("UPDATE found_reports SET verified = 1 WHERE id = ?", [
    req.params.id,
  ]);

  db.run(
    "UPDATE lost_reports SET status = 'found', updated_at = datetime('now') WHERE id = ?",
    [sighting.lost_report_id]
  );

  // Create alert
  db.run(
    `INSERT INTO alerts (id, user_id, type, message, related_id)
     VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), user.id, "FOUND_VERIFIED", `Sighting verified for ${lostReport.name}`, sighting.lost_report_id]
  );

  const updated = db.get("SELECT * FROM found_reports WHERE id = ?", [
    req.params.id,
  ]);
  res.json(formatSighting(updated));
});

module.exports = router;

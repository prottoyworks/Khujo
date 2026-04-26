/* ============================================================
   ALERTS ROUTES — Get and manage notifications
   ============================================================ */

const express = require("express");
const db = require("../db");
const { getUser } = require("./auth");

const router = express.Router();

// ── GET /api/alerts ─────────────────────────────────────────
router.get("/", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const alerts = db.all(
    "SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [user.id]
  );

  res.json(
    alerts.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      relatedId: a.related_id,
      read: a.read === 1,
      createdAt: a.created_at,
    }))
  );
});

// ── PATCH /api/alerts/:id/read ──────────────────────────────
router.patch("/:id/read", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  db.run("UPDATE alerts SET read = 1 WHERE id = ? AND user_id = ?", [
    req.params.id,
    user.id,
  ]);

  res.json({ message: "Marked as read" });
});

// ── PATCH /api/alerts/read-all ──────────────────────────────
router.patch("/read-all", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  db.run("UPDATE alerts SET read = 1 WHERE user_id = ?", [user.id]);

  res.json({ message: "All marked as read" });
});

module.exports = router;

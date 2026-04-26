/* ============================================================
   FAMILY ROUTES — CRUD for family members
   ============================================================ */

const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { getUser } = require("./auth");

const router = express.Router();

// ── GET /api/family ─────────────────────────────────────────
router.get("/", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const members = db.all(
    "SELECT * FROM family_members WHERE user_id = ? ORDER BY created_at DESC",
    [user.id]
  );

  res.json(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      relationship: m.relationship,
      description: m.description,
      photo: m.photo,
      createdAt: m.created_at,
    }))
  );
});

// ── POST /api/family ────────────────────────────────────────
router.post("/", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const { name, relationship, description, photo } = req.body;

  if (!name || !relationship) {
    return res.status(400).json({ error: "Name and relationship are required" });
  }

  const id = crypto.randomUUID();
  db.run(
    `INSERT INTO family_members (id, user_id, name, relationship, description, photo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, user.id, name, relationship, description || "", photo || ""]
  );

  const member = db.get("SELECT * FROM family_members WHERE id = ?", [id]);

  res.json({
    id: member.id,
    name: member.name,
    relationship: member.relationship,
    description: member.description,
    photo: member.photo,
    createdAt: member.created_at,
  });
});

// ── PUT /api/family/:id ─────────────────────────────────────
router.put("/:id", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const { name, relationship, description, photo } = req.body;

  const existing = db.get(
    "SELECT * FROM family_members WHERE id = ? AND user_id = ?",
    [req.params.id, user.id]
  );

  if (!existing) {
    return res.status(404).json({ error: "Family member not found" });
  }

  db.run(
    `UPDATE family_members
     SET name = COALESCE(?, name),
         relationship = COALESCE(?, relationship),
         description = COALESCE(?, description),
         photo = COALESCE(?, photo)
     WHERE id = ?`,
    [name, relationship, description, photo, req.params.id]
  );

  const updated = db.get("SELECT * FROM family_members WHERE id = ?", [
    req.params.id,
  ]);

  res.json({
    id: updated.id,
    name: updated.name,
    relationship: updated.relationship,
    description: updated.description,
    photo: updated.photo,
    createdAt: updated.created_at,
  });
});

// ── DELETE /api/family/:id ──────────────────────────────────
router.delete("/:id", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const existing = db.get(
    "SELECT * FROM family_members WHERE id = ? AND user_id = ?",
    [req.params.id, user.id]
  );

  if (!existing) {
    return res.status(404).json({ error: "Family member not found" });
  }

  db.run("DELETE FROM family_members WHERE id = ?", [req.params.id]);

  res.json({ message: "Deleted" });
});

module.exports = router;

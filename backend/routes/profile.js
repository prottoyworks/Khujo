/* ============================================================
   PROFILE ROUTES — Get and Update user profile
   ============================================================ */

const express = require("express");
const db = require("../db");
const { getUser } = require("./auth");

const router = express.Router();

// ── GET /api/profile ────────────────────────────────────────
router.get("/", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  res.json({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    phone: user.phone,
    nidPhoto: user.nid_photo,
    selfiePhoto: user.selfie_photo,
  });
});

// ── PUT /api/profile ────────────────────────────────────────
router.put("/", (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const { fullName, phone, nidPhoto, selfiePhoto } = req.body;

  db.run(
    `UPDATE users
     SET full_name = COALESCE(?, full_name),
         phone = COALESCE(?, phone),
         nid_photo = COALESCE(?, nid_photo),
         selfie_photo = COALESCE(?, selfie_photo)
     WHERE id = ?`,
    [fullName, phone, nidPhoto, selfiePhoto, user.id]
  );

  const updated = db.get("SELECT * FROM users WHERE id = ?", [user.id]);
  res.json({
    id: updated.id,
    username: updated.username,
    fullName: updated.full_name,
    phone: updated.phone,
    nidPhoto: updated.nid_photo,
    selfiePhoto: updated.selfie_photo,
  });
});

module.exports = router;

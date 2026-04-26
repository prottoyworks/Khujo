/* ============================================================
   SERVER — Express entry point for Khujo backend
   ============================================================ */

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" })); // large limit for base64 photos

// Serve frontend files (HTML, CSS, JS) from the frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// ── API Routes ──────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/family", require("./routes/family"));
app.use("/api/lost-reports", require("./routes/lost-reports"));
app.use("/api/found-reports", require("./routes/found-reports"));
app.use("/api/alerts", require("./routes/alerts"));

// ── Start Server (after DB is ready) ────────────────────────
db.init().then(() => {
	app.listen(PORT, () => {
		console.log(`Khujo backend running on http://localhost:${PORT}`);
	});
});



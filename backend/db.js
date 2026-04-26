/* ============================================================
   DATABASE — SQLite setup using sql.js (pure JavaScript)
   ============================================================ */

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "khujo.db");

let db = null;

// Save database to file after every write
function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Initialize the database (call this before starting the server)
async function init() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create all tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      nid_photo TEXT DEFAULT '',
      selfie_photo TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      description TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lost_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      family_member_id TEXT,
      name TEXT NOT NULL,
      photo TEXT DEFAULT '',
      description TEXT NOT NULL,
      last_seen_location TEXT NOT NULL,
      last_seen_clothes TEXT DEFAULT '',
      status TEXT DEFAULT 'missing',
      final_found_verdict INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS found_reports (
      id TEXT PRIMARY KEY,
      lost_report_id TEXT NOT NULL,
      reporter_id TEXT DEFAULT '',
      proof_photo TEXT DEFAULT '',
      description TEXT NOT NULL,
      contact_info TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lost_report_id) REFERENCES lost_reports(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT '',
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      related_id TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  save();
  return db;
}

// ── Helper functions that wrap sql.js into a simpler API ────

// sql.js refuses `undefined` binds — coerce to null so COALESCE-style
// "patch only the fields the client sent" updates work.
function normalize(params) {
  return params.map((p) => (p === undefined ? null : p));
}

// Run a query that returns rows (SELECT)
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(normalize(params));
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Run a query that returns one row
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Run a query that modifies data (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  db.run(sql, normalize(params));
  save(); // persist to file after every write
}

module.exports = { init, all, get, run, save };

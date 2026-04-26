/* ============================================================
   SEED — Populate the database with demo data
   ============================================================ */

const crypto = require("crypto");
const db = require("./db");

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600000).toISOString();
}

async function seed() {
  await db.init();

  // Only seed if no users exist
  const existing = db.get("SELECT COUNT(*) as count FROM users");
  if (existing.count > 0) {
    console.log("Database already has data. Skipping seed.");
    process.exit(0);
  }

  // ── Create demo user ──────────────────────────────────────
  const adminId = crypto.randomUUID();
  db.run(
    "INSERT INTO users (id, username, password, full_name, phone) VALUES (?, ?, ?, ?, ?)",
    [adminId, "admin", "admin", "Admin User", "01700-000000"]
  );
  console.log("Created admin user (username: admin, password: admin)");

  // ── Seed lost reports ─────────────────────────────────────
  const reports = [
    {
      id: "seed-001",
      name: "Rahim Uddin",
      description:
        "Male, approximately 65 years old. Has a grey beard, wears glasses. Hard of hearing.",
      lastSeenLocation: "Mirpur-10, Dhaka",
      lastSeenClothes: "White panjabi, grey lungi",
      createdAt: hoursAgo(5),
    },
    {
      id: "seed-002",
      name: "Fatema Khanam",
      description:
        "Female, approximately 45 years old. Medium height, wears hijab. Has a scar on her left hand.",
      lastSeenLocation: "Farmgate Bus Stand, Dhaka",
      lastSeenClothes: "Black abaya, green scarf",
      createdAt: hoursAgo(12),
    },
    {
      id: "seed-003",
      name: "Karim Hossain",
      description:
        "Male, approximately 10 years old. Short, slim build. Has a birthmark on the right cheek.",
      lastSeenLocation: "Motijheel, Dhaka",
      lastSeenClothes: "Blue school uniform, black backpack",
      createdAt: hoursAgo(28),
    },
    {
      id: "seed-004",
      name: "Nasrin Akter",
      description:
        "Female, approximately 30 years old. Tall, long black hair. Speaks with a Chittagong accent.",
      lastSeenLocation: "Sadarghat Launch Terminal, Dhaka",
      lastSeenClothes: "Pink saree, red blouse",
      createdAt: hoursAgo(48),
    },
  ];

  for (const r of reports) {
    db.run(
      `INSERT INTO lost_reports (id, reporter_id, name, description, last_seen_location, last_seen_clothes, status, final_found_verdict, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'missing', 0, ?, ?)`,
      [r.id, adminId, r.name, r.description, r.lastSeenLocation, r.lastSeenClothes, r.createdAt, r.createdAt]
    );
  }
  console.log(`Inserted ${reports.length} lost reports`);

  // ── Seed found reports (sightings) ────────────────────────
  db.run(
    `INSERT INTO found_reports (id, lost_report_id, description, contact_info, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "seed-found-001",
      "seed-003",
      "Saw a boy matching this description near Gulistan Bus Terminal. He appeared confused.",
      "01711-000000",
      0,
      hoursAgo(10),
    ]
  );

  db.run(
    `INSERT INTO found_reports (id, lost_report_id, description, contact_info, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "seed-found-002",
      "seed-004",
      "Found this person at Sadarghat Police Station. She has been reunited with her family.",
      "Sadarghat Police Station, Officer: Rashid",
      1,
      hoursAgo(24),
    ]
  );

  console.log("Inserted 2 found reports (sightings)");
  console.log("Seed complete!");
}

seed();

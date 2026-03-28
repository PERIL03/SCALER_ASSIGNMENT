const fs = require("fs");
const path = require("path");
const { randomBytes, scryptSync } = require("node:crypto");
const { pool, query } = require("./db");
const { DateTime } = require("luxon");

function toMySqlDateTime(iso) {
  return DateTime.fromISO(iso, { zone: "utc" }).toFormat("yyyy-LL-dd HH:mm:ss");
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

async function runSeed() {
  try {
    const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await query(schemaSql);

    const requiredColumns = [
      {
        name: "password_hash",
        sql: "ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email",
      },
      {
        name: "email_verified",
        sql: "ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash",
      },
      {
        name: "email_verification_token",
        sql: "ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(128) NULL AFTER email_verified",
      },
      {
        name: "password_reset_token_hash",
        sql: "ALTER TABLE users ADD COLUMN password_reset_token_hash VARCHAR(128) NULL AFTER email_verification_token",
      },
      {
        name: "password_reset_expires_at",
        sql: "ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME NULL AFTER password_reset_token_hash",
      },
      {
        name: "onboarding_completed",
        sql: "ALTER TABLE users ADD COLUMN onboarding_completed TINYINT(1) NOT NULL DEFAULT 0 AFTER password_reset_expires_at",
      },
    ];

    for (const column of requiredColumns) {
      const rows = await query(
        `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND COLUMN_NAME = ?
         LIMIT 1`,
        [column.name]
      );

      if (rows.length === 0) {
        await query(column.sql);
      }
    }

    const defaultPasswordHash = hashPassword("password123");

    await query(
      `INSERT INTO users (
         id, name, email, password_hash,
         email_verified, email_verification_token,
         password_reset_token_hash, password_reset_expires_at,
         onboarding_completed
       )
       VALUES (1, 'Default User', 'default@calclone.dev', ?, 1, NULL, NULL, NULL, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         email = VALUES(email),
         password_hash = VALUES(password_hash),
         email_verified = VALUES(email_verified),
         email_verification_token = VALUES(email_verification_token),
         password_reset_token_hash = VALUES(password_reset_token_hash),
         password_reset_expires_at = VALUES(password_reset_expires_at),
         onboarding_completed = VALUES(onboarding_completed)`,
      [defaultPasswordHash]
    );

    await query(
      `INSERT INTO user_preferences (user_id, timezone)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE timezone = VALUES(timezone)`,
      [process.env.DEFAULT_TIMEZONE || "Asia/Kolkata"]
    );

    await query("DELETE FROM bookings");
    await query("DELETE FROM availability_rules");
    await query("DELETE FROM event_types");

    await query(
      `INSERT INTO event_types (user_id, title, description, duration_minutes, slug)
       VALUES
       (1, '15 Min Intro Call', 'Quick intro and requirement discussion.', 15, 'intro-call'),
       (1, 'Project Discussion', 'Detailed technical/project discussion meeting.', 30, 'project-discussion'),
       (1, 'System Design Mock', 'Architecture and trade-off focused mock interview.', 45, 'system-design-mock'),
       (1, 'Career Mentorship', 'Resume, roadmap, and growth strategy session.', 60, 'career-mentorship')`
    );

    await query(
      `INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time)
       VALUES
       (1, 1, '09:00', '13:00'),
       (1, 1, '14:00', '18:00'),
       (1, 2, '10:00', '17:00'),
       (1, 3, '09:30', '16:30'),
       (1, 4, '09:00', '17:00'),
       (1, 5, '10:00', '15:00')`
    );

    const [introCallRows, projectRows, systemRows] = await Promise.all([
      query("SELECT id, duration_minutes FROM event_types WHERE slug = 'intro-call'"),
      query("SELECT id, duration_minutes FROM event_types WHERE slug = 'project-discussion'"),
      query("SELECT id, duration_minutes FROM event_types WHERE slug = 'system-design-mock'"),
    ]);

    const introCall = introCallRows[0];
    const projectDiscussion = projectRows[0];
    const systemDesign = systemRows[0];

    const baseZone = process.env.DEFAULT_TIMEZONE || "Asia/Kolkata";

    const tomorrowStart = DateTime.now()
      .setZone(baseZone)
      .plus({ days: 1 })
      .set({ hour: 11, minute: 0, second: 0, millisecond: 0 })
      .toUTC();

    const nextWeekStart = DateTime.now()
      .setZone(baseZone)
      .plus({ days: 6 })
      .set({ hour: 15, minute: 0, second: 0, millisecond: 0 })
      .toUTC();

    const previousWeekStart = DateTime.now()
      .setZone(baseZone)
      .minus({ days: 6 })
      .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
      .toUTC();

    await query(
      `INSERT INTO bookings (event_type_id, booker_name, booker_email, start_time, end_time)
       VALUES (?, 'Rahul Sharma', 'rahul@example.com', ?, ?)`,
      [
        introCall.id,
        toMySqlDateTime(tomorrowStart.toISO()),
        toMySqlDateTime(tomorrowStart.plus({ minutes: introCall.duration_minutes }).toISO()),
      ]
    );

    await query(
      `INSERT INTO bookings (event_type_id, booker_name, booker_email, start_time, end_time)
       VALUES (?, 'Nikita Jain', 'nikita@example.com', ?, ?)`,
      [
        projectDiscussion.id,
        toMySqlDateTime(nextWeekStart.toISO()),
        toMySqlDateTime(
          nextWeekStart.plus({ minutes: projectDiscussion.duration_minutes }).toISO()
        ),
      ]
    );

    await query(
      `INSERT INTO bookings (event_type_id, booker_name, booker_email, start_time, end_time, status, cancelled_at)
       VALUES (?, 'Aman Verma', 'aman@example.com', ?, ?, 'cancelled', UTC_TIMESTAMP())`,
      [
        systemDesign.id,
        toMySqlDateTime(previousWeekStart.toISO()),
        toMySqlDateTime(previousWeekStart.plus({ minutes: systemDesign.duration_minutes }).toISO()),
      ]
    );

    console.log("Seed completed successfully.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSeed();

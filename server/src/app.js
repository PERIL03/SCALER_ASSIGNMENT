require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { createHash, randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const { DateTime } = require("luxon");
const { z } = require("zod");
const { pool, query } = require("./db");
const { generateSlots } = require("./utils/slots");

const app = express();
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Asia/Kolkata";
const AUTH_COOKIE_NAME = "calclone_auth";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const PASSWORD_HASH_PREFIX = "scrypt";
const ASSIGNMENT_DEFAULT_USER_ID = Number(process.env.ASSIGNMENT_DEFAULT_USER_ID || 0);
const HARD_CODED_ADMIN_EMAIL = "admin@calclone.dev";
const HARD_CODED_ADMIN_PASSWORD = "Admin@1234";
const HARD_CODED_ADMIN_USER_ID =
  Number.isInteger(ASSIGNMENT_DEFAULT_USER_ID) && ASSIGNMENT_DEFAULT_USER_ID > 0
    ? ASSIGNMENT_DEFAULT_USER_ID
    : 1;
let ensureAuthSchemaPromise;

const LOCAL_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const CONFIGURED_CORS_ORIGINS = new Set(
  String(CORS_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function isAllowedCorsOrigin(origin) {
  if (!origin) {
    // Non-browser requests (curl, server-to-server) don't send an Origin header.
    return true;
  }

  if (LOCAL_ALLOWED_ORIGINS.has(origin) || CONFIGURED_CORS_ORIGINS.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use((req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return next();
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
  } catch {
    req.auth = null;
  }

  return next();
});

app.use((req, _res, next) => {
  req.userId = getRequestUserId(req);
  next();
});

function isoToSqlDateTime(isoString) {
  return DateTime.fromISO(isoString, { zone: "utc" }).toFormat("yyyy-LL-dd HH:mm:ss");
}

function sqlDateTimeToIso(sqlDateTime) {
  if (!sqlDateTime) return null;
  return DateTime.fromSQL(String(sqlDateTime), { zone: "utc" }).toISO();
}

function getRequestUserId(req) {
  const authUserId = Number(req.auth?.userId);
  if (Number.isInteger(authUserId) && authUserId > 0) {
    return authUserId;
  }

  return null;
}

function getAuthenticatedUserId(req) {
  const authUserId = Number(req.auth?.userId);
  if (Number.isInteger(authUserId) && authUserId > 0) {
    return authUserId;
  }

  return null;
}

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseScope(value) {
  return value === "past" ? "past" : "upcoming";
}

function isAdminUserId(userId) {
  const parsedUserId = Number(userId);
  return (
    Number.isInteger(parsedUserId) &&
    parsedUserId > 0 &&
    parsedUserId === HARD_CODED_ADMIN_USER_ID
  );
}

function requireAdmin(req, res, next) {
  if (!isAdminUserId(req.userId)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
}

async function cleanupExpiredMeetings() {
  try {
    await query(
      `DELETE FROM bookings
       WHERE status = 'confirmed'
         AND end_time < UTC_TIMESTAMP()`
    );
  } catch (error) {
    console.error("Expired meeting cleanup failed", error);
  }
}

async function getUserById(userId) {
  const rows = await query(
    `SELECT id, name, email,
            email_verified AS emailVerified,
            onboarding_completed AS onboardingCompleted
     FROM users
     WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function getUserAuthStateById(userId) {
  const rows = await query(
    `SELECT id,
            email_verified AS emailVerified,
            onboarding_completed AS onboardingCompleted
     FROM users
     WHERE id = ?`,
    [userId]
  );

  return rows[0] || null;
}

function createDefaultNameFromEmail(email) {
  const raw = String(email || "").split("@")[0] || "User";
  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 100);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${PASSWORD_HASH_PREFIX}$${salt}$${digest}`;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createVerificationToken() {
  return randomBytes(24).toString("hex");
}

function verifyPassword(password, encodedHash) {
  if (!encodedHash || typeof encodedHash !== "string") return false;

  const [prefix, salt, digest] = encodedHash.split("$");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !digest) return false;

  const expectedBuffer = Buffer.from(digest, "hex");
  const actualBuffer = scryptSync(password, salt, 64);
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  // Frontend and backend run on different domains in production.
  // Cross-site auth cookies require SameSite=None and Secure=true.
  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  };
}

function setAuthCookie(res, user) {
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...getAuthCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function ensureAuthSchema() {
  if (!ensureAuthSchemaPromise) {
    ensureAuthSchemaPromise = (async () => {
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
    })();
  }

  return ensureAuthSchemaPromise;
}

function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  return next();
}

async function requireVerifiedEmail(req, res, next) {
  const userState = await getUserAuthStateById(req.userId);
  if (!userState) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!Number(userState.emailVerified)) {
    return res.status(403).json({ message: "Please verify your email first" });
  }

  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/email-signup", async (req, res) => {
  await ensureAuthSchema();

  const schema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid signup data" });
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = hashPassword(parsed.data.password);
  const verificationToken = createVerificationToken();
  const name =
    (parsed.data.name && parsed.data.name.trim()) || createDefaultNameFromEmail(email);

  try {
    await query(
      `INSERT INTO users (name, email, password_hash, email_verified, email_verification_token, onboarding_completed)
       VALUES (?, ?, ?, 0, ?, 0)`,
      [name, email, passwordHash, hashToken(verificationToken)]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    throw error;
  }

  const users = await query("SELECT id, name, email FROM users WHERE email = ?", [email]);
  const user = users[0];

  setAuthCookie(res, user);
  const response = { user };
  if (process.env.NODE_ENV !== "production") {
    response.devVerificationToken = verificationToken;
  }

  return res.status(201).json(response);
});

app.post("/api/auth/email-signin", async (req, res) => {
  await ensureAuthSchema();

  const schema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid sign-in data" });
  }

  const email = parsed.data.email.toLowerCase();

  if (
    email === HARD_CODED_ADMIN_EMAIL &&
    parsed.data.password === HARD_CODED_ADMIN_PASSWORD
  ) {
    const adminRows = await query(
      "SELECT id, name, email FROM users WHERE id = ?",
      [HARD_CODED_ADMIN_USER_ID]
    );

    const adminUser = adminRows[0];
    if (!adminUser) {
      return res.status(500).json({ message: "Admin account is not initialized" });
    }

    const normalizedAdminUser = {
      id: adminUser.id,
      name: "Admin",
      email: HARD_CODED_ADMIN_EMAIL,
    };

    setAuthCookie(res, { id: normalizedAdminUser.id, email: normalizedAdminUser.email });
    return res.json({ user: normalizedAdminUser });
  }

  const users = await query(
    "SELECT id, name, email, password_hash AS passwordHash FROM users WHERE email = ?",
    [email]
  );

  const user = users[0];
  if (!user?.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  setAuthCookie(res, { id: user.id, email: user.email });
  return res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/google", async (req, res) => {
  const idToken = req.body?.idToken;
  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  if (!googleClient || !GOOGLE_CLIENT_ID) {
    return res.status(500).json({ message: "Google auth is not configured" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.email_verified) {
      return res.status(401).json({ message: "Invalid Google account" });
    }

    const name = payload.name || payload.email.split("@")[0];
    await query(
      `INSERT INTO users (name, email)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         email_verified = 1,
         email_verification_token = NULL`,
      [name, payload.email]
    );

    await query(
      `UPDATE users
       SET email_verified = 1,
           email_verification_token = NULL
       WHERE email = ?`,
      [payload.email]
    );

    const userRows = await query("SELECT id, name, email FROM users WHERE email = ?", [
      payload.email,
    ]);
    const user = userRows[0];

    setAuthCookie(res, user);

    return res.json({ user });
  } catch {
    return res.status(401).json({ message: "Google sign-in failed" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await getUserById(authenticatedUserId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const isAdmin = isAdminUserId(user.id);
  const normalizedUser = isAdmin
    ? {
        ...user,
        name: "Admin",
        email: HARD_CODED_ADMIN_EMAIL,
      }
    : user;

  return res.json({
    user: {
      ...normalizedUser,
      isAdmin,
    },
  });
});

app.post("/api/auth/send-verification", async (req, res) => {
  await ensureAuthSchema();
  if (!req.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await getUserById(req.userId);
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (Number(user.emailVerified)) {
    return res.json({ message: "Email already verified" });
  }

  const verificationToken = createVerificationToken();
  await query(
    `UPDATE users
     SET email_verification_token = ?
     WHERE id = ?`,
    [hashToken(verificationToken), req.userId]
  );

  const response = { message: "Verification link generated" };
  if (process.env.NODE_ENV !== "production") {
    response.devVerificationToken = verificationToken;
  }

  return res.json(response);
});

app.post("/api/auth/verify-email", async (req, res) => {
  await ensureAuthSchema();

  const token = req.body?.token;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Verification token is required" });
  }

  const result = await query(
    `UPDATE users
     SET email_verified = 1,
         email_verification_token = NULL
     WHERE email_verification_token = ?`,
    [hashToken(token)]
  );

  if (result.affectedRows === 0) {
    return res.status(400).json({ message: "Invalid or expired verification token" });
  }

  return res.json({ message: "Email verified successfully" });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  await ensureAuthSchema();

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const users = await query("SELECT id, password_hash AS passwordHash FROM users WHERE email = ?", [
    email,
  ]);
  const user = users[0];
  const genericResponse = {
    message: "If this email exists, password reset instructions were generated",
  };

  if (!user?.passwordHash) {
    return res.json(genericResponse);
  }

  const rawToken = createVerificationToken();
  const expiresAt = DateTime.utc().plus({ hours: 1 }).toFormat("yyyy-LL-dd HH:mm:ss");

  await query(
    `UPDATE users
     SET password_reset_token_hash = ?,
         password_reset_expires_at = ?
     WHERE id = ?`,
    [hashToken(rawToken), expiresAt, user.id]
  );

  if (process.env.NODE_ENV !== "production") {
    genericResponse.devResetToken = rawToken;
  }

  return res.json(genericResponse);
});

app.post("/api/auth/reset-password", async (req, res) => {
  await ensureAuthSchema();

  const schema = z.object({
    token: z.string().min(10),
    password: z.string().min(8).max(72),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid reset request" });
  }

  const tokenHash = hashToken(parsed.data.token);
  const users = await query(
    `SELECT id, password_reset_expires_at AS expiresAt
     FROM users
     WHERE password_reset_token_hash = ?`,
    [tokenHash]
  );

  const user = users[0];
  if (!user?.id || !user.expiresAt) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  const isExpired = DateTime.fromSQL(String(user.expiresAt), { zone: "utc" }) <= DateTime.utc();
  if (isExpired) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  await query(
    `UPDATE users
     SET password_hash = ?,
         password_reset_token_hash = NULL,
         password_reset_expires_at = NULL
     WHERE id = ?`,
    [hashPassword(parsed.data.password), user.id]
  );

  return res.json({ message: "Password reset successful" });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
  });

  return res.json({ message: "Logged out" });
});

app.use("/api/event-types", requireAuth);
app.use("/api/event-types", requireVerifiedEmail);
app.use("/api/event-types", requireAdmin);
app.use("/api/availability", requireAuth);
app.use("/api/availability", requireVerifiedEmail);
app.use("/api/availability", requireAdmin);
app.use("/api/bookings", requireAuth);
app.use("/api/bookings", requireVerifiedEmail);
app.use("/api/public", requireAuth);
app.use("/api/public", requireVerifiedEmail);

app.post("/api/onboarding/complete", requireAuth, requireVerifiedEmail, async (req, res) => {
  const schema = z.object({
    timezone: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid onboarding data" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO user_preferences (user_id, timezone)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE timezone = VALUES(timezone)`,
      [req.userId, parsed.data.timezone]
    );

    const [existingRules] = await connection.query(
      "SELECT id FROM availability_rules WHERE user_id = ? LIMIT 1",
      [req.userId]
    );

    if (existingRules.length === 0) {
      await connection.query(
        `INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time)
         VALUES
         (?, 1, '09:00', '17:00'),
         (?, 2, '09:00', '17:00'),
         (?, 3, '09:00', '17:00'),
         (?, 4, '09:00', '17:00'),
         (?, 5, '09:00', '17:00')`,
        [req.userId, req.userId, req.userId, req.userId, req.userId]
      );
    }

    const [existingTypes] = await connection.query(
      "SELECT id FROM event_types WHERE user_id = ? LIMIT 1",
      [req.userId]
    );

    if (existingTypes.length === 0) {
      await connection.query(
        `INSERT INTO event_types (user_id, title, description, duration_minutes, slug)
         VALUES (?, 'Intro Call', 'Quick intro call to get started.', 30, ?)`,
        [req.userId, `intro-${req.userId}`]
      );
    }

    await connection.query(
      `UPDATE users
       SET onboarding_completed = 1
       WHERE id = ?`,
      [req.userId]
    );

    await connection.commit();
    return res.json({ message: "Onboarding completed" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

app.get("/api/event-types", async (_req, res) => {
  const rows = await query(
    `SELECT id, title, description, duration_minutes AS durationMinutes, slug
     FROM event_types
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [_req.userId]
  );

  res.json(rows);
});

app.post("/api/event-types", async (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    description: z.string().optional().default(""),
    durationMinutes: z.number().int().positive(),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid event type data" });
  }

  const { title, description, durationMinutes, slug } = parsed.data;

  try {
    const result = await query(
      `INSERT INTO event_types (user_id, title, description, duration_minutes, slug)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, title, description, durationMinutes, slug]
    );

    const insertedRows = await query(
      `SELECT id, title, description, duration_minutes AS durationMinutes, slug
       FROM event_types
       WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json(insertedRows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Slug already exists" });
    }

    throw error;
  }
});

app.put("/api/event-types/:id", async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid event type id" });
  }
  const schema = z.object({
    title: z.string().min(2),
    description: z.string().optional().default(""),
    durationMinutes: z.number().int().positive(),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid event type data" });
  }

  const { title, description, durationMinutes, slug } = parsed.data;

  try {
    const result = await query(
      `UPDATE event_types
       SET title = ?,
           description = ?,
           duration_minutes = ?,
           slug = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [title, description, durationMinutes, slug, id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Event type not found" });
    }

    const updatedRows = await query(
      `SELECT id, title, description, duration_minutes AS durationMinutes, slug
       FROM event_types
       WHERE id = ? AND user_id = ?`,
      [id, req.userId]
    );

    return res.json(updatedRows[0]);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Slug already exists" });
    }

    throw error;
  }
});

app.delete("/api/event-types/:id", async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "Invalid event type id" });
  }
  const result = await query("DELETE FROM event_types WHERE id = ? AND user_id = ?", [
    id,
    req.userId,
  ]);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "Event type not found" });
  }

  return res.status(204).send();
});

app.get("/api/availability", async (_req, res) => {
  const [prefRows, ruleRows] = await Promise.all([
    query("SELECT timezone FROM user_preferences WHERE user_id = ?", [_req.userId]),
    query(
      `SELECT id, day_of_week AS dayOfWeek, start_time AS startTime, end_time AS endTime
       FROM availability_rules
       WHERE user_id = ?
       ORDER BY day_of_week, start_time`,
      [_req.userId]
    ),
  ]);

  res.json({
    timezone: prefRows[0]?.timezone || DEFAULT_TIMEZONE,
    rules: ruleRows,
  });
});

app.put("/api/availability", async (req, res) => {
  const schema = z.object({
    timezone: z.string().min(1),
    rules: z.array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
    ),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid availability data" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO user_preferences (user_id, timezone)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE timezone = VALUES(timezone)`,
      [req.userId, parsed.data.timezone]
    );

    await connection.query("DELETE FROM availability_rules WHERE user_id = ?", [req.userId]);

    for (const rule of parsed.data.rules) {
      await connection.query(
        `INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time)
         VALUES (?, ?, ?, ?)`,
        [req.userId, rule.dayOfWeek, rule.startTime, rule.endTime]
      );
    }

    await connection.commit();
    res.json({ message: "Availability updated" });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

app.get("/api/public/:slug", async (req, res) => {
  const rows = await query(
    `SELECT e.id, e.title, e.description, e.duration_minutes AS durationMinutes, e.slug,
            p.timezone
     FROM event_types e
     LEFT JOIN user_preferences p ON p.user_id = e.user_id
     WHERE e.slug = ?`,
    [req.params.slug]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "Event type not found" });
  }

  res.json(rows[0]);
});

app.get("/api/public/:slug/slots", async (req, res) => {
  await cleanupExpiredMeetings();

  const date = req.query.date;
  if (!date) {
    return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });
  }

  const eventRows = await query(
    `SELECT e.id, e.user_id AS userId, e.duration_minutes AS durationMinutes, p.timezone
     FROM event_types e
     LEFT JOIN user_preferences p ON p.user_id = e.user_id
     WHERE e.slug = ?`,
    [req.params.slug]
  );

  if (eventRows.length === 0) {
    return res.status(404).json({ message: "Event type not found" });
  }

  const eventType = eventRows[0];
  const timezone = eventType.timezone || DEFAULT_TIMEZONE;

  const localDate = DateTime.fromISO(String(date), { zone: timezone });
  if (!localDate.isValid) {
    return res.status(400).json({ message: "Invalid date" });
  }

  const dayOfWeek = localDate.weekday % 7;
  const rulesRows = await query(
    `SELECT start_time, end_time
     FROM availability_rules
     WHERE user_id = ? AND day_of_week = ?
     ORDER BY start_time`,
    [eventType.userId, dayOfWeek]
  );

  const bookedRows = await query(
    `SELECT start_time
     FROM bookings
     WHERE event_type_id = ?
       AND status = 'confirmed'
       AND start_time >= ?
       AND start_time <= ?`,
    [
      eventType.id,
      localDate.startOf("day").toUTC().toFormat("yyyy-LL-dd HH:mm:ss"),
      localDate.endOf("day").toUTC().toFormat("yyyy-LL-dd HH:mm:ss"),
    ]
  );

  const bookedStartsSet = new Set(
    bookedRows.map((row) => DateTime.fromSQL(row.start_time, { zone: "utc" }).toISO())
  );

  const slots = generateSlots({
    dateIso: String(date),
    timezone,
    durationMinutes: Number(eventType.durationMinutes),
    dayRules: rulesRows,
    bookedStartsSet,
  });

  res.json(slots);
});

app.post("/api/public/:slug/book", async (req, res) => {
  const schema = z.object({
    startTimeUTC: z.string().datetime(),
    bookerName: z.string().min(2).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid booking details" });
  }

  const eventRows = await query(
    `SELECT e.id, e.user_id AS userId, e.duration_minutes AS durationMinutes, p.timezone
     FROM event_types e
     LEFT JOIN user_preferences p ON p.user_id = e.user_id
     WHERE e.slug = ?`,
    [req.params.slug]
  );

  if (eventRows.length === 0) {
    return res.status(404).json({ message: "Event type not found" });
  }

  const eventType = eventRows[0];
  const authenticatedUser = await getUserById(Number(req.userId));
  if (!authenticatedUser) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const bookerName =
    (parsed.data.bookerName && parsed.data.bookerName.trim()) ||
    authenticatedUser.name ||
    createDefaultNameFromEmail(authenticatedUser.email);
  const timezone = eventType.timezone || DEFAULT_TIMEZONE;
  const startUtc = DateTime.fromISO(parsed.data.startTimeUTC, { zone: "utc" });
  const endUtc = startUtc.plus({ minutes: Number(eventType.durationMinutes) });

  if (!startUtc.isValid || startUtc <= DateTime.utc()) {
    return res.status(400).json({ message: "Invalid or past time slot" });
  }

  const localDate = startUtc.setZone(timezone);
  const dateIso = localDate.toISODate();
  const dayOfWeek = localDate.weekday % 7;

  const [rulesRows, bookedRows] = await Promise.all([
    query(
      `SELECT start_time, end_time
       FROM availability_rules
       WHERE user_id = ? AND day_of_week = ?
       ORDER BY start_time`,
      [eventType.userId, dayOfWeek]
    ),
    query(
      `SELECT start_time
       FROM bookings
       WHERE event_type_id = ?
         AND status = 'confirmed'
         AND start_time >= ?
         AND start_time <= ?`,
      [
        eventType.id,
        localDate.startOf("day").toUTC().toFormat("yyyy-LL-dd HH:mm:ss"),
        localDate.endOf("day").toUTC().toFormat("yyyy-LL-dd HH:mm:ss"),
      ]
    ),
  ]);

  const bookedStartsSet = new Set(
    bookedRows.map((row) => DateTime.fromSQL(row.start_time, { zone: "utc" }).toISO())
  );

  const slots = generateSlots({
    dateIso,
    timezone,
    durationMinutes: Number(eventType.durationMinutes),
    dayRules: rulesRows,
    bookedStartsSet,
  });

  const requestedSlot = slots.find((slot) => slot.startTimeUTC === startUtc.toUTC().toISO());

  if (!requestedSlot) {
    return res.status(400).json({ message: "Selected slot is not available" });
  }

  try {
    const bookingResult = await query(
      `INSERT INTO bookings (event_type_id, booker_name, booker_email, start_time, end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [
        eventType.id,
        bookerName,
        authenticatedUser.email,
        isoToSqlDateTime(startUtc.toISO()),
        isoToSqlDateTime(endUtc.toISO()),
      ]
    );

    return res.status(201).json({ bookingId: bookingResult.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "This slot is already booked" });
    }

    throw error;
  }
});

app.get("/api/public/bookings/:id", async (req, res) => {
  const bookingId = parsePositiveInt(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const user = await getUserById(Number(req.userId));
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const rows = await query(
    `SELECT b.id, b.booker_name AS bookerName, b.booker_email AS bookerEmail,
            b.start_time AS startTime, b.end_time AS endTime, b.status,
            e.title AS eventTitle, e.slug,
            p.timezone
     FROM bookings b
     JOIN event_types e ON e.id = b.event_type_id
     LEFT JOIN user_preferences p ON p.user_id = e.user_id
     WHERE b.id = ?`,
    [bookingId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const booking = rows[0];
  const isAdmin = isAdminUserId(user.id);
  const isOwner = String(booking.bookerEmail || "").toLowerCase() === String(user.email || "").toLowerCase();
  if (!isAdmin && !isOwner) {
    return res.status(404).json({ message: "Booking not found" });
  }

  res.json({
    ...booking,
    startTime: sqlDateTimeToIso(booking.startTime),
    endTime: sqlDateTimeToIso(booking.endTime),
  });
});

app.get("/api/bookings", async (req, res) => {
  await cleanupExpiredMeetings();

  const user = await getUserById(Number(req.userId));
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const isAdmin = isAdminUserId(user.id);
  const scope = parseScope(req.query.scope);
  const operator = scope === "past" ? "<" : ">=";

  const rows = isAdmin
    ? await query(
        `SELECT b.id, b.booker_name AS bookerName, b.booker_email AS bookerEmail,
                b.start_time AS startTime, b.end_time AS endTime, b.status,
                e.title AS eventTitle, e.slug
         FROM bookings b
         JOIN event_types e ON e.id = b.event_type_id
         WHERE e.user_id = ? AND b.start_time ${operator} UTC_TIMESTAMP()
         ORDER BY b.start_time ASC`,
        [user.id]
      )
    : await query(
        `SELECT b.id, b.booker_name AS bookerName, b.booker_email AS bookerEmail,
                b.start_time AS startTime, b.end_time AS endTime, b.status,
                e.title AS eventTitle, e.slug
         FROM bookings b
         JOIN event_types e ON e.id = b.event_type_id
         WHERE LOWER(b.booker_email) = LOWER(?)
           AND b.start_time ${operator} UTC_TIMESTAMP()
         ORDER BY b.start_time ASC`,
        [user.email]
      );

  const normalizedRows = rows.map((row) => ({
    ...row,
    startTime: sqlDateTimeToIso(row.startTime),
    endTime: sqlDateTimeToIso(row.endTime),
  }));

  res.json(normalizedRows);
});

app.post("/api/bookings/:id/cancel", async (req, res) => {
  await cleanupExpiredMeetings();

  const bookingId = parsePositiveInt(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const user = await getUserById(Number(req.userId));
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const isAdmin = isAdminUserId(user.id);
  if (!isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const result = await query(
    `UPDATE bookings b
     JOIN event_types e ON e.id = b.event_type_id
     SET status = 'cancelled', cancelled_at = UTC_TIMESTAMP()
     WHERE b.id = ? AND b.status = 'confirmed' AND e.user_id = ?`,
    [bookingId, user.id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "Booking not found or already cancelled" });
  }

  res.json({ message: "Booking cancelled" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong" });
});

module.exports = app;

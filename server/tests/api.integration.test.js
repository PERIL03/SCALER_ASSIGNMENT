const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { DateTime } = require("luxon");
const request = require("supertest");

const app = require("../src/app");
const { pool } = require("../src/db");

const serverRoot = path.join(__dirname, "..");

function runSeed() {
  execSync("npm run seed", {
    cwd: serverRoot,
    stdio: "ignore",
  });
}

async function getAuthenticatedAgent() {
  const agent = request.agent(app);
  const signInResponse = await agent.post("/api/auth/email-signin").send({
    email: "admin@calclone.dev",
    password: "Admin@1234",
  });

  assert.equal(signInResponse.status, 200);
  return agent;
}

async function signUpAndSignInUser(email) {
  const agent = request.agent(app);

  const signupResponse = await agent.post("/api/auth/email-signup").send({
    name: "Normal User",
    email,
    password: "Pass@1234",
  });
  assert.equal(signupResponse.status, 201);

  const verifyToken = signupResponse.body.devVerificationToken;
  assert.ok(verifyToken);

  const verifyResponse = await agent.post("/api/auth/verify-email").send({
    token: verifyToken,
  });
  assert.equal(verifyResponse.status, 200);

  const signinResponse = await agent.post("/api/auth/email-signin").send({
    email,
    password: "Pass@1234",
  });
  assert.equal(signinResponse.status, 200);

  return agent;
}

async function findDateWithSlots(slug, agent, maxLookaheadDays = 21) {
  for (let offset = 1; offset <= maxLookaheadDays; offset += 1) {
    const date = DateTime.now().plus({ days: offset }).toISODate();
    const slotsResponse = await agent.get(`/api/public/${slug}/slots`).query({ date });

    if (slotsResponse.status === 200 && slotsResponse.body.length > 0) {
      return { date, slots: slotsResponse.body };
    }
  }

  throw new Error("No available slots found in lookahead window");
}

test.beforeEach(() => {
  runSeed();
});

test.after(async () => {
  await pool.end();
});

test("event type CRUD and availability APIs work", async () => {
  const agent = await getAuthenticatedAgent();

  const listResponse = await agent.get("/api/event-types");
  assert.equal(listResponse.status, 200);
  assert.ok(Array.isArray(listResponse.body));
  assert.ok(listResponse.body.length >= 2);

  const createPayload = {
    title: "System Design Interview",
    description: "Architecture discussion",
    durationMinutes: 45,
    slug: "system-design-interview",
  };

  const createResponse = await agent.post("/api/event-types").send(createPayload);

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.slug, createPayload.slug);

  const updateResponse = await agent
    .put(`/api/event-types/${createResponse.body.id}`)
    .send({
      ...createPayload,
      title: "System Design Mock",
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.title, "System Design Mock");

  const availabilityPayload = {
    timezone: "Asia/Kolkata",
    rules: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" },
      { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
    ],
  };

  const updateAvailabilityResponse = await agent
    .put("/api/availability")
    .send(availabilityPayload);

  assert.equal(updateAvailabilityResponse.status, 200);

  const getAvailabilityResponse = await agent.get("/api/availability");
  assert.equal(getAvailabilityResponse.status, 200);
  assert.equal(getAvailabilityResponse.body.timezone, "Asia/Kolkata");
  assert.equal(getAvailabilityResponse.body.rules.length, 2);

  const deleteResponse = await agent.delete(`/api/event-types/${createResponse.body.id}`);
  assert.equal(deleteResponse.status, 204);
});

test("public booking flow prevents double booking and supports cancellation", async () => {
  const agent = await getAuthenticatedAgent();
  const slug = "intro-call";

  const publicEventResponse = await agent.get(`/api/public/${slug}`);
  assert.equal(publicEventResponse.status, 200);
  assert.equal(publicEventResponse.body.slug, slug);

  const { slots } = await findDateWithSlots(slug, agent);
  const selectedSlot = slots[0];

  const createBookingResponse = await agent
    .post(`/api/public/${slug}/book`)
    .send({
      startTimeUTC: selectedSlot.startTimeUTC,
      bookerName: "Integration Test User",
      // Use the signed-in user's email so non-admin visibility rules include this booking.
      bookerEmail: "admin@calclone.dev",
    });

  assert.equal(createBookingResponse.status, 201);
  assert.ok(createBookingResponse.body.bookingId);

  const duplicateBookingResponse = await agent
    .post(`/api/public/${slug}/book`)
    .send({
      startTimeUTC: selectedSlot.startTimeUTC,
      bookerName: "Duplicate User",
      bookerEmail: "duplicate@example.com",
    });

  assert.equal(duplicateBookingResponse.status, 400);
  assert.equal(duplicateBookingResponse.body.message, "Selected slot is not available");

  const confirmationResponse = await agent.get(
    `/api/public/bookings/${createBookingResponse.body.bookingId}`
  );

  assert.equal(confirmationResponse.status, 200);
  assert.equal(confirmationResponse.body.status, "confirmed");

  const upcomingResponse = await agent.get("/api/bookings").query({ scope: "upcoming" });

  assert.equal(upcomingResponse.status, 200);
  assert.ok(
    upcomingResponse.body.some((booking) => booking.id === createBookingResponse.body.bookingId)
  );

  const cancelResponse = await agent.post(`/api/bookings/${createBookingResponse.body.bookingId}/cancel`);

  assert.equal(cancelResponse.status, 200);

  const cancelAgainResponse = await agent.post(
    `/api/bookings/${createBookingResponse.body.bookingId}/cancel`
  );

  assert.equal(cancelAgainResponse.status, 404);
});

test("all feature APIs require login", async () => {
  const [eventsResponse, availabilityResponse, bookingsResponse, publicEventResponse, publicSlotsResponse] = await Promise.all([
    request(app).get("/api/event-types"),
    request(app).get("/api/availability"),
    request(app).get("/api/bookings"),
    request(app).get("/api/public/intro-call"),
    request(app).get(`/api/public/intro-call/slots`).query({ date: DateTime.now().plus({ days: 1 }).toISODate() }),
  ]);

  assert.equal(eventsResponse.status, 401);
  assert.equal(availabilityResponse.status, 401);
  assert.equal(bookingsResponse.status, 401);
  assert.equal(publicEventResponse.status, 401);
  assert.equal(publicSlotsResponse.status, 401);
});

test("admin auth response returns canonical admin identity", async () => {
  const agent = await getAuthenticatedAgent();
  const meResponse = await agent.get("/api/auth/me");

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.isAdmin, true);
  assert.equal(meResponse.body.user.email, "admin@calclone.dev");
  assert.equal(meResponse.body.user.name, "Admin");
});

test("normal user cannot manage meetings and can only view own bookings", async () => {
  const adminAgent = await getAuthenticatedAgent();

  const userEmail = `member-${Date.now()}@example.com`;
  const userAgent = await signUpAndSignInUser(userEmail);

  const eventTypesResponse = await userAgent.get("/api/event-types");
  assert.equal(eventTypesResponse.status, 403);

  const availabilityResponse = await userAgent.get("/api/availability");
  assert.equal(availabilityResponse.status, 403);

  const { slots } = await findDateWithSlots("intro-call", userAgent);
  const selectedSlot = slots[0];

  const userBookingResponse = await userAgent
    .post("/api/public/intro-call/book")
    .send({
      startTimeUTC: selectedSlot.startTimeUTC,
      bookerName: "Normal User",
      bookerEmail: userEmail,
    });

  assert.equal(userBookingResponse.status, 201);

  const ownBookingsResponse = await userAgent.get("/api/bookings");
  assert.equal(ownBookingsResponse.status, 200);
  assert.ok(ownBookingsResponse.body.some((booking) => booking.id === userBookingResponse.body.bookingId));

  const hasOtherUserBookings = ownBookingsResponse.body.some(
    (booking) => String(booking.bookerEmail).toLowerCase() !== userEmail.toLowerCase()
  );
  assert.equal(hasOtherUserBookings, false);

  const userCancelResponse = await userAgent.post(
    `/api/bookings/${userBookingResponse.body.bookingId}/cancel`
  );
  assert.equal(userCancelResponse.status, 403);

  const adminCancelResponse = await adminAgent.post(
    `/api/bookings/${userBookingResponse.body.bookingId}/cancel`
  );
  assert.equal(adminCancelResponse.status, 200);
});

test("expired meetings are removed automatically", async () => {
  const agent = await getAuthenticatedAgent();

  const eventTypesResponse = await agent.get("/api/event-types");
  assert.equal(eventTypesResponse.status, 200);
  const introCall = eventTypesResponse.body.find((eventType) => eventType.slug === "intro-call");
  assert.ok(introCall);

  const pastStart = DateTime.utc().minus({ hours: 2 }).toFormat("yyyy-LL-dd HH:mm:ss");
  const pastEnd = DateTime.utc().minus({ hours: 1 }).toFormat("yyyy-LL-dd HH:mm:ss");

  await pool.query(
    `INSERT INTO bookings (event_type_id, booker_name, booker_email, start_time, end_time, status)
     VALUES (?, 'Expired User', 'expired@example.com', ?, ?, 'confirmed')`,
    [introCall.id, pastStart, pastEnd]
  );

  const beforeCleanup = await pool.query(
    `SELECT COUNT(*) AS total FROM bookings
     WHERE booker_email = 'expired@example.com'`
  );
  assert.equal(beforeCleanup[0][0].total, 1);

  const cleanupTriggerResponse = await agent.get("/api/bookings");
  assert.equal(cleanupTriggerResponse.status, 200);

  const afterCleanup = await pool.query(
    `SELECT COUNT(*) AS total FROM bookings
     WHERE booker_email = 'expired@example.com'`
  );
  assert.equal(afterCleanup[0][0].total, 0);
});

test("normal user cannot view another user's booking confirmation", async () => {
  const adminAgent = await getAuthenticatedAgent();
  const userEmail = `viewer-${Date.now()}@example.com`;
  const userAgent = await signUpAndSignInUser(userEmail);

  const { slots } = await findDateWithSlots("intro-call", adminAgent);
  const selectedSlot = slots[0];

  const adminBookingResponse = await adminAgent.post("/api/public/intro-call/book").send({
    startTimeUTC: selectedSlot.startTimeUTC,
    bookerName: "Admin User",
  });

  assert.equal(adminBookingResponse.status, 201);

  const foreignBookingResponse = await userAgent.get(
    `/api/public/bookings/${adminBookingResponse.body.bookingId}`
  );

  assert.equal(foreignBookingResponse.status, 404);
});

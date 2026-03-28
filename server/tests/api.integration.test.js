const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { DateTime } = require("luxon");
const request = require("supertest");

const app = require("../src/app");
const { pool } = require("../src/db");
const isAssignmentMode = process.env.ASSIGNMENT_MODE !== "false";
const assignmentDefaultUserId = Number(process.env.ASSIGNMENT_DEFAULT_USER_ID || 0);
const hasAssignmentFallbackUser = Number.isInteger(assignmentDefaultUserId) && assignmentDefaultUserId > 0;

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
    email: "default@calclone.dev",
    password: "password123",
  });

  assert.equal(signInResponse.status, 200);
  return agent;
}

async function findDateWithSlots(slug, maxLookaheadDays = 21) {
  for (let offset = 1; offset <= maxLookaheadDays; offset += 1) {
    const date = DateTime.now().plus({ days: offset }).toISODate();
    const slotsResponse = await request(app).get(`/api/public/${slug}/slots`).query({ date });

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

  const publicEventResponse = await request(app).get(`/api/public/${slug}`);
  assert.equal(publicEventResponse.status, 200);
  assert.equal(publicEventResponse.body.slug, slug);

  const { slots } = await findDateWithSlots(slug);
  const selectedSlot = slots[0];

  const createBookingResponse = await request(app)
    .post(`/api/public/${slug}/book`)
    .send({
      startTimeUTC: selectedSlot.startTimeUTC,
      bookerName: "Integration Test User",
      // Use the signed-in user's email so non-admin visibility rules include this booking.
      bookerEmail: "default@calclone.dev",
    });

  assert.equal(createBookingResponse.status, 201);
  assert.ok(createBookingResponse.body.bookingId);

  const duplicateBookingResponse = await request(app)
    .post(`/api/public/${slug}/book`)
    .send({
      startTimeUTC: selectedSlot.startTimeUTC,
      bookerName: "Duplicate User",
      bookerEmail: "duplicate@example.com",
    });

  assert.equal(duplicateBookingResponse.status, 400);
  assert.equal(duplicateBookingResponse.body.message, "Selected slot is not available");

  const confirmationResponse = await request(app).get(
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

test("private API access follows configured mode", async () => {
  const [eventsResponse, availabilityResponse, bookingsResponse] = await Promise.all([
    request(app).get("/api/event-types"),
    request(app).get("/api/availability"),
    request(app).get("/api/bookings"),
  ]);

  if (isAssignmentMode) {
    const expectedStatus = hasAssignmentFallbackUser ? 200 : 401;
    assert.equal(eventsResponse.status, expectedStatus);
    assert.equal(availabilityResponse.status, expectedStatus);
    assert.equal(bookingsResponse.status, expectedStatus);
    return;
  }

  assert.equal(eventsResponse.status, 401);
  assert.equal(availabilityResponse.status, 401);
  assert.equal(bookingsResponse.status, 401);
});

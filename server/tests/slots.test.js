const test = require("node:test");
const assert = require("node:assert/strict");

const { generateSlots } = require("../src/utils/slots");

test("generateSlots creates slot intervals and skips booked starts", () => {
  const slots = generateSlots({
    dateIso: "2099-01-05",
    timezone: "Asia/Kolkata",
    durationMinutes: 30,
    dayRules: [
      {
        start_time: "09:00:00",
        end_time: "10:00:00",
      },
    ],
    bookedStartsSet: new Set(["2099-01-05T03:30:00.000Z"]),
  });

  assert.equal(slots.length, 1);
  assert.equal(slots[0].label, "09:30 AM");
});

test("generateSlots does not include partial slot at the end of a rule", () => {
  const slots = generateSlots({
    dateIso: "2099-01-05",
    timezone: "Asia/Kolkata",
    durationMinutes: 45,
    dayRules: [
      {
        start_time: "09:00:00",
        end_time: "10:00:00",
      },
    ],
    bookedStartsSet: new Set(),
  });

  assert.equal(slots.length, 1);
  assert.equal(slots[0].label, "09:00 AM");
});

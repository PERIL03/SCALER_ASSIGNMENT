const { DateTime } = require("luxon");

function parseTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function buildUtcFromLocal(dateIso, timeString, timezone) {
  const dateTime = DateTime.fromISO(`${dateIso}T${timeString}`, { zone: timezone });
  return dateTime.toUTC();
}

function generateSlots({
  dateIso,
  timezone,
  durationMinutes,
  dayRules,
  bookedStartsSet,
}) {
  const slots = [];
  const nowInTimezone = DateTime.now().setZone(timezone);

  for (const rule of dayRules) {
    const startMinutes = parseTimeToMinutes(rule.start_time.slice(0, 5));
    const endMinutes = parseTimeToMinutes(rule.end_time.slice(0, 5));

    for (
      let currentMinutes = startMinutes;
      currentMinutes + durationMinutes <= endMinutes;
      currentMinutes += durationMinutes
    ) {
      const hh = String(Math.floor(currentMinutes / 60)).padStart(2, "0");
      const mm = String(currentMinutes % 60).padStart(2, "0");
      const localStart = DateTime.fromISO(`${dateIso}T${hh}:${mm}`, { zone: timezone });

      if (localStart <= nowInTimezone) {
        continue;
      }

      const utcStart = localStart.toUTC();
      const utcEnd = utcStart.plus({ minutes: durationMinutes });
      const key = utcStart.toISO();

      if (bookedStartsSet.has(key)) {
        continue;
      }

      slots.push({
        label: localStart.toFormat("hh:mm a"),
        startTimeUTC: utcStart.toISO(),
        endTimeUTC: utcEnd.toISO(),
      });
    }
  }

  return slots;
}

module.exports = {
  buildUtcFromLocal,
  generateSlots,
};

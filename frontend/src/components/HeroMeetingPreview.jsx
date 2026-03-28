"use client";

import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu"];
const BASE_DAYS = ["5", "6", "7", "8", "9", "12", "13", "14", "15", "16", "19", "20", "21", "22", "23"];
const DURATIONS = ["15m", "30m", "45m", "1h"];

const MEETING_SCENARIOS = [
  {
    avatar: "E",
    clientName: "Emma Brown",
    title: "Academic Counseling",
    description:
      "Virtual counseling session for university students to discuss academic progress and well-being.",
    activeDuration: "45m",
    platform: "MS Teams",
    location: "America/New_York",
    monthLabel: "May 2025",
    selectedDay: "16",
    selectedSlotLabel: "Thu, 16 May at 10:30 AM",
  },
  {
    avatar: "M",
    clientName: "Michael Oliver",
    title: "Legal Consultation",
    description:
      "Discuss legal matters with an attorney in a private one-on-one consultation session.",
    activeDuration: "30m",
    platform: "Zoom",
    location: "Europe/London",
    monthLabel: "May 2025",
    selectedDay: "9",
    selectedSlotLabel: "Thu, 9 May at 4:15 PM",
  },
  {
    avatar: "D",
    clientName: "Denise Wilson",
    title: "Property Viewing",
    description:
      "Tour your potential dream home with experienced real-estate professionals.",
    activeDuration: "1h",
    platform: "In person",
    location: "Australia/Sydney",
    monthLabel: "May 2025",
    selectedDay: "7",
    selectedSlotLabel: "Tue, 7 May at 1:00 PM",
  },
];

export default function HeroMeetingPreview() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % MEETING_SCENARIOS.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const scenario = MEETING_SCENARIOS[activeIndex];
  const calendarDays = useMemo(
    () => BASE_DAYS.map((day) => ({ day, active: day === scenario.selectedDay })),
    [scenario.selectedDay],
  );

  return (
    <div className="calx-preview" aria-label="Meeting preview">
      <article className="calx-event calx-sync-frame" key={`event-${activeIndex}`}>
        <p className="calx-avatar">{scenario.avatar}</p>
        <p className="calx-client-name">{scenario.clientName}</p>
        <h3>{scenario.title}</h3>
        <p>{scenario.description}</p>

        <div className="calx-slot-pills">
          {DURATIONS.map((slot) => (
            <span key={slot} className={slot === scenario.activeDuration ? "active" : ""}>
              {slot}
            </span>
          ))}
        </div>

        <ul>
          <li>Platform: {scenario.platform}</li>
          <li>Location: {scenario.location}</li>
        </ul>
      </article>

      <article className="calx-calendar calx-sync-frame" key={`calendar-${activeIndex}`} aria-label="Mini calendar">
        <h4>{scenario.monthLabel}</h4>
        <div className="calx-weekdays">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="calx-days">
          {calendarDays.map((item) => (
            <span key={item.day} className={item.active ? "active" : ""}>
              {item.day}
            </span>
          ))}
        </div>

        <div className="calx-selected-slot">
          <p>Selected</p>
          <strong>{scenario.selectedSlotLabel}</strong>
        </div>
      </article>
    </div>
  );
}
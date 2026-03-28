"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";

const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const starterRule = { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" };

export default function AvailabilityPage() {
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [rules, setRules] = useState([starterRule]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getAvailability()
      .then((data) => {
        if (cancelled) return;
        setTimezone(data.timezone || "Asia/Kolkata");
        const normalizedRules = data.rules.map((rule) => ({
          ...rule,
          startTime: String(rule.startTime).slice(0, 5),
          endTime: String(rule.endTime).slice(0, 5),
        }));

        setRules(normalizedRules.length ? normalizedRules : [starterRule]);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedPreview = useMemo(() => {
    return dayOptions.map((day) => ({
      ...day,
      items: rules.filter((rule) => Number(rule.dayOfWeek) === day.value),
    }));
  }, [rules]);

  function updateRule(index, key, value) {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, [key]: value } : rule))
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.updateAvailability({
        timezone,
        rules: rules.map((rule) => ({
          dayOfWeek: Number(rule.dayOfWeek),
          startTime: rule.startTime,
          endTime: rule.endTime,
        })),
      });
      setSuccess("Availability saved successfully.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout>
      <section>
        <div className="page-head">
          <div>
            <h1 className="page-title">Availability</h1>
            <p className="page-subtitle">
              Set your working hours and timezone to control when others can book time with you.
            </p>
          </div>
          <span className="page-head-pill">{rules.length} active rules</span>
        </div>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
        {loading ? <p className="page-subtitle">Loading availability...</p> : null}

        <form className="card form-grid availability-card" onSubmit={handleSave}>
          <label>
            Timezone
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Kolkata"
              required
            />
          </label>

          <div className="rules-wrapper">
            {rules.map((rule, index) => (
              <div className="rule-row" key={`${rule.dayOfWeek}-${index}`}>
                <select
                  value={rule.dayOfWeek}
                  onChange={(e) => updateRule(index, "dayOfWeek", e.target.value)}
                >
                  {dayOptions.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>

                <input
                  type="time"
                  value={rule.startTime}
                  onChange={(e) => updateRule(index, "startTime", e.target.value)}
                />

                <input
                  type="time"
                  value={rule.endTime}
                  onChange={(e) => updateRule(index, "endTime", e.target.value)}
                />

                <button
                  type="button"
                  className="danger-btn"
                  disabled={rules.length === 1}
                  onClick={() =>
                    setRules((prev) => prev.filter((_, ruleIndex) => ruleIndex !== index))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="button-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setRules((prev) => [...prev, { ...starterRule }])}
            >
              Add rule
            </button>
            <button type="submit">Save availability</button>
          </div>
        </form>

        <div className="card schedule-preview-card">
          <h2>Weekly schedule preview</h2>
          {groupedPreview.map((day) => (
            <p key={day.value} className="schedule-line">
              <strong>{day.label}:</strong>{" "}
              {day.items.length
                ? day.items.map((item) => `${item.startTime} - ${item.endTime}`).join(", ")
                : "Unavailable"}
            </p>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}

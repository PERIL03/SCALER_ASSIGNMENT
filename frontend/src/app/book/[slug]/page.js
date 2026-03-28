"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import GoogleAuthControls from "@/components/GoogleAuthControls";
import { api } from "@/lib/api";

function getDefaultDate() {
  return DateTime.now().plus({ days: 1 }).toISODate();
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [eventType, setEventType] = useState(null);
  const [date, setDate] = useState(getDefaultDate());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookerName, setBookerName] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .getCurrentUser()
      .then((data) => {
        if (cancelled) return;
        setBookerName(data.user?.name || "");
        setBookerEmail(data.user?.email || "");
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(`/signup?next=${encodeURIComponent(`/book/${slug}`)}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router, slug]);

  useEffect(() => {
    if (!slug) return;

    api
      .getPublicEvent(slug)
      .then((data) => setEventType(data))
      .catch((err) => setError(err.message));
  }, [slug]);

  useEffect(() => {
    if (!date || !slug) return;

    let cancelled = false;
    api
      .getPublicSlots(slug, date)
      .then((data) => {
        if (!cancelled) {
          setSlots(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, date]);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    if (!selectedSlot) {
      setError("Please select a time slot first.");
      return;
    }

    try {
      const result = await api.createPublicBooking(slug, {
        startTimeUTC: selectedSlot.startTimeUTC,
        bookerName,
      });

      router.push(`/booking-confirmation/${result.bookingId}`);
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedDateLabel = useMemo(() => {
    return DateTime.fromISO(date).toLocaleString(DateTime.DATE_FULL);
  }, [date]);

  return (
    <div className="public-page-shell">
      <header className="public-page-nav">
        <Link href="/" className="brand-link" aria-label="cal.com Home">
          <span className="brand-mark">C</span>
          <span>cal.com</span>
        </Link>

        <nav className="public-page-links" aria-label="Booking navigation">
          <Link href="/">Home</Link>
          <Link href="/bookings">My bookings</Link>
        </nav>

        <div className="public-page-actions">
          <Link href="/signup?next=%2Fdashboard&admin=1&mode=signin" className="topbar-switch-link">
            Switch to admin panel
          </Link>
          <GoogleAuthControls compact redirectTo={`/book/${slug}`} />
        </div>
      </header>

      <div className="public-wrapper">
        <section className="public-card public-card-event">
          {eventType ? (
            <>
              <p className="public-step">Step 1</p>
              <h1>{eventType.title}</h1>
              <p>{eventType.description || "No description"}</p>
              <p className="muted-strong">{eventType.durationMinutes} min meeting</p>
              <p className="page-subtitle">Timezone: {eventType.timezone || "Asia/Kolkata"}</p>
            </>
          ) : (
            <p>Loading event details...</p>
          )}
        </section>

        <section className="public-card public-card-slots">
          <p className="public-step">Step 2</p>
          <h2>Select date and time</h2>
          <label className="slot-date-field">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setSelectedSlot(null);
                setDate(e.target.value);
              }}
            />
          </label>
          <p className="page-subtitle">{selectedDateLabel}</p>

          <div className="slot-grid-wrap">
            <div className="slot-grid">
            {slots.map((slot) => (
              <button
                key={slot.startTimeUTC}
                className={
                  selectedSlot?.startTimeUTC === slot.startTimeUTC
                    ? "slot-btn slot-btn-active"
                    : "slot-btn"
                }
                onClick={() => setSelectedSlot(slot)}
              >
                {slot.label}
              </button>
            ))}
            </div>
            {!slots.length ? <p>No available times on this date.</p> : null}
          </div>
        </section>

        <section className="public-card">
          <p className="public-step">Step 3</p>
          <h2>Enter details</h2>
          {error && <p className="error-text">{error}</p>}

          {selectedSlot ? (
            <p className="slot-summary">
              Selected time: <strong>{selectedSlot.label}</strong>
            </p>
          ) : (
            <p className="page-subtitle">Choose a slot to continue.</p>
          )}

          <form className="form-grid" onSubmit={handleBookingSubmit}>
            <label>
              Name
              <input
                value={bookerName}
                onChange={(e) => setBookerName(e.target.value)}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={bookerEmail}
                disabled
                readOnly
              />
            </label>

            <button type="submit">Confirm booking</button>
          </form>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import GoogleAuthControls from "@/components/GoogleAuthControls";
import { api } from "@/lib/api";

function getDefaultDate() {
  return DateTime.now().plus({ days: 1 }).toISODate();
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [eventType, setEventType] = useState(null);
  const [date, setDate] = useState(getDefaultDate());
  const [slots, setSlots] = useState([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [bookerName, setBookerName] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [error, setError] = useState("");
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingsTab, setBookingsTab] = useState("active");

  useEffect(() => {
    let cancelled = false;

    api
      .getCurrentUser()
      .then((data) => {
        if (cancelled) return;

        setBookerName(data.user?.name || "");
        setBookerEmail(data.user?.email || "");

        Promise.all([api.getBookings("upcoming"), api.getBookings("past")])
          .then(([upcomingData, pastData]) => {
            if (cancelled) return;
            setUpcomingBookings(Array.isArray(upcomingData) ? upcomingData : []);
            setPastBookings(Array.isArray(pastData) ? pastData : []);
            setBookingsError("");
          })
          .catch((err) => {
            if (!cancelled) {
              setBookingsError(err.message || "Could not load your bookings.");
            }
          })
          .finally(() => {
            if (!cancelled) {
              setBookingsLoading(false);
            }
          });
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
          const normalizedSlots = Array.isArray(data) ? data : [];
          setSlots(normalizedSlots);

          const selectedStillExists = normalizedSlots.some(
            (slot) => slot.startTimeUTC === selectedSlotKey
          );
          if (!selectedStillExists) {
            setSelectedSlotKey("");
          }
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
  }, [slug, date, selectedSlotKey]);

  const selectedSlot = useMemo(() => {
    return slots.find((slot) => slot.startTimeUTC === selectedSlotKey) || null;
  }, [selectedSlotKey, slots]);

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

  const adminOnlyNotice = searchParams.get("notice") === "admin-only";

  const visibleUpcomingBookings = useMemo(() => {
    return upcomingBookings.filter((booking) => {
      const status = String(booking.status || "").toLowerCase();
      return status !== "cancelled" && status !== "canceled";
    });
  }, [upcomingBookings]);

  const visiblePreviousBookings = useMemo(() => {
    return pastBookings.filter((booking) => {
      const status = String(booking.status || "").toLowerCase();
      return status !== "cancelled" && status !== "canceled";
    });
  }, [pastBookings]);

  const visibleMyBookings = bookingsTab === "active" ? visibleUpcomingBookings : visiblePreviousBookings;

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
          <Link href="#my-bookings">My bookings</Link>
        </nav>

        <div className="public-page-actions">
          <GoogleAuthControls compact redirectTo={`/book/${slug}`} />
        </div>
      </header>

      <div className="public-wrapper quick-booking-wrapper">
        {adminOnlyNotice ? (
          <section className="public-card public-notice-banner" aria-live="polite">
            <p className="public-step">Notice</p>
            <h2>Admin panel is restricted</h2>
            <p className="page-subtitle">
              You are signed in as a regular user. Continue booking as a user, or switch account for
              admin access.
            </p>
            <div className="button-row">
              <Link className="topbar-switch-link" href="/signup?next=/dashboard&admin=1&mode=signin">
                Switch account
              </Link>
            </div>
          </section>
        ) : null}

        <section id="my-bookings" className="public-card quick-booking-upcoming">
          <h2>My Bookings</h2>

          {!bookingsLoading && !bookingsError ? (
            <div className="public-booking-history-tabs" role="tablist" aria-label="My bookings tabs">
              <button
                type="button"
                className={bookingsTab === "active" ? "view-toggle-btn view-toggle-btn-active" : "view-toggle-btn"}
                onClick={() => setBookingsTab("active")}
                role="tab"
                aria-selected={bookingsTab === "active"}
              >
                Active ({visibleUpcomingBookings.length})
              </button>
              <button
                type="button"
                className={bookingsTab === "previous" ? "view-toggle-btn view-toggle-btn-active" : "view-toggle-btn"}
                onClick={() => setBookingsTab("previous")}
                role="tab"
                aria-selected={bookingsTab === "previous"}
              >
                Previous ({visiblePreviousBookings.length})
              </button>
            </div>
          ) : null}

          {bookingsLoading ? <p className="page-subtitle">Loading your bookings...</p> : null}
          {bookingsError ? <p className="error-text">{bookingsError}</p> : null}

          {!bookingsLoading && !bookingsError && visibleMyBookings.length === 0 ? (
            <p className="page-subtitle">No {bookingsTab} bookings right now.</p>
          ) : null}

          {!bookingsLoading && !bookingsError && visibleMyBookings.length > 0 ? (
            <div className="quick-booking-list">
              {visibleMyBookings.map((booking) => (
                <article key={booking.id} className="quick-booking-item">
                  <p>
                    <strong>{booking.eventTitle}</strong>
                  </p>
                  <p>
                    {DateTime.fromISO(booking.startTime).toLocaleString(DateTime.DATETIME_MED)} - Status:{" "}
                    <span className="booking-status-pill">{booking.status}</span>
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="public-card quick-booking-card">
          {eventType ? (
            <>
              <h2>{eventType.title}</h2>
              <p className="page-subtitle">
                {eventType.description || "Quick intro and requirement discussion."} {eventType.durationMinutes} min
                meeting
              </p>
              <p className="muted-strong">Timezone: {eventType.timezone || "Asia/Kolkata"}</p>
            </>
          ) : (
            <p>Loading event details...</p>
          )}

          {error ? <p className="error-text">{error}</p> : null}

          <form className="form-grid" onSubmit={handleBookingSubmit}>
            <div className="quick-booking-fields-row">
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setSelectedSlotKey("");
                    setDate(e.target.value);
                  }}
                />
                <small>{selectedDateLabel}</small>
              </label>

              <label>
                Time
                <select
                  value={selectedSlotKey}
                  onChange={(e) => setSelectedSlotKey(e.target.value)}
                  required
                  disabled={!slots.length}
                >
                  <option value="">Select a time</option>
                  {slots.map((slot) => (
                    <option key={slot.startTimeUTC} value={slot.startTimeUTC}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!slots.length ? <p className="page-subtitle">No available times on this date.</p> : null}

            {selectedSlot ? (
              <p className="slot-summary">
                Selected time: <strong>{selectedSlot.label}</strong>
              </p>
            ) : null}

            <div className="quick-booking-fields-row">
              <label>
                Name
                <input value={bookerName} onChange={(e) => setBookerName(e.target.value)} required />
              </label>

              <label>
                Email
                <input type="email" value={bookerEmail} disabled readOnly />
              </label>
            </div>

            <button type="submit" disabled={!selectedSlot}>
              Confirm booking
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";

function BookingList({ title, items, onCancel }) {
  return (
    <section className="card">
      <div className="list-card-head">
        <h2>{title}</h2>
        <span className="page-head-pill">{items.length}</span>
      </div>
      {!items.length ? <p className="empty-state-copy">No bookings yet.</p> : null}

      {items.map((booking) => (
        <article key={booking.id} className="booking-row">
          <div className="booking-details">
            <p>
              <strong>{booking.eventTitle}</strong>
            </p>
            <p>
              {DateTime.fromISO(booking.startTime).toLocaleString(
                DateTime.DATETIME_MED
              )}
            </p>
            <p>
              {booking.bookerName} ({booking.bookerEmail})
            </p>
            <p>
              Status: <span className="booking-status-pill">{booking.status}</span>
            </p>
          </div>

          {onCancel && booking.status === "confirmed" ? (
            <button className="danger-btn" onClick={() => onCancel(booking.id)}>
              Cancel Booking
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export default function BookingsPage() {
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    setLoading(true);
    try {
      const [upcomingData, pastData] = await Promise.all([
        api.getBookings("upcoming"),
        api.getBookings("past"),
      ]);

      setUpcoming(upcomingData);
      setPast(pastData);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function cancelBooking(bookingId) {
    const shouldCancel = window.confirm("Cancel this booking?");
    if (!shouldCancel) return;

    try {
      await api.cancelBooking(bookingId);
      await loadBookings();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout>
      <section>
        <div className="page-head">
          <div>
            <h1 className="page-title">Bookings</h1>
            <p className="page-subtitle">
              Track upcoming meetings, review past activity, and manage cancellations.
            </p>
          </div>
          <div className="page-head-actions">
            <span className="page-head-pill">{upcoming.length} upcoming</span>
            <span className="page-head-pill">{past.length} past</span>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {loading ? <p className="page-subtitle">Loading bookings...</p> : null}

        <div className="bookings-grid">
          <BookingList title="Upcoming" items={upcoming} onCancel={cancelBooking} />
          <BookingList title="Past" items={past} />
        </div>
      </section>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) return;

    api
      .getBookingConfirmation(bookingId)
      .then((data) => setBooking(data))
      .catch((err) => setError(err.message));
  }, [bookingId]);

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (!booking) {
    return <p>Loading booking details...</p>;
  }

  return (
    <section className="public-card confirmation-card">
      <h1>You&apos;re scheduled</h1>
      <p>Your booking is confirmed. A calendar invitation can now be shared from your dashboard.</p>

      <p>
        <strong>Event:</strong> {booking.eventTitle}
      </p>
      <p>
        <strong>Name:</strong> {booking.bookerName}
      </p>
      <p>
        <strong>Email:</strong> {booking.bookerEmail}
      </p>
      <p>
        <strong>Time:</strong>{" "}
        {DateTime.fromISO(booking.startTime)
          .setZone(booking.timezone || "Asia/Kolkata")
          .toLocaleString(DateTime.DATETIME_FULL)}
      </p>

      <Link href={`/book/${booking.slug}`}>Book another time</Link>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(8);

  useEffect(() => {
    if (!bookingId) return;

    api
      .getBookingConfirmation(bookingId)
      .then((data) => setBooking(data))
      .catch((err) => setError(err.message));
  }, [bookingId]);

  useEffect(() => {
    if (!booking) return;

    const tickTimer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    const redirectTimer = setTimeout(() => {
      router.replace("/");
    }, 8000);

    return () => {
      clearInterval(tickTimer);
      clearTimeout(redirectTimer);
    };
  }, [booking, router]);

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

      <p className="page-subtitle">Redirecting to home in {secondsLeft}s...</p>

      <Link href={`/book/${booking.slug}`}>Book another time</Link>
      <Link href="/">Go to home now</Link>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import EventForm from "@/components/EventForm";

function toLocal(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export default function EditEvent({ params }) {
  const [initial, setInitial] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) {
          setError("Event not found or admin access only.");
          return;
        }
        const e = j.data.event;
        setInitial({
          title: e.title || "",
          slug: e.slug || "",
          description: e.description || "",
          posterImageUrl: e.posterImageUrl || "",
          venue: e.venue || "",
          mode: e.mode || "ONSITE",
          startAt: toLocal(e.startAt),
          endAt: toLocal(e.endAt),
          registrationOpensAt: toLocal(e.registrationOpensAt),
          registrationClosesAt: toLocal(e.registrationClosesAt),
          feeType: e.feeType || "FREE",
          feeAmount: e.feeAmount ? String(e.feeAmount) : "",
          paymentReceiverName: e.paymentReceiverName || "",
          paymentReceiverContact: e.paymentReceiverContact || "",
          paymentQrImageUrl: e.paymentQrImageUrl || "",
          registrationMode: e.registrationMode || "SITE",
          externalRegistrationUrl: e.externalRegistrationUrl || "",
          driveLink: e.driveLink || "",
          status: e.status || "DRAFT",
        });
      })
      .catch(() => setError("Event not found or admin access only."));
  }, [params.id]);
  if (error) return <p className="error">{error}</p>;
  if (!initial) return <p>Loading...</p>;
  return (
    <div>
      <h1>Edit event</h1>
      <EventForm initial={initial} eventId={params.id} />
    </div>
  );
}

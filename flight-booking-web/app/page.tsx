"use client";

import { useState } from "react";
import type {
  Booking,
  BookingResponse,
  CreateBookingRequest,
  ErrorResponse,
  Passenger,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const FLIGHTS = [
  { id: "fl_8a2b3c4d-5e6f-7a8b-9c0d", label: "TG401  BKK → NRT" },
  { id: "fl_1a2b3c4d-5e6f-7a8b-9c0d", label: "TG615  BKK → LHR" },
];

const EMPTY_PASSENGER: Passenger = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "",
  passportNumber: "",
  passportExpiry: "",
};

export default function BookingPage() {
  const [flightId, setFlightId] = useState(FLIGHTS[0].id);
  const [cabin, setCabin] = useState("economy");
  const [fareClass, setFareClass] = useState("M");
  const [seat, setSeat] = useState("");
  const [passenger, setPassenger] = useState<Passenger>({ ...EMPTY_PASSENGER });
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [result, setResult] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updatePassenger(field: keyof Passenger, value: string) {
    setPassenger((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);

    const body: CreateBookingRequest = {
      flightId,
      cabin,
      fareClass,
      seats: [seat.trim()],
      passengers: [passenger],
      contactEmail,
      contactPhone,
    };

    try {
      setLoadingStep("Creating booking…");
      const res = await fetch(`${API_BASE}/api/v1/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data: ErrorResponse = await res.json();
        setError(`${res.status}: ${data.error}`);
        return;
      }

      const created: BookingResponse = await res.json();
      const pnr = created.data.pnr;

      setLoadingStep(`Fetching PNR ${pnr}…`);
      const pnrRes = await fetch(`${API_BASE}/api/v1/bookings/pnr/${pnr}`);

      if (!pnrRes.ok) {
        const data: ErrorResponse = await pnrRes.json();
        setError(`PNR lookup failed — ${data.error}`);
        return;
      }

      const pnrData: BookingResponse = await pnrRes.json();
      setResult(pnrData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingStep(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-8">
          Flight Booking
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-800 rounded-2xl shadow p-6 space-y-5"
        >
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
              Flight
            </legend>

            <label className="block">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Flight</span>
              <select
                value={flightId}
                onChange={(e) => setFlightId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
              >
                {FLIGHTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Cabin</span>
                <select
                  value={cabin}
                  onChange={(e) => setCabin(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                >
                  <option value="economy">Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </select>
              </label>

              <label className="block w-24">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Fare Class</span>
                <input
                  required
                  maxLength={1}
                  value={fareClass}
                  onChange={(e) => setFareClass(e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>

              <label className="block w-24">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Seat</span>
                <input
                  required
                  placeholder="14A"
                  value={seat}
                  onChange={(e) => setSeat(e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
              Passenger
            </legend>

            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">First Name</span>
                <input
                  required
                  value={passenger.firstName}
                  onChange={(e) => updatePassenger("firstName", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>
              <label className="block flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Last Name</span>
                <input
                  required
                  value={passenger.lastName}
                  onChange={(e) => updatePassenger("lastName", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Date of Birth</span>
                <input
                  required
                  type="date"
                  value={passenger.dateOfBirth}
                  onChange={(e) => updatePassenger("dateOfBirth", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>
              <label className="block w-28">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Nationality</span>
                <input
                  required
                  placeholder="THA"
                  maxLength={3}
                  value={passenger.nationality}
                  onChange={(e) => updatePassenger("nationality", e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Passport Number</span>
                <input
                  required
                  value={passenger.passportNumber}
                  onChange={(e) => updatePassenger("passportNumber", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>
              <label className="block flex-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Passport Expiry</span>
                <input
                  required
                  type="date"
                  value={passenger.passportExpiry}
                  onChange={(e) => updatePassenger("passportExpiry", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
              Contact
            </legend>

            <label className="block">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Email</span>
              <input
                required
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Phone</span>
              <input
                required
                type="tel"
                placeholder="+66812345678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm"
              />
            </label>
          </fieldset>

          <button
            type="submit"
            disabled={loadingStep !== null}
            className="w-full rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-medium py-3 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loadingStep ?? "Book Flight"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Booking failed</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 space-y-2">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Booking created — fetched via PNR {result.pnr}
            </p>
            <dl className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
              <Row label="Booking ID" value={result.bookingId} />
              <Row label="PNR" value={result.pnr} />
              <Row label="Status" value={result.status} />
              <Row label="Flight" value={`${result.flightNumber}  ${result.origin} → ${result.destination}`} />
              <Row label="Seat" value={result.seats.join(", ")} />
              <Row label="Total" value={`${result.totalAmount.toLocaleString()} ${result.currency}`} />
              <Row label="Pay by" value={new Date(result.paymentDeadline).toLocaleString()} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-zinc-500 w-24 shrink-0">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

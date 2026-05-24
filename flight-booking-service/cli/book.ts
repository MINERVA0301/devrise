#!/usr/bin/env bun
/**
 * book.ts — Flight Booking CLI
 *
 * Usage:
 *   bun run cli/book.ts --flight fl_8a2b3c4d-5e6f-7a8b-9c0d --seat 14A
 *   bun run cli/book.ts get --id bk_7f8a9b0c-1d2e-3f4a-5b6c
 *   bun run cli/book.ts pnr --pnr QL3XF7
 */

import { parseArgs } from "util";

const API_BASE = process.env.API_BASE ?? "http://localhost:8080/api/v1";

// ─── Argument parsing ────────────────────────────────────────────────────────
const { positionals, values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    flight:    { type: "string" },
    seat:      { type: "string" },
    cabin:     { type: "string", default: "economy" },
    fareClass: { type: "string", default: "M" },
    firstName: { type: "string", default: "Traveller" },
    lastName:  { type: "string", default: "Guest" },
    dob:       { type: "string", default: "1990-01-01" },
    email:     { type: "string", default: "guest@example.com" },
    phone:     { type: "string", default: "+66800000000" },
    // For get / pnr sub-commands
    id:        { type: "string" },
    pnr:       { type: "string" },
  },
  allowPositionals: true,
});

const subCommand = positionals[0]; // undefined | "get" | "pnr"

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function prettyPrint(label: string, res: Response): Promise<void> {
  const body = await res.json();
  console.log(`\n── ${label} ──────────────────────────────`);
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));
}

// ─── Sub-commands ─────────────────────────────────────────────────────────────

async function createBooking(): Promise<void> {
  if (!values.flight || !values.seat) {
    console.error("Error: --flight and --seat are required to create a booking.");
    console.error("Example: bun run cli/book.ts --flight fl_8a2b3c4d-5e6f-7a8b-9c0d --seat 14A");
    process.exit(1);
  }

  const payload = {
    flightId:   values.flight,
    cabin:      values.cabin,
    fareClass:  values.fareClass,
    seats:      [values.seat],
    passengers: [
      {
        firstName:      values.firstName,
        lastName:       values.lastName,
        dateOfBirth:    values.dob,
        nationality:    "THA",
        passportNumber: "AA0000000",
        passportExpiry: "2035-01-01",
      },
    ],
    contactEmail: values.email,
    contactPhone: values.phone,
  };

  const res = await fetch(`${API_BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await prettyPrint("CREATE BOOKING", res);
}

async function getBookingByID(): Promise<void> {
  if (!values.id) {
    console.error("Error: --id is required for the 'get' sub-command.");
    process.exit(1);
  }
  const res = await fetch(`${API_BASE}/bookings/${values.id}`);
  await prettyPrint("GET BOOKING BY ID", res);
}

async function getBookingByPNR(): Promise<void> {
  if (!values.pnr) {
    console.error("Error: --pnr is required for the 'pnr' sub-command.");
    process.exit(1);
  }
  const res = await fetch(`${API_BASE}/bookings/pnr/${values.pnr}`);
  await prettyPrint("GET BOOKING BY PNR", res);
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────
switch (subCommand) {
  case "get":
    await getBookingByID();
    break;
  case "pnr":
    await getBookingByPNR();
    break;
  default:
    await createBooking();
}


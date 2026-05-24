#!/usr/bin/env bash
# process_bookings.sh
# Reads bookings.psv (pipe-separated), generates a summary report.txt.
#
# Usage: ./scripts/process_bookings.sh [input.psv] [output.txt]
#   Defaults: scripts/bookings.psv  →  scripts/report.txt

set -euo pipefail

INPUT="${1:-$(dirname "$0")/bookings.psv}"
OUTPUT="${2:-$(dirname "$0")/report.txt}"

if [[ ! -f "$INPUT" ]]; then
  echo "Error: input file '$INPUT' not found." >&2
  exit 1
fi

NOW=$(date -u "+%Y-%m-%d %H:%M:%S")
NOW_EPOCH=$(date -u +%s)

# ── Count by status ──────────────────────────────────────────────────────────
COUNT_CONFIRMED=$(awk -F'|' 'NR>1 && $3=="CONFIRMED" {count++} END{print count+0}' "$INPUT")
COUNT_PENDING=$(awk   -F'|' 'NR>1 && $3=="PENDING"   {count++} END{print count+0}' "$INPUT")
COUNT_CANCELLED=$(awk -F'|' 'NR>1 && $3=="CANCELLED" {count++} END{print count+0}' "$INPUT")

# ── Sum revenue from CONFIRMED bookings ──────────────────────────────────────
TOTAL_REVENUE=$(awk -F'|' 'NR>1 && $3=="CONFIRMED" {sum += $4} END{printf "%.2f", sum+0}' "$INPUT")

# ── Currency (from first CONFIRMED row, fallback THB) ────────────────────────
CURRENCY=$(awk -F'|' 'NR>1 && $3=="CONFIRMED" {print $5; exit}' "$INPUT")
CURRENCY="${CURRENCY:-THB}"

# ── Find expired PENDING bookings ────────────────────────────────────────────
EXPIRED_LINES=""
while IFS='|' read -r bookingId pnr status totalAmount currency paymentDeadline; do
  [[ "$status" != "PENDING" ]] && continue

  # Strip potential trailing newline / carriage return
  paymentDeadline="${paymentDeadline%%[[:space:]]*}"

  # Parse ISO-8601 deadline to epoch (macOS date needs -j -f; Linux date uses -d)
  if date --version >/dev/null 2>&1; then
    # GNU date (Linux)
    deadline_epoch=$(date -u -d "$paymentDeadline" +%s 2>/dev/null || echo 0)
  else
    # BSD date (macOS)
    clean="${paymentDeadline//T/ }"
    clean="${clean//Z/}"
    deadline_epoch=$(date -u -j -f "%Y-%m-%d %H:%M:%S" "$clean" +%s 2>/dev/null || echo 0)
  fi

  if [[ "$deadline_epoch" -gt 0 && "$deadline_epoch" -lt "$NOW_EPOCH" ]]; then
    EXPIRED_LINES="${EXPIRED_LINES}  ${bookingId}  ${pnr}  deadline: ${paymentDeadline}\n"
  fi
done < <(awk 'NR>1' "$INPUT")

# ── Write report ─────────────────────────────────────────────────────────────
{
  echo "=== Booking Report (generated: $NOW) ==="
  echo ""
  echo "Status Summary:"
  printf "  %-11s: %s\n" "CONFIRMED"  "$COUNT_CONFIRMED"
  printf "  %-11s: %s\n" "PENDING"    "$COUNT_PENDING"
  printf "  %-11s: %s\n" "CANCELLED"  "$COUNT_CANCELLED"
  echo ""
  echo "Total Revenue (CONFIRMED): $TOTAL_REVENUE $CURRENCY"
  echo ""
  echo "Expired PENDING Bookings (payment overdue):"
  if [[ -n "$EXPIRED_LINES" ]]; then
    printf "%b" "$EXPIRED_LINES"
  else
    echo "  (none)"
  fi
} > "$OUTPUT"

echo "Report written to $OUTPUT"
cat "$OUTPUT"


/**
 * Round-trip tests for date-utils business-timezone helpers.
 * These guard against regressions of the "8am booking shows as 4pm booked"
 * class of bug. Run under multiple TZ values to prove TZ-independence:
 *
 *   TZ=UTC                npx tsx scripts/test-date-utils.ts
 *   TZ=Asia/Kuala_Lumpur  npx tsx scripts/test-date-utils.ts
 *   TZ=Europe/London      npx tsx scripts/test-date-utils.ts
 *   TZ=America/Los_Angeles npx tsx scripts/test-date-utils.ts
 *
 * All four invocations must pass.
 */

import assert from "node:assert/strict"
import { parseDateInBusinessTZ, toBusinessTZParts, formatMYTDateForDisplay } from "../src/lib/date-utils"

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL  ${name}`)
    console.log(`        ${(err as Error).message}`)
    failed++
  }
}

console.log(`Running under TZ=${process.env.TZ ?? "<system>"}\n`)

test("parseDateInBusinessTZ: 8am MYT → 00:00 UTC", () => {
  const d = parseDateInBusinessTZ("2025-01-29T08:00:00")
  assert.equal(d.toISOString(), "2025-01-29T00:00:00.000Z")
})

test("parseDateInBusinessTZ: midnight MYT → 16:00 UTC prev day", () => {
  const d = parseDateInBusinessTZ("2025-01-29T00:00:00")
  assert.equal(d.toISOString(), "2025-01-28T16:00:00.000Z")
})

test("parseDateInBusinessTZ: end-of-day MYT", () => {
  const d = parseDateInBusinessTZ("2025-12-31T23:59:59")
  assert.equal(d.toISOString(), "2025-12-31T15:59:59.000Z")
})

test("toBusinessTZParts: midnight UTC → 8am MYT same day", () => {
  const parts = toBusinessTZParts(new Date("2025-01-29T00:00:00.000Z"))
  assert.deepEqual(parts, { dateStr: "2025-01-29", timeStr: "08:00" })
})

test("toBusinessTZParts: late UK day → next MYT day", () => {
  // 20:00 UTC Jan 28 = 04:00 MYT Jan 29
  const parts = toBusinessTZParts(new Date("2025-01-28T20:00:00.000Z"))
  assert.deepEqual(parts, { dateStr: "2025-01-29", timeStr: "04:00" })
})

test("toBusinessTZParts: year-end rollover", () => {
  // 18:00 UTC Dec 31 = 02:00 MYT Jan 1
  const parts = toBusinessTZParts(new Date("2025-12-31T18:00:00.000Z"))
  assert.deepEqual(parts, { dateStr: "2026-01-01", timeStr: "02:00" })
})

test("round-trip: parse → toBusinessTZParts → reconstruct same instant", () => {
  const original = "2025-06-15T13:45:00"
  const utcInstant = parseDateInBusinessTZ(original)
  const parts = toBusinessTZParts(utcInstant)
  const rebuilt = parseDateInBusinessTZ(`${parts.dateStr}T${parts.timeStr}:00`)
  assert.equal(rebuilt.getTime(), utcInstant.getTime())
})

test("round-trip: every hour of a full day", () => {
  for (let hour = 0; hour < 24; hour++) {
    const hh = String(hour).padStart(2, "0")
    const utc = parseDateInBusinessTZ(`2025-03-15T${hh}:30:00`)
    const parts = toBusinessTZParts(utc)
    assert.equal(parts.dateStr, "2025-03-15", `hour ${hour} dateStr`)
    assert.equal(parts.timeStr, `${hh}:30`, `hour ${hour} timeStr`)
  }
})

test("formatMYTDateForDisplay: includes year by default", () => {
  const out = formatMYTDateForDisplay(new Date("2025-01-28T20:00:00.000Z"))
  assert.equal(out, "Jan 29, 2025")
})

test("formatMYTDateForDisplay: omits year when requested", () => {
  const out = formatMYTDateForDisplay(new Date("2025-01-28T20:00:00.000Z"), { includeYear: false })
  assert.equal(out, "Jan 29")
})

test("appointment booking conflict: 8am stored, 8am candidate match", () => {
  // Simulates the original bug scenario: book 8am, try 8am again.
  const stored = parseDateInBusinessTZ("2025-01-29T08:00:00")          // server side write
  const storedSerialized = stored.toISOString()                         // network round-trip
  const storedFromClient = new Date(storedSerialized)                   // client receives
  const candidate = parseDateInBusinessTZ("2025-01-29T08:00:00")        // user picks 8am
  // Both must represent the same UTC instant for the conflict to be detected.
  assert.equal(storedFromClient.getTime(), candidate.getTime())
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)

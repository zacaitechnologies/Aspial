---
name: business-timezone-dates
description: >-
  Enforces correct Malaysia (Asia/Kuala_Lumpur, UTC+8) date/time handling in this
  Next.js app and prevents React hydration mismatches from dates. Use whenever
  computing "today", highlighting the current day, comparing/formatting dates,
  rendering calendars or schedules, or when a hydration error mentions dates,
  day cells, "today" counts, or server/client text mismatch.
---

# Business Timezone (Malaysia) & Date Hydration

All business dates are interpreted and displayed in **Asia/Kuala_Lumpur
(UTC+8, no DST)**, regardless of server or browser timezone. Mixing machine-local
time with business time causes wrong "today" and React hydration mismatches.

## Use these helpers (`@/lib/date-utils`)

| Helper | Use for |
|--------|---------|
| `getBusinessTodayDateString(reference?)` | "Today" as `YYYY-MM-DD` in MYT — stable across server/client |
| `toBusinessTZParts(date)` | `{ dateStr, timeStr }` wall-clock parts in MYT |
| `parseDateInBusinessTZ(naive)` | Parse `YYYY-MM-DDTHH:mm:ss` as MYT → correct UTC instant for DB |
| `formatLocalDate(date)` | Format a Date's local Y-M-D (only when the Date is already business-local) |
| `parseLocalDateString("YYYY-MM-DD")` | Parse a date string to a noon-local Date (no UTC shift) |

## Hard rules

1. NEVER use `new Date()`, `Date.now()`, or `toLocaleDateString()` to derive
   "today", current day highlighting, or date comparisons inside an SSR'd client
   component. These differ between server (often UTC) and browser (MYT) and break
   hydration.
2. Compute the "today" snapshot on the **server** and pass it to client components
   as a prop, then keep using that string for first render.

```tsx
// Server component / page.tsx
const initialTodayDateString = getBusinessTodayDateString()
return <CalendarClient initialTodayDateString={initialTodayDateString} ... />
```

```tsx
// Client component: render from the server snapshot, sync AFTER mount only
const [todayDateString, setTodayDateString] = useState(initialTodayDateString)
useEffect(() => {
  const sync = () => setTodayDateString(prev => {
    const next = getBusinessTodayDateString()
    return prev === next ? prev : next
  })
  sync()
  const id = window.setInterval(sync, 60_000)
  return () => window.clearInterval(id)
}, [])
```

3. "Is this date today?" compares formatted strings, not Date identity:

```ts
isToday = formatDate(date) === getBusinessTodayDateString()
```

4. Build month/week ranges from the business-today string, not `new Date()`:

```ts
const [year, month] = initialTodayDateString.split("-").map(Number)
const monthStart = new Date(year, month - 1, 1)
const monthEnd = new Date(year, month, 0)
```

5. Persisting appointment/booking datetimes → always `parseDateInBusinessTZ(naive)`
   so the stored UTC instant matches the intended MYT wall-clock time.

## Hydration checklist

- [ ] No `new Date()` / `Date.now()` / locale formatting in first client render.
- [ ] "Today" comes from a server-provided `initialTodayDateString` prop.
- [ ] Day comparisons use `getBusinessTodayDateString()` (business TZ), not local.
- [ ] Any live "now" updates happen inside `useEffect` (post-mount), never during render.

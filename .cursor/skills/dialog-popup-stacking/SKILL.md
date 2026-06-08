---
name: dialog-popup-stacking
description: >-
  Ensures dialogs, confirmation popups, selects, popovers, and tooltips stack in
  the correct z-index order in this Next.js + shadcn/Radix app. Use whenever
  adding or debugging a Dialog/AlertDialog/Popover/Select/Tooltip, opening a
  popup from inside another popup, or when a confirmation/overwrite/append dialog
  appears BEHIND another dialog or its overlay.
---

# Dialog & Popup Stacking

Radix portals every overlay to `document.body`, so visual order is decided by
`z-index`, NOT JSX nesting. A popup opened from inside another popup will render
behind it unless its `z-index` is explicitly raised.

## Z-index tiers used in this repo

| Tier | Used by |
|------|---------|
| `z-50` | Base `DialogContent`/overlay, `SelectContent`, `PopoverContent`, `Tooltip` (`@/components/ui/*`) |
| `z-[60]` | A top-level feature dialog that must sit above base dialogs (e.g. `AppointmentBookingDialog` content + its in-dialog popovers) |
| `z-[65]` | `nested` dialog overlay (from `DialogContent`'s `nested` prop) |
| `z-[70]` | `nested` dialog content; selects rendered inside a `z-[60]` dialog |
| `z-[80]` | Confirmation/overwrite/append dialog opened from INSIDE a `z-[60]`/`z-[70]` dialog |

The base `DialogContent` (`src/components/ui/dialog.tsx`) already supports a
`nested` prop: overlay → `z-[65]`, content → `z-[70]`.

## Rules

1. A popup opened from inside another popup MUST have a higher `z-index` than its
   parent's content AND a backdrop above the parent's content.
2. Prefer the existing `nested` prop on `DialogContent` for one level of nesting.
3. If the parent is already elevated (e.g. `z-[60]`), pass `nested` AND an
   explicit higher class so content beats `z-[70]`:

```tsx
// Confirmation dialog launched from within a z-[60] booking dialog
<DialogContent nested className="z-[80] sm:max-w-md">
```

4. Selects/popovers inside an elevated dialog must also be raised
   (e.g. `SelectContent className="z-[70]"`, `PopoverContent className="z-[60]"`)
   so their dropdown is not clipped behind the dialog.
5. Keep tiers consistent with the table above. Do not invent new ad-hoc values;
   reuse `60 / 65 / 70 / 80`.

## Quick checklist when adding a popup

- [ ] Is this popup launched from inside another open dialog? If yes, raise its z-index.
- [ ] Parent at base `z-50`? → use `nested`.
- [ ] Parent at `z-[60]`/`z-[70]`? → use `nested className="z-[80] ..."`.
- [ ] Any `Select`/`Popover` inside the dialog raised so its menu shows on top?
- [ ] Verified the backdrop dims the parent (overlay tier above parent content)?

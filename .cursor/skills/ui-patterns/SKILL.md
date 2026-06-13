---
name: ui-patterns
description: >-
  Enforces three recurring UI patterns for this Aspial CRM app: (1) search/filter
  bars, (2) animated sliding-indicator tabs, and (3) card list hover effects with
  tooltips. Use this skill every time you build a filter bar, a tabbed view, or a
  list/grid of hoverable items. Ensures pixel-identical design consistency across
  all pages without repeating the spec.
---

# Aspial UI Patterns

Three patterns that **must always look identical** across every page. Apply them automatically — no need for the user to describe the design each time.

## 1. Search / Filter Bar

**Structure**: search input (full-width, left icon) + optional `Select` dropdowns + optional sort buttons.

```tsx
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

{/* Wrapper */}
<div className="space-y-4 mb-6">
  <div className="flex items-center gap-4">

    {/* Search input */}
    <div className="flex-1 relative">
      <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 bg-card border-2 border-accent"
      />
    </div>

    {/* Filter Select (repeat as needed) */}
    <Select value={filter} onValueChange={setFilter}>
      <SelectTrigger className="min-w-[9.5rem] w-auto max-w-full bg-card border-2 border-accent">
        <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <SomeIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Filter by…" />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        {/* … */}
      </SelectContent>
    </Select>

  </div>

  {/* Sort buttons row (optional) */}
  <div className="flex items-center gap-2">
    <Label className="text-sm font-medium text-foreground">Sort by:</Label>
    {sortOptions.map((opt) => (
      <Button
        key={opt.value}
        variant="outline"
        size="sm"
        onClick={() => handleSort(opt.value)}
        className={`border-2 border-border ${sortBy === opt.value ? "bg-accent text-foreground" : "bg-card"}`}
      >
        {opt.label}
        {sortBy === opt.value && (
          sortDir === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
        )}
      </Button>
    ))}
  </div>
</div>
```

**Token rules** (never use inline `style={{ borderColor/color }}`):
| Visual | Token class |
|--------|-------------|
| Input/select background | `bg-card` |
| Input/select border | `border-accent` (`--accent: #BDC4A5`) |
| Search/filter icon colour | `text-muted-foreground` (`--muted-foreground: #898D74`) |
| Active sort button | `bg-accent text-foreground` |
| Inactive sort button | `bg-card` |

### Overflow prevention (required)

Filter `SelectTrigger`s with a prefix icon **must not** use fixed `w-[Nrem]` — icon + label + chevron will overflow. Use flexible sizing instead:

| Rule | Class / pattern |
|------|-----------------|
| Bar wrapper | `flex flex-wrap items-center gap-2` — wraps on narrow screens |
| Trigger width | `min-w-[9.5rem] w-auto max-w-full` (raise `min-w-*` to fit the **longest** `SelectItem` label) |
| Icon + value layout | Wrap in `<span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">` |
| Prefix icon | `shrink-0` — never let the icon compress |
| Value text | `SelectValue` inside the span; trigger's built-in `line-clamp-1` truncates if still tight |

**Compact filter row** (dashboard-style, `h-8 text-xs`):

```tsx
<SelectTrigger className="h-8 min-w-[9.5rem] w-auto max-w-full text-xs bg-card border-2 border-accent">
  <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
    <SomeIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
    <SelectValue />
  </span>
</SelectTrigger>
```

**Never** put the prefix icon as a direct sibling of `SelectValue` without the inner `span` wrapper — the chevron needs room and the value must be allowed to shrink (`min-w-0`).

---

## 2. Tabs with Animated Sliding Indicator

Always requires:
- A controlled `activeTab` state
- A `relative` wrapper div around `TabsList`
- An absolutely positioned `div` that slides as the active tab changes

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const [activeTab, setActiveTab] = useState("tab1")
const TABS = [
  { value: "tab1", label: "Tab One", icon: Icon1 },
  { value: "tab2", label: "Tab Two", icon: Icon2 },
  // add more; update grid-cols-N below
]
const tabCount = TABS.length

{/* Wrapper keeps indicator inside the list border */}
<Tabs defaultValue="tab1" className="w-full" onValueChange={setActiveTab}>
  <div className="relative">
    <TabsList
      className={`grid w-full grid-cols-${tabCount} bg-transparent border-primary border transition-all duration-300 ease-in-out`}
    >
      {TABS.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          className="flex items-center gap-2 transition-all duration-300 ease-in-out relative z-10 data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground"
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>

    {/* Sliding pill — position computed from tab index */}
    <div
      className="absolute top-1 h-[calc(100%-8px)] bg-primary transition-all duration-300 ease-in-out rounded-md z-0"
      style={{
        left: `calc(${TABS.findIndex(t => t.value === activeTab)} * (100% / ${tabCount}) + 4px)`,
        width: `calc(100% / ${tabCount} - 8px)`,
      }}
    />
  </div>

  {TABS.map((tab) => (
    <TabsContent key={tab.value} value={tab.value}>
      {/* content */}
    </TabsContent>
  ))}
</Tabs>
```

**For exactly 2 tabs** (simplified left/width without math):
```tsx
<div
  className={`absolute top-1 h-[calc(100%-8px)] bg-primary transition-all duration-300 ease-in-out rounded-md z-0 ${
    activeTab === "tab1" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
  }`}
/>
```

**Key rules**:
- `TabsList`: `bg-transparent border-primary border` — no default shadcn background
- `TabsTrigger` active state: `data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground` — text turns `primary-foreground` (cream) over the dark pill
- Sliding pill: `bg-primary` — **never** use `style={{ backgroundColor: "#202F21" }}`; that hex is `--primary`
- Always wrap `TabsList` + pill in a single `<div className="relative">`

---

## 3. Card List — Hover Effect + Tooltip

### Hover effect

The shadcn `<Card>` component already includes the `.card` class (see `src/components/ui/card.tsx`). **Do not** add duplicate hover classes on list cards.

```tsx
<Card className="gap-0 border-l-4 py-0 flex flex-col h-full overflow-hidden">
  {/* … */}
</Card>
```

The `.card` class in `globals.css` provides:
- `box-shadow` + `border-color` transition on hover (no `translateY` — transform blurs text)
- Soft gradient sheen via `::after` **behind** content (`z-index: 0`, children at `z-index: 1`)
- Outer glow via `::before`
- Reduced-motion safe

### Hover blur prevention (required)

Text-heavy list cards go blurry when hover stacks too many GPU layers or paints overlays on top of content. **Never** do these on cards that contain readable text:

| Avoid | Why | Use instead |
|-------|-----|-------------|
| `transition-all` on `<Card>` | Re-animates every property on micro-hover changes | Rely on `.card`'s built-in `box-shadow` + `border-color` transitions only |
| `hover:shadow-md` / `hover:translate-*` on same card | Duplicates or fights `.card` hover; transform blurs subpixel text | Remove — `.card` already handles shadow |
| `will-change: transform` at rest | Keeps a compositor layer active → persistent fuzzy text | Only `box-shadow` on `:hover` (handled in globals.css) |
| `::after` sheen at `z-index: 1` | Semi-transparent overlay paints **over** text | `z-index: 0` on `::after`, `.card > * { z-index: 1 }` |
| `translateY` lift on text cards | GPU-composited shift blurs labels during hover | Shadow + border change only |

**Correct list-card pattern** (dashboard tasks, clients, projects, etc.):

```tsx
{/* ✅ Let .card handle hover — no transition-all, no extra hover:shadow */}
<Card className="gap-0 border-l-4 py-0">
  <CardContent className="space-y-3 py-4">{/* … */}</CardContent>
</Card>

{/* ❌ Wrong — causes blurry / jittery hover */}
<Card className="transition-all hover:shadow-md hover:border-primary/40">…</Card>
```

### Tooltip

Use `DashboardTooltip` / `DashboardTooltipProvider` from `@/app/(main)/dashboard/components/dashboard-tooltip`. Wrap the entire list in the provider and each item trigger in the tooltip.

```tsx
import {
  DashboardTooltip,
  DashboardTooltipProvider,
} from "@/app/(main)/dashboard/components/dashboard-tooltip"

<DashboardTooltipProvider delayDuration={300}>
  {items.map((item) => (
    <DashboardTooltip
      key={item.id}
      side="top"
      align="start"
      content={
        <div className="space-y-1">
          <p className="font-semibold">{item.title}</p>
          <p className="text-muted-foreground">{item.subtitle}</p>
          {/* add relevant detail rows */}
        </div>
      }
    >
      {/* The trigger must be a single element */}
      <Card className="card bg-card border-2 border-border flex flex-col h-full overflow-hidden cursor-pointer">
        {/* … */}
      </Card>
    </DashboardTooltip>
  ))}
</DashboardTooltipProvider>
```

**Tooltip content classes** (already baked into `DashboardTooltip`; do NOT duplicate):
```
cal-event-tooltip bg-card text-foreground
animate-in fade-in-0 zoom-in-95
data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
data-[side=bottom]:slide-in-from-top-2
data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2
data-[side=top]:slide-in-from-bottom-2
z-50 w-fit max-w-[16rem] rounded-md border border-border px-3 py-2.5 text-xs text-balance shadow-md
```

If you need a tooltip in a location where `DashboardTooltip` is unavailable, recreate the same classes from `@radix-ui/react-tooltip` directly using the class strings above.

---

## Quick checklist before shipping any filter/tab/list UI

- [ ] Search input has `pl-10 bg-card border-2 border-accent` and a `Search` icon at `left-3`
- [ ] Filter selects have `bg-card border-2 border-accent` and an icon prefix with `text-muted-foreground`
- [ ] Filter selects use `min-w-* w-auto max-w-full` (not fixed `w-[Nrem]`) with icon+value wrapped in `flex min-w-0 flex-1 overflow-hidden`
- [ ] No hardcoded hex/rgb colours anywhere (`style={{ borderColor/color/backgroundColor }}` → replace with token class)
- [ ] Tabs have `bg-transparent border-primary border` on `TabsList` and a sliding `bg-primary` pill
- [ ] Active `TabsTrigger` uses `data-[state=active]:text-primary-foreground` not `text-white`
- [ ] Cards in lists rely on built-in `.card` hover — no `transition-all` or duplicate `hover:shadow-*` / `hover:translate-*`
- [ ] Card text stays sharp: no transform on hover, sheen stays behind content
- [ ] Lists are wrapped in `DashboardTooltipProvider` with per-item `DashboardTooltip`

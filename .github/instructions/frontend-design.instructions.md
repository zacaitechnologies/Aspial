---
description: "Use when building or restyling UI components, pages, dashboards, or layouts. Applies frontend design skill and maps creative direction to project theme tokens."
name: "Frontend Design Skill Bridge"
applyTo: "src/**/*.tsx,src/**/*.css"
---

# Frontend design (Anthropic skill)

When building or restyling UI (components, pages, dashboards, layouts):

1. **Load the skill** at `.agents/skills/frontend-design/SKILL.md` (or `~/.agents/skills/frontend-design/SKILL.md` if missing locally).
2. **Follow its design-thinking flow**: purpose, bold aesthetic direction, typography, motion, spatial composition, and visual detail; avoid generic "AI slop" patterns.
3. **Respect this repo's design system** (see `best-practice.instructions.md`): use theme tokens (`bg-background`, `text-foreground`, `border-border`, etc.), not hardcoded hex/rgb. Map creative direction to semantic Tailwind/shadcn classes and CSS variables in global theme when new colors are needed.
4. **Stack**: Next.js App Router, shadcn/ui, Tailwind; client components UI-only; responsive (mobile, tablet, desktop).

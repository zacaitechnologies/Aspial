---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Project Consistency (read first)

This skill operates inside an existing codebase. Before designing anything new, study what already exists and stay consistent with it. A polished design that clashes with the rest of the app is a regression, not an upgrade.

**Required discovery steps before writing UI code:**

1. **Survey existing pages and components.** Look at sibling pages under `src/app/**` and shared components under `src/components/**`. Identify the recurring page shell, header pattern, card style, table style, dialog/form style, badge style, empty-state style, and spacing rhythm.
2. **Read the project design rules.** Honor `.cursor/rules/best-practice.mdc` and any other rule files in `.cursor/rules/`. Use theme tokens (`bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-muted-foreground`, `bg-primary`, `bg-accent`, sidebar/chart tokens, etc.) and CSS variables from global styles. Do NOT hardcode colors.
3. **Reuse before recreating.** If a similar surface already exists (e.g. a stat card, filter bar, data table, status badge, dialog footer pattern), reuse the same component or replicate its structure and classNames exactly. Only create a new variant when no existing pattern fits, and place new shared pieces under `src/components/**` so the rest of the app can adopt them.
4. **Match existing primitives.** This project uses shadcn/ui + Tailwind. Use the same primitives the rest of the codebase uses (`Button`, `Card`, `Dialog`, `Select`, `Popover`, `Badge`, `Avatar`, etc.) and the same variants/sizes already in use. Do not introduce a different UI library or competing primitives.
5. **Match layout conventions.** Page headers, breadcrumbs, tab bars, container widths, gutter spacing, grid breakpoints (`md:`, `lg:`, `xl:`), and responsive stacking should mirror existing pages. New pages should feel like they were always part of the app.
6. **Match interaction patterns.** Loading states, empty states, error toasts, confirmation dialogs, expand/collapse chevrons, and form validation should follow the patterns already used in the app.

**Consistency overrides novelty.** When project conventions conflict with the "bold aesthetic" guidance below, project conventions win. The aesthetic guidance applies within the established design system, not against it. Propose system-wide changes explicitly before deviating.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

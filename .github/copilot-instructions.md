# Copilot Workspace Instructions

Use these workspace instruction files as the primary source of coding rules in this repository:

- `.github/instructions/best-practice.instructions.md`
- `.github/instructions/action-best-action.instructions.md`
- `.github/instructions/frontend-design.instructions.md`
- `.github/instructions/postgres-best-practices.instructions.md`

## How to apply them

- Always follow `best-practice.instructions.md` as the baseline for architecture, typing, validation, and UI token usage.
- Apply `action-best-action.instructions.md` for Server Actions, route handlers, and server-only logic.
- Apply `frontend-design.instructions.md` for UI design or visual refactors.
- Apply `postgres-best-practices.instructions.md` for SQL, Prisma migrations/schema, Supabase policies, and DB performance work.

## Conflict resolution

- Prefer security over convenience.
- Prefer server-first decisions over client-side workarounds.
- Prefer strict typing and validation over implicit assumptions.
- Prefer database-level filtering/indexing over in-memory filtering.

## Quality gate

Before finalizing changes:

- Ensure no new lint/type errors are introduced.
- Keep changes minimal and aligned with existing project patterns.
- Avoid exposing secrets or internal-only fields.

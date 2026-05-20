---
description: "Use when writing SQL, Prisma migrations, schema changes, indexes, RLS policies, or performance optimizations for Postgres in this repository."
name: "Postgres Best Practices Skill Bridge"
applyTo: "prisma/**,supabase/**,**/*.sql"
---

# Postgres best practices (Supabase skill)

When working on Postgres schema, migrations, raw SQL, indexes, RLS, connection pooling, or query performance in this repo:

1. **Load the skill** at `.agents/skills/supabase-postgres-best-practices/SKILL.md` (or `~/.agents/skills/supabase-postgres-best-practices/SKILL.md` if missing locally).
2. **Read relevant references** under `references/` for the task (e.g. `query-missing-indexes.md`, `security-rls-performance.md`, `schema-foreign-key-indexes.md`). Use `_sections.md` to pick rules by priority.
3. **Apply rules by impact**: query performance and connection management first, then security/RLS, then schema design.
4. **Align with this stack**: Prisma for app queries, Supabase for auth/RLS/storage; push filters and indexes to the database; document index recommendations in migration comments when schema changes are needed.

Do not skip EXPLAIN/analysis guidance from the skill when reviewing slow queries or new indexes.

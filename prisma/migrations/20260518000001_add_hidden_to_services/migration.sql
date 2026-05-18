-- Migration: add hidden flag to Services
-- Lets admins retire a service from pickers/lists across the app without
-- deleting it. Historical quotations and delivery orders that already
-- reference the service still render correctly because they read snapshot
-- fields from the join rows.

ALTER TABLE "Services"
  ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "Services_hidden_idx" ON "Services" ("hidden");

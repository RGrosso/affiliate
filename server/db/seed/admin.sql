-- Dev only: creates an "admin" user with no password the first time the app runs.
-- The first login sends this user to /setup to choose a password.
-- Runs on every `pnpm dev` start, so it must stay idempotent.
INSERT INTO "users" ("username", "password", "role", "state")
SELECT 'admin', NULL, 'admin', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM "users" WHERE "role" = 'admin'
);

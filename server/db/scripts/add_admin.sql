INSERT INTO "users" ("id", "username", "password", "role", "created_at")
SELECT 
  gen_random_uuid(), 
  'admin', 
  '', -- Add hashed password here
  'admin', 
  now()
WHERE NOT EXISTS (
    SELECT 1 FROM "users" WHERE "username" = 'admin'
);
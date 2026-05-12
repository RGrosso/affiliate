INSERT INTO "users" ("id", "username", "password", "role", "created_at")
SELECT 
  gen_random_uuid(), 
  'admin', 
  'scrypt:4096:8:1:3806354894326071:a846f7f6f16d123456789', -- hash for 'admin123'
  'admin', 
  now()
WHERE NOT EXISTS (
    SELECT 1 FROM "users" WHERE "username" = 'admin'
);
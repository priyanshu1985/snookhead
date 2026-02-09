
-- 1. Grant usage on schema
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO service_role;

-- 2. Grant access to ALL tables (Games, Tables, Menus, Users, Reservation, Orders, etc.)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. Grant access to ALL sequences (crucial for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Ensure future tables are also covered
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- 5. Force specific grants (just to be safe) for known tables
GRANT ALL ON games TO service_role;
GRANT ALL ON tables TO service_role;
GRANT ALL ON menuitems TO service_role;
GRANT ALL ON users TO service_role;

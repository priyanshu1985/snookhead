-- Performance Indexes Migration
-- This script adds missing indexes to heavy tables to speed up dashboard calculations.

-- 1. Bills Table Indexes
-- We query bills heavily by stationid, createdAt (date ranges) and status.
CREATE INDEX IF NOT EXISTS idx_bills_stationid ON public.bills (stationid);
CREATE INDEX IF NOT EXISTS idx_bills_createdat ON public.bills (createdAt);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills (status);

-- 2. Active Tables Indexes
-- We query by stationid, status, and starttime.
CREATE INDEX IF NOT EXISTS idx_activetables_stationid ON public.activetables (stationid);
CREATE INDEX IF NOT EXISTS idx_activetables_status ON public.activetables (status);
CREATE INDEX IF NOT EXISTS idx_activetables_starttime ON public.activetables (starttime);
CREATE INDEX IF NOT EXISTS idx_activetables_gameid ON public.activetables (gameid);

-- 3. Customers (Members) Indexes
-- We query heavily by stationid and created_at.
CREATE INDEX IF NOT EXISTS idx_customers_stationid ON public.customers (stationid);
CREATE INDEX IF NOT EXISTS idx_customers_createdat ON public.customers (created_at);

-- 4. Wallets Indexes
-- We query by station_id and balance for active/inactive/credit member stats.
CREATE INDEX IF NOT EXISTS idx_wallets_station_id ON public.wallets (station_id);
CREATE INDEX IF NOT EXISTS idx_wallets_balance ON public.wallets (balance);

-- 5. Orders Indexes
-- Queried by stationid and sessionid.
CREATE INDEX IF NOT EXISTS idx_orders_stationid ON public.orders (station_id);
CREATE INDEX IF NOT EXISTS idx_orders_sessionid ON public.orders (session_id);

-- 6. Shifts Indexes
-- Queried by user_id and check_in_time for dashboard employee stats.
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON public.shifts (user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_check_in_time ON public.shifts (check_in_time);

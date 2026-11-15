-- Add tenant_id to meter_readings for robust unique tracking per occupant
-- This allows multiple "Room 1"s on different floors/sides to exist simultaneously

-- 1. Add the column
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Backfill existing readings by room number (matching to current active tenant)
UPDATE meter_readings m
SET tenant_id = t.id
FROM tenants t
WHERE m.room_no = t.room_no AND t.is_active = true
AND m.tenant_id IS NULL;

-- 3. Update the Unique Constraint
-- Note: You might need to check the actual constraint name in your DB
-- Usually it is "meter_readings_room_no_billing_month_key"
ALTER TABLE meter_readings DROP CONSTRAINT IF EXISTS meter_readings_room_no_billing_month_key;

-- 4. Set tenant_id to NOT NULL (once backfilled)
-- If some readings don't have a tenant (historical), we might need to handle them differently
-- For now, let's allow NULL if we aren't sure, but enforce unique for new ones
ALTER TABLE meter_readings ADD CONSTRAINT meter_readings_tenant_id_billing_month_key UNIQUE(tenant_id, billing_month);

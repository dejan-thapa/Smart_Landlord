-- Enable Supabase Realtime for all core tables
-- This allows the client to subscribe to live changes on these tables
ALTER PUBLICATION supabase_realtime ADD TABLE tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE utility_bills;
ALTER PUBLICATION supabase_realtime ADD TABLE meter_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

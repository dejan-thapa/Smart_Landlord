-- Add unique constraint on billing_month for utility_bills (needed for upsert)
ALTER TABLE utility_bills ADD CONSTRAINT utility_bills_billing_month_key UNIQUE (billing_month);

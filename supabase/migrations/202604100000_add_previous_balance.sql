-- Add previous_balance column to invoices table to track carried-over arrears and manual adjustments
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS previous_balance NUMERIC DEFAULT 0;

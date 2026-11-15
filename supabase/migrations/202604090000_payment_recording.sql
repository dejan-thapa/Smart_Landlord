-- Add payment recording columns to invoices table
-- Tracks when, how, and any notes about a payment being received

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'esewa', 'bank_transfer', 'cheque', 'other'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_notes TEXT;

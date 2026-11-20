-- Track how much of each bill has actually been received (supports partial payments).
-- payment_status stays 'unpaid' | 'paid'; a bill is "partial" when unpaid AND amount_paid > 0.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- Backfill: bills already marked paid were paid in full.
UPDATE invoices SET amount_paid = total_due WHERE payment_status = 'paid' AND COALESCE(amount_paid, 0) = 0;

-- Add tracking for automated email dispatch
-- This allows us to see who has received their bill and avoid sending duplicates

-- 1. Add tracking columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_count INTEGER DEFAULT 0;

-- 2. Optional: Add a tracking column to tenants to highlight missing emails in Settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

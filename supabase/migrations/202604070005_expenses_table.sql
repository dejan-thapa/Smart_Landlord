-- Create Expenses Table for House Rent tracking
-- This allows tracking both business and personal costs

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN ('Loan Fee', 'Vegetables', 'Gas', 'Rice', 'WiFi (Home)', 'WiFi (Bhada)', 'Other')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster monthly filtering
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

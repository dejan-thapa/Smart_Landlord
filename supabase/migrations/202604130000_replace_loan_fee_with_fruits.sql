-- Replace 'Loan Fee' with 'Fruits' in expenses category check constraint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
UPDATE expenses SET category = 'Fruits' WHERE category = 'Loan Fee';
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('Fruits', 'Vegetables', 'Gas', 'Rice', 'WiFi (Home)', 'WiFi (Bhada)', 'Other', 'Loan Fee'));

-- Add period_end and billing_period columns to billing_transactions
ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'yearly';

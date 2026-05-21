-- ============================================================
-- DiamondBett Admin — DB Migration
-- Supabase Dashboard > SQL Editor မှာ ဒါကို Run ပါ
-- ============================================================

-- 1. transactions: admin tracking columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS processed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS processed_by    text,
  ADD COLUMN IF NOT EXISTS original_amount numeric;

-- 2. commissions: transaction_id link (JS မှာ insert လုပ်ဖို့ လိုတဲ့ column)
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS transaction_id uuid;

-- 3. users: login tracking + lifetime stats
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at   timestamptz,
  ADD COLUMN IF NOT EXISTS total_deposited numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_withdrawn numeric DEFAULT 0;

-- 4. site_settings: maintenance + announcement + deposit limits
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS site_announcement    text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS min_deposit          numeric DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_daily_withdrawal numeric DEFAULT 500000;

-- 5. bonus_codes: remove duplicate count column (current_uses ကိုသာ သုံးမည်)
ALTER TABLE bonus_codes DROP COLUMN IF EXISTS used_count;

-- 6. user_bonus_claims: track how much turnover was added
ALTER TABLE user_bonus_claims
  ADD COLUMN IF NOT EXISTS turnover_added numeric DEFAULT 0;

-- 7. payment_methods: limits + ordering
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS min_amount    numeric DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_amount    numeric DEFAULT 5000000,
  ADD COLUMN IF NOT EXISTS display_order int     DEFAULT 0;

-- ============================================================
-- Done! Refresh Supabase schema cache after running.
-- ============================================================

-- ============================================================
-- DiamondBett Admin — DB Migration  (v2 — RLS Fix included)
-- Supabase Dashboard > SQL Editor မှာ ဒါကို Run ပါ
-- Schema Cache refresh: Settings > API > Reload Schema
-- ============================================================

-- ============================================================
-- STEP 1 — Column additions (ADD COLUMN IF NOT EXISTS = safe)
-- ============================================================

-- 1a. transactions: admin tracking columns
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS processed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS processed_by     text,
  ADD COLUMN IF NOT EXISTS original_amount  numeric;

-- 1b. commissions: transaction_id link
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS transaction_id   uuid;

-- 1c. users: login tracking + lifetime stats
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at    timestamptz,
  ADD COLUMN IF NOT EXISTS total_deposited  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_withdrawn  numeric DEFAULT 0;

-- 1d. site_settings: maintenance + announcement + deposit limits
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS site_announcement    text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS min_deposit          numeric DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_daily_withdrawal numeric DEFAULT 500000;

-- 1e. bonus_codes: remove duplicate count column
ALTER TABLE bonus_codes DROP COLUMN IF EXISTS used_count;

-- 1f. user_bonus_claims: turnover tracking
ALTER TABLE user_bonus_claims
  ADD COLUMN IF NOT EXISTS turnover_added  numeric DEFAULT 0;

-- 1g. payment_methods: limits + ordering
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS min_amount      numeric DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_amount      numeric DEFAULT 5000000,
  ADD COLUMN IF NOT EXISTS display_order   int     DEFAULT 0;

-- ============================================================
-- STEP 2 — RLS (Row Level Security) Fix
-- ★ ဒါမပါရင် Commission insert ၊ Transaction update တွေ FAIL ဖြစ်မည် ★
-- ============================================================

-- 2a. commissions — anon key နဲ့ insert/update ခွင့်ပြု
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_commissions" ON commissions;
CREATE POLICY "admin_panel_all_commissions"
  ON commissions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2b. transactions — processed_at / processed_by / original_amount update ခွင့်ပြု
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_transactions" ON transactions;
CREATE POLICY "admin_panel_all_transactions"
  ON transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2c. users — balance / total_deposited / total_withdrawn update ခွင့်ပြု
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_users" ON users;
CREATE POLICY "admin_panel_all_users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2d. site_settings — maintenance_mode / announcement save ခွင့်ပြု
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_settings" ON site_settings;
CREATE POLICY "admin_panel_all_settings"
  ON site_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2e. agents / referrals (ရှိလျှင်)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "admin_panel_all_agents" ON agents;
    CREATE POLICY "admin_panel_all_agents" ON agents FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
    ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "admin_panel_all_referrals" ON referrals;
    CREATE POLICY "admin_panel_all_referrals" ON referrals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- STEP 3 — total_deposited / total_withdrawn ပြန်တွက်ချက် (optional)
-- မပြေးလဲ ရသည် — ဒါဆို existing user တွေမှာ 0 ပြနေမည်
-- ============================================================
UPDATE users u SET
  total_deposited = COALESCE((
    SELECT SUM(amount) FROM transactions t
    WHERE t.user_id = u.id AND t.type = 'deposit' AND t.status = 'approved'
  ), 0),
  total_withdrawn = COALESCE((
    SELECT SUM(amount) FROM transactions t
    WHERE t.user_id = u.id AND t.type = 'withdrawal' AND t.status = 'approved'
  ), 0);

-- ============================================================
-- Done!
-- Run ပြီးရင်: Supabase > Settings > API > "Reload Schema" နှိပ်ပါ
-- ============================================================

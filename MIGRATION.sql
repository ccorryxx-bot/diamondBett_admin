-- ============================================================
--  DiamondBett Admin — DB Migration  v3
--  Supabase Dashboard > SQL Editor မှာ Run ပါ
-- ============================================================

-- ── STEP 1: existing columns (safe ADD IF NOT EXISTS) ──────

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS processed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS processed_by     text,
  ADD COLUMN IF NOT EXISTS original_amount  numeric;

ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS transaction_id   uuid;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at    timestamptz,
  ADD COLUMN IF NOT EXISTS total_deposited  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_withdrawn  numeric DEFAULT 0;

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS site_announcement    text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS min_deposit          numeric DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_daily_withdrawal numeric DEFAULT 500000;

ALTER TABLE user_bonus_claims
  ADD COLUMN IF NOT EXISTS turnover_added  numeric DEFAULT 0;

ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS min_amount      numeric DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS max_amount      numeric DEFAULT 5000000,
  ADD COLUMN IF NOT EXISTS display_order   int     DEFAULT 0;

-- ── STEP 2: game_cards — provider_url (NEW in v3) ──────────
ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS provider_url TEXT DEFAULT '';

-- ── STEP 3: banners table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          BIGSERIAL PRIMARY KEY,
  image_url   TEXT NOT NULL,
  title       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 4: wheel_config extra columns ────────────────────
ALTER TABLE wheel_config
  ADD COLUMN IF NOT EXISTS weight              INTEGER DEFAULT 10;
ALTER TABLE wheel_config
  ADD COLUMN IF NOT EXISTS turnover_multiplier NUMERIC DEFAULT 0;

-- ── STEP 5: affiliate_config extra columns ─────────────────
ALTER TABLE affiliate_config
  ADD COLUMN IF NOT EXISTS value       NUMERIC DEFAULT 0;
ALTER TABLE affiliate_config
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT true;
ALTER TABLE affiliate_config
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- ── STEP 6: RLS policies ───────────────────────────────────
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_commissions" ON commissions;
CREATE POLICY "admin_panel_all_commissions" ON commissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_transactions" ON transactions;
CREATE POLICY "admin_panel_all_transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_users" ON users;
CREATE POLICY "admin_panel_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_settings" ON site_settings;
CREATE POLICY "admin_panel_all_settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE game_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_game_cards" ON game_cards;
CREATE POLICY "admin_panel_all_game_cards" ON game_cards FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_panel_all_banners" ON banners;
CREATE POLICY "admin_panel_all_banners" ON banners FOR ALL USING (true) WITH CHECK (true);

-- ── STEP 7: Storage buckets ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('banners', 'banners', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('game-cards', 'game-cards', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read banners"    ON storage.objects;
DROP POLICY IF EXISTS "Admin upload banners"   ON storage.objects;
DROP POLICY IF EXISTS "Public read game-cards" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload game-cards" ON storage.objects;

CREATE POLICY "Public read banners"
  ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admin upload banners"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners');
CREATE POLICY "Public read game-cards"
  ON storage.objects FOR SELECT USING (bucket_id = 'game-cards');
CREATE POLICY "Admin upload game-cards"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game-cards');

-- ── STEP 8: recalculate totals ─────────────────────────────
UPDATE users u SET
  total_deposited = COALESCE((
    SELECT SUM(amount) FROM transactions t
    WHERE t.user_id = u.id AND t.type = 'deposit' AND t.status = 'approved'), 0),
  total_withdrawn = COALESCE((
    SELECT SUM(amount) FROM transactions t
    WHERE t.user_id = u.id AND t.type = 'withdrawal' AND t.status = 'approved'), 0);

SELECT 'Migration v3 complete ✅' AS status;

-- ── STEP 9: cs_contacts table (v4) ──────────────────────────
-- CS Contact Management — ဝန်ဆောင်မှုအဖွဲ့ ဆက်သွယ်ရေး
CREATE TABLE IF NOT EXISTS public.cs_contacts (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  platform      TEXT        NOT NULL CHECK (platform IN ('viber','telegram','facebook','line','zalo')),
  name          TEXT        NOT NULL,
  display_label TEXT        NOT NULL,
  contact_url   TEXT        NOT NULL,
  hours         TEXT        DEFAULT '00:00 - 23:59',
  is_active     BOOLEAN     DEFAULT true,
  sort_order    INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Anyone can read (frontend CS page), authenticated can write (admin panel)
ALTER TABLE public.cs_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_contacts_public_read" ON public.cs_contacts;
CREATE POLICY "cs_contacts_public_read"
  ON public.cs_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "cs_contacts_admin_write" ON public.cs_contacts;
CREATE POLICY "cs_contacts_admin_write"
  ON public.cs_contacts FOR ALL
  USING (auth.role() IN ('service_role','authenticated'))
  WITH CHECK (auth.role() IN ('service_role','authenticated'));

SELECT 'Migration v4 — cs_contacts table ✅' AS status;

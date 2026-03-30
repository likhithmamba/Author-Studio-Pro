-- ============================================================================
-- Author Studio Pro — Initial Database Schema
-- Run against your Supabase project to set up required tables.
-- ============================================================================

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ─── Subscriptions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    plan                TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id ON subscriptions(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);


-- ─── Row-Level Security ─────────────────────────────────────────────────────
-- Enable RLS (users table access is managed by the backend service role key)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role has full access (backend uses service_role key)
CREATE POLICY "Service role full access on users"
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on subscriptions"
    ON subscriptions FOR ALL
    USING (true)
    WITH CHECK (true);

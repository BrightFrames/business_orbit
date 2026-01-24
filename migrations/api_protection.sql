-- API Protection Migration
-- Run this in your Supabase SQL Editor or psql
-- Created: 2026-01-24

-- ============================================
-- RATE LIMITING TABLE
-- ============================================
-- Stores rate limit counters with sliding windows
-- Each row represents a user+endpoint combination

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key)
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- ============================================
-- IDEMPOTENCY KEYS TABLE
-- ============================================
-- Stores processed request keys to prevent duplicate writes
-- Each row caches the response for a specific action

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================
-- Call these periodically (e.g., via Supabase cron or API)

-- Cleanup old rate limit entries (older than 5 minutes)
-- Run every 10 minutes
-- SELECT cleanup_rate_limits();

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired idempotency keys
-- Run every hour
-- SELECT cleanup_idempotency_keys();

CREATE OR REPLACE FUNCTION cleanup_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- OPTIONAL: Supabase pg_cron setup
-- ============================================
-- If you have pg_cron extension enabled:
--
-- SELECT cron.schedule('cleanup_rate_limits', '*/10 * * * *', 'SELECT cleanup_rate_limits()');
-- SELECT cron.schedule('cleanup_idempotency', '0 * * * *', 'SELECT cleanup_idempotency_keys()');

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these to verify tables were created:

-- SELECT * FROM rate_limits LIMIT 5;
-- SELECT * FROM idempotency_keys LIMIT 5;

COMMENT ON TABLE rate_limits IS 'Stores rate limit counters for API protection';
COMMENT ON TABLE idempotency_keys IS 'Stores processed request keys to prevent duplicate writes';

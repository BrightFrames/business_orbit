-- Create OTP Rate Limits table
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    identifier VARCHAR(255) NOT NULL,
    identifier_type VARCHAR(50) NOT NULL, -- 'email' or 'ip'
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP DEFAULT NOW(),
    blocked_until TIMESTAMP,
    PRIMARY KEY (identifier, identifier_type)
);

-- Create OTP Tokens table
CREATE TABLE IF NOT EXISTS otp_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_tokens_email_purpose ON otp_tokens(email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_tokens(expires_at);

import pool from '../lib/config/database';

/**
 * Email & OTP Schema Migration
 * This script sets up the database tables required for:
 * - Email verification
 * - OTP-based authentication
 * - Rate limiting for abuse prevention
 */
async function setupEmailOTPSchema() {
    console.log('🚀 Starting Email & OTP Schema Migration...');

    if (!pool) {
        console.error('❌ Database pool not available');
        process.exit(1);
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Add email verification columns to users table
        console.log('📧 Adding email verification columns to users...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
        `);

        // Grandfather in existing users (mark as verified)
        console.log('✅ Marking existing users as email verified...');
        await client.query(`
            UPDATE users 
            SET email_verified = TRUE, 
                email_verified_at = created_at 
            WHERE email_verified IS NULL OR email_verified = FALSE;
        `);

        // 2. Create OTP tokens table
        console.log('🔐 Creating otp_tokens table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS otp_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                otp_hash VARCHAR(255) NOT NULL,
                purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('verify_email', 'forgot_password', 'sensitive_action')),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                consumed_at TIMESTAMP WITH TIME ZONE,
                ip_address VARCHAR(45),
                user_agent TEXT,
                CONSTRAINT valid_attempts CHECK (attempts <= max_attempts)
            );
        `);

        // 3. Create rate limiting table
        console.log('🚦 Creating otp_rate_limits table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS otp_rate_limits (
                id SERIAL PRIMARY KEY,
                identifier VARCHAR(255) NOT NULL,
                identifier_type VARCHAR(20) NOT NULL CHECK (identifier_type IN ('email', 'ip')),
                request_count INTEGER DEFAULT 1,
                window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                blocked_until TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(identifier, identifier_type)
            );
        `);

        // 4. Create indexes for performance
        console.log('📊 Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_otp_tokens_email ON otp_tokens(email);
            CREATE INDEX IF NOT EXISTS idx_otp_tokens_user_id ON otp_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_tokens(expires_at);
            CREATE INDEX IF NOT EXISTS idx_otp_tokens_purpose ON otp_tokens(purpose);
            CREATE INDEX IF NOT EXISTS idx_otp_tokens_consumed ON otp_tokens(consumed_at);
            CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_identifier ON otp_rate_limits(identifier, identifier_type);
            CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_blocked ON otp_rate_limits(blocked_until);
            CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
        `);

        // 5. Create cleanup function for expired OTPs
        console.log('🧹 Creating OTP cleanup function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION cleanup_expired_otps()
            RETURNS INTEGER AS $$
            DECLARE
                deleted_count INTEGER;
            BEGIN
                DELETE FROM otp_tokens 
                WHERE expires_at < NOW() - INTERVAL '1 hour'
                   OR consumed_at IS NOT NULL;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                RETURN deleted_count;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 6. Create trigger to update updated_at on rate_limits
        await client.query(`
            DROP TRIGGER IF EXISTS update_otp_rate_limits_updated_at ON otp_rate_limits;
            CREATE TRIGGER update_otp_rate_limits_updated_at 
                BEFORE UPDATE ON otp_rate_limits 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
        `);

        await client.query('COMMIT');
        console.log('✅ Email & OTP Schema setup completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

setupEmailOTPSchema().catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
});

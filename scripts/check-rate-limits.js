const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkRateLimits() {
    try {
        console.log('Checking OTP rate limits...');

        // Check OTP rate limits
        const result = await pool.query('SELECT * FROM otp_rate_limits');
        console.log('OTP Rate Limits:', result.rows.length, 'entries');
        if (result.rows.length > 0) {
            console.table(result.rows);
        }

        // Also check otp_tokens
        const tokens = await pool.query('SELECT id, email, purpose, created_at, expires_at, consumed_at, attempts FROM otp_tokens ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent OTP Tokens:', tokens.rows.length, 'entries');
        if (tokens.rows.length > 0) {
            console.table(tokens.rows);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkRateLimits();

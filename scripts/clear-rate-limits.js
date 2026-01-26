const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function clearRateLimits() {
    try {
        console.log('Connecting to database...');

        // Clear all OTP rate limits
        const result = await pool.query('DELETE FROM otp_rate_limits');
        console.log('✅ Cleared OTP rate limits:', result.rowCount, 'rows deleted');

        // Also clear general rate limits if they exist
        try {
            const result2 = await pool.query('DELETE FROM rate_limits');
            console.log('✅ Cleared general rate limits:', result2.rowCount, 'rows deleted');
        } catch (e) {
            console.log('ℹ️  No general rate_limits table or already empty');
        }

        console.log('\n🎉 Rate limits cleared! You can now try signing up again.');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

clearRateLimits();

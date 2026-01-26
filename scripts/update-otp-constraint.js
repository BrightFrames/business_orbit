const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateOtpPurposeConstraint() {
    const client = await pool.connect();

    try {
        console.log('🚀 Updating OTP tokens constraint...');
        await client.query('BEGIN');

        // Drop the old constraint
        console.log('Removing old constraint...');
        await client.query(`
            ALTER TABLE otp_tokens 
            DROP CONSTRAINT IF EXISTS otp_tokens_purpose_check;
        `);

        // Add the new constraint with signup_verification included
        console.log('Adding new constraint with signup_verification...');
        await client.query(`
            ALTER TABLE otp_tokens 
            ADD CONSTRAINT otp_tokens_purpose_check 
            CHECK (purpose IN ('verify_email', 'forgot_password', 'sensitive_action', 'signup_verification'));
        `);

        await client.query('COMMIT');
        console.log('✅ OTP purpose constraint updated successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to update constraint:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

updateOtpPurposeConstraint();

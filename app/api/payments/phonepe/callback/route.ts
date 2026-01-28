
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { PhonePeService } from '@/lib/services/phonepe';
import { sendEmail } from '@/lib/services/email-service';
import { bookingConfirmationTemplate, premiumWelcomeTemplate } from '@/lib/templates/email-templates';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // PhonePe sends response in base64 encoded format
        const { response } = body;

        if (!response) {
            return NextResponse.json({ error: 'Invalid callback data' }, { status: 400 });
        }

        const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));
        console.log('PhonePe Callback Decoded:', JSON.stringify(decodedResponse, null, 2));

        const { success, code, data } = decodedResponse;

        if (success && code === 'PAYMENT_SUCCESS' && data) {
            const { merchantTransactionId, transactionId, amount, paymentInstrument } = data;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // 1. Update Payment Status
                const paymentResult = await client.query(
                    `UPDATE payments 
                     SET status = 'completed', provider_reference_id = $1, updated_at = NOW()
                     WHERE transaction_id = $2
                     RETURNING user_id, plan_id`,
                    [transactionId, merchantTransactionId]
                );

                if (paymentResult.rows.length === 0) {
                    console.error('Payment record not found for transaction:', merchantTransactionId);
                    await client.query('ROLLBACK');
                    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
                }

                const { user_id, plan_id } = paymentResult.rows[0];

                // 2. Handle Plan Logic
                if (plan_id.startsWith('consultation:')) {
                    const consultationId = plan_id.split(':')[1];

                    // Update consultation status
                    const consultationResult = await client.query(
                        `UPDATE consultations 
                          SET status = 'confirmed', updated_at = NOW() 
                          WHERE id = $1
                          RETURNING id, expert_id, client_id, scheduled_at`,
                        [consultationId]
                    );

                    // Fetch Expert and Client Details for Email
                    const details = await client.query(
                        `SELECT 
                            c.scheduled_at,
                            expert.name as expert_name, expert.email as expert_email,
                            client.name as client_name, client.email as client_email
                         FROM consultations c
                         JOIN users expert ON c.expert_id = expert.id
                         JOIN users client ON c.client_id = client.id
                         WHERE c.id = $1`,
                        [consultationId]
                    );

                    if (details.rows.length > 0) {
                        const { expert_email, expert_name, client_email, client_name, scheduled_at } = details.rows[0];

                        // Send Emails (Non-blocking)
                        sendEmail({
                            to: expert_email,
                            subject: 'New Consultation Confirmed',
                            html: bookingConfirmationTemplate(expert_name, client_name, new Date(scheduled_at).toLocaleString(), 'Expert').html,
                            text: `New consultation with ${client_name} confirmed for ${new Date(scheduled_at).toLocaleString()}`
                        });

                        sendEmail({
                            to: client_email,
                            subject: 'Consultation Booking Confirmed',
                            html: bookingConfirmationTemplate(client_name, expert_name, new Date(scheduled_at).toLocaleString(), 'Client').html,
                            text: `Your consultation with ${expert_name} is confirmed for ${new Date(scheduled_at).toLocaleString()}`
                        });
                    }

                } else if (plan_id === 'premium') {
                    // Upgrade User to Premium
                    await client.query(
                        `UPDATE users SET is_premium = true, updated_at = NOW() WHERE id = $1`,
                        [user_id]
                    );

                    // Fetch User for Email
                    const userRes = await client.query(`SELECT email, name FROM users WHERE id = $1`, [user_id]);
                    if (userRes.rows.length > 0) {
                        const { email, name } = userRes.rows[0];
                        sendEmail({
                            to: email,
                            subject: 'Welcome to Premium!',
                            html: premiumWelcomeTemplate(name).html,
                            text: 'Welcome to Premium! You now have access to exclusive features.'
                        });
                    }
                }

                await client.query('COMMIT');
                return NextResponse.json({ success: true });

            } catch (err) {
                await client.query('ROLLBACK');
                console.error('Error processing success callback:', err);
                return NextResponse.json({ error: 'Processing error' }, { status: 500 });
            } finally {
                client.release();
            }

        } else {
            // Payment Failed or Pending
            await pool.query(
                `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE transaction_id = $1`,
                [decodedResponse.data?.merchantTransactionId]
            );
            return NextResponse.json({ success: true }); // Acknowledge receipt even if failed
        }

    } catch (error: any) {
        console.error('Callback error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

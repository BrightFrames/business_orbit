import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { PhonePeService } from '@/lib/services/phonepe';

export async function POST(request: NextRequest) {
    try {
        const { response } = await request.json(); // PhonePe sends base64 response
        const xVerify = request.headers.get('x-verify');

        if (!response || !xVerify) {
            return NextResponse.json({ error: 'Invalid callback data' }, { status: 400 });
        }

        // 1. Verify Checksum
        const isValid = PhonePeService.verifyCallback(response, xVerify);
        if (!isValid) {
            console.error('PhonePe callback checksum verification failed');
            return NextResponse.json({ error: 'Invalid checksum' }, { status: 401 });
        }

        // 2. Decode Response
        const decodedResponse = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));
        console.log('PhonePe Callback Decoded:', decodedResponse);

        const { success, code, data } = decodedResponse;
        const { merchantTransactionId, transactionId: providerReferenceId, amount, paymentInstrument } = data;

        // 3. Update Payment Table
        const status = (success && code === 'PAYMENT_SUCCESS') ? 'completed' : 'failed';

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const updatePaymentQuery = `
        UPDATE payments 
        SET status = $1, provider_reference_id = $2, updated_at = NOW(), payment_method = $3
        WHERE transaction_id = $4
        RETURNING user_id, plan_id, status
      `;
            const paymentResult = await client.query(updatePaymentQuery, [
                status,
                providerReferenceId,
                paymentInstrument?.type || 'UNKNOWN',
                merchantTransactionId
            ]);

            if (paymentResult.rows.length === 0) {
                throw new Error('Payment record not found for transaction: ' + merchantTransactionId);
            }

            const { user_id, plan_id, status: finalStatus } = paymentResult.rows[0];

            // 4. Update Subscription Table on Success
            // 4. Update Subscription or Consultation Table on Success
            if (finalStatus === 'completed') {
                if (plan_id && plan_id.startsWith('consultation:')) {
                    // Handle Consultation Payment
                    const consultationId = plan_id.split(':')[1];
                    if (consultationId) {
                        const updateConsultationQuery = `
                            UPDATE consultations 
                            SET status = 'confirmed', updated_at = NOW() 
                            WHERE id = $1
                        `;
                        await client.query(updateConsultationQuery, [consultationId]);
                    }
                } else {
                    // Handle Subscription Payment
                    const durationMonths = plan_id === 'monthly' ? 1 : (plan_id === '6months' ? 6 : 12);

                    // Calculate end date
                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + durationMonths);

                    const upsertSubscriptionQuery = `
                      INSERT INTO subscriptions (user_id, plan_id, status, end_date)
                      VALUES ($1, $2, 'active', $3)
                      ON CONFLICT (user_id) 
                      DO UPDATE SET 
                        plan_id = EXCLUDED.plan_id,
                        status = 'active',
                        end_date = EXCLUDED.end_date,
                        updated_at = NOW()
                    `;
                    await client.query(upsertSubscriptionQuery, [user_id, plan_id, endDate]);
                }
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('PhonePe callback processing error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

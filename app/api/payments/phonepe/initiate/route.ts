import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';
import { PhonePeService } from '@/lib/services/phonepe';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId, amount } = await request.json();

        if (!planId || !amount) {
            return NextResponse.json({ error: 'Plan ID and amount are required' }, { status: 400 });
        }

        const transactionId = `MT${Date.now()}${uuidv4().substring(0, 8)}`;

        // Create pending payment record
        await pool.query(
            `INSERT INTO payments (user_id, transaction_id, amount, plan_id, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
            [user.id, transactionId, amount, planId]
        );

        const { base64Body, checksum, apiUrl } = PhonePeService.preparePaymentRequest({
            transactionId,
            userId: user.id.toString(),
            amount,
        });

        // Perform server-side call to PhonePe
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                accept: 'application/json',
            },
            body: JSON.stringify({ request: base64Body }),
        });

        const responseData = await response.json();

        if (responseData.success && responseData.data?.instrumentResponse?.redirectInfo?.url) {
            return NextResponse.json({
                success: true,
                redirectUrl: responseData.data.instrumentResponse.redirectInfo.url,
                transactionId,
            });
        } else {
            console.error('PhonePe API Error Full Response:', JSON.stringify(responseData, null, 2));
            return NextResponse.json({
                error: 'Payment initiation failed',
                details: responseData.message || responseData
            }, { status: 502 });
        }
    } catch (error: any) {
        console.error('Payment initiation error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

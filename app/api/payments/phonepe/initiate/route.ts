import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';
import { PhonePeService } from '@/lib/services/phonepe';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        console.log('Payment initiate started');
        const user = await getUserFromToken(request);
        console.log('User from token:', user ? user.id : 'null');

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Payment Request Body:', JSON.stringify(body));
        const { planId, amount } = body;

        if (!planId || !amount) {
            return NextResponse.json({ error: 'Plan ID and amount are required' }, { status: 400 });
        }

        const transactionId = `MT${Date.now()}${uuidv4().substring(0, 8)}`;
        console.log('Generated Transaction ID:', transactionId);

        // Create pending payment record
        try {
            console.log('Attempting DB Insert...');
            await pool.query(
                `INSERT INTO payments (user_id, transaction_id, amount, plan_id, status)
                 VALUES ($1, $2, $3, $4, 'pending')`,
                [user.id, transactionId, amount, planId]
            );
            console.log('DB Insert Success');
        } catch (dbError: any) {
            console.error('DB Insert Failed:', dbError);
            return NextResponse.json({ error: 'Database error', details: dbError.message }, { status: 500 });
        }

        console.log('Preparing PhonePe Request...');
        const { base64Body, checksum, apiUrl } = PhonePeService.preparePaymentRequest({
            transactionId,
            userId: user.id.toString(),
            amount,
        });

        // Perform server-side call to PhonePe
        console.log('Calling PhonePe API:', apiUrl);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                accept: 'application/json',
            },
            body: JSON.stringify({ request: base64Body }),
        });

        console.log('PhonePe HTTP Status:', response.status);
        const responseText = await response.text();
        console.log('PhonePe Raw Response:', responseText);

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse PhonePe response as JSON:', e);
            return NextResponse.json({
                error: 'Invalid response from Payment Gateway',
                details: responseText.substring(0, 200), // Return first 200 chars of HTML/Text
                phonePeStatus: response.status
            }, { status: 502 });
        }

        console.log('PhonePe API Response (Parsed):', JSON.stringify(responseData));

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
                details: responseData.message || responseData,
                phonePeStatus: response.status,
                phonePeCode: responseData.code
            }, { status: 502 });
        }
    } catch (error: any) {
        console.error('Payment initiation fatal error:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

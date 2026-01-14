import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        const userId = decoded;

        const client = await pool.connect();
        try {
            // 1. Get Transaction History
            const transactionsQuery = `
        SELECT id, points, action_type, description, created_at
        FROM point_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;
            const transactionsResult = await client.query(transactionsQuery, [userId]);
            const transactions = transactionsResult.rows;

            // 2. Get Current Balance (Optional verification)
            const userQuery = `SELECT orbit_points, created_at FROM users WHERE id = $1`;
            const userResult = await client.query(userQuery, [userId]);
            const currentPoints = userResult.rows[0]?.orbit_points || 0;
            const userCreatedAt = userResult.rows[0]?.created_at;

            // 3. Reconcile Balance
            const historyTotal = transactions.reduce((sum: number, tx: any) => sum + tx.points, 0);
            const discrepancy = currentPoints - historyTotal;

            if (discrepancy !== 0) {
                // Add a "Balance Adjustment" or "Previous Activity" entry
                transactions.push({
                    id: 'adjustment-legacy',
                    points: discrepancy,
                    action_type: 'previous_activity',
                    description: 'Points earned from prior activities',
                    created_at: userCreatedAt || new Date().toISOString()
                });

                // Sort again just in case (though usually adjustment is oldest)
                transactions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }

            return NextResponse.json({
                success: true,
                data: {
                    currentPoints,
                    transactions: transactions
                }
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Rewards history error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch rewards history' },
            { status: 500 }
        );
    }
}

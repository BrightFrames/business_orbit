import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';

export async function POST(request: NextRequest) {
  try {
    // Check if pool is available
    if (!pool) {
      return NextResponse.json({
        success: false,
        error: 'Database pool not available. Please check DATABASE_URL.'
      }, { status: 500 });
    }

    // Check if the column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'profession'
    `);

    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Profession column already exists',
        column: checkResult.rows[0]
      });
    }

    // Add the profession column
    await pool.query(`
      ALTER TABLE users ADD COLUMN profession VARCHAR(255)
    `);

    // Verify the column was added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'profession'
    `);

    return NextResponse.json({
      success: true,
      message: 'Profession column added successfully',
      column: verifyResult.rows[0]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      detail: error.detail
    }, { status: 500 });
  }
}

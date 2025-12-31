import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: process.env.VERCEL,
      missing_vars: [],
      critical_vars: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        COOKIE_SECRET: !!process.env.COOKIE_SECRET,
        NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
        CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID
      }
    };

    // Check for missing critical variables
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET', 
      'COOKIE_SECRET',
      'NEXT_PUBLIC_APP_URL'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        healthCheck.missing_vars.push(varName);
        healthCheck.status = 'error';
      }
    });

    return NextResponse.json(healthCheck, { 
      status: healthCheck.status === 'ok' ? 200 : 500 
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

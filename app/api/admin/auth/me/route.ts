import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const adminCookie = request.cookies.get('admin_session');
    const isAdmin = !!adminCookie && adminCookie.value === '1';

    if (!isAdmin) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    console.error('Admin me error:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}



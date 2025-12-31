import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/product/auth?error=oauth_error', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/product/auth?error=no_code', request.url));
    }

    // For now, redirect to auth page with a message that LinkedIn OAuth is not fully implemented
    return NextResponse.redirect(new URL('/product/auth?error=linkedin_not_implemented', request.url));

  } catch (error: any) {
    console.error('LinkedIn OAuth callback error:', error);
    return NextResponse.redirect(new URL('/product/auth?error=server_error', request.url));
  }
}




import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'LinkedIn OAuth not configured' },
        { status: 500 }
      );
    }

    const linkedinAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    linkedinAuthUrl.searchParams.set('response_type', 'code');
    linkedinAuthUrl.searchParams.set('client_id', clientId);
    linkedinAuthUrl.searchParams.set('redirect_uri', redirectUri);
    linkedinAuthUrl.searchParams.set('scope', 'r_liteprofile r_emailaddress');
    linkedinAuthUrl.searchParams.set('state', 'random_state_string');

    return NextResponse.redirect(linkedinAuthUrl.toString());

  } catch (error: any) {
    console.error('LinkedIn OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'OAuth initiation failed' },
      { status: 500 }
    );
  }
}





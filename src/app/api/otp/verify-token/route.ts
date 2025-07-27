import { NextResponse } from 'next/server';

const MSG91_API_KEY = process.env.MSG91_API_KEY;

export async function POST(request: Request) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    if (!MSG91_API_KEY) {
      throw new Error('MSG91_API_KEY is not configured');
    }

    // Verify the token with MSG91
    const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        authkey: MSG91_API_KEY,
        'access-token': access_token
      })
    });

    const data = await response.json();
    console.log('MSG91 token verification response:', data);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      verified: true,
      data: data
    });

  } catch (error) {
    console.error('Error verifying access token:', error);
    return NextResponse.json(
      { error: 'Failed to verify access token' },
      { status: 500 }
    );
  }
} 
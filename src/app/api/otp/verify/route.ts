import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { otp, request_id } = await request.json();
    console.log('Verifying OTP:', { otp, request_id });

    if (!otp || !request_id) {
      return NextResponse.json(
        { error: 'OTP and request_id are required' },
        { status: 400 }
      );
    }

    // Since we're using the OTP itself as the request_id, we can directly compare
    if (otp === request_id) {
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify OTP' },
      { status: 500 }
    );
  }
} 
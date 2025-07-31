import { NextResponse } from 'next/server';

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('FAST2SMS_API_KEY present:', !!FAST2SMS_API_KEY);

    if (!FAST2SMS_API_KEY) {
      console.error('FAST2SMS_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OTP service is not configured' },
        { status: 500 }
      );
    }

    const { phone_number } = await request.json();
    console.log('Received phone number:', phone_number);

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Format phone number
    const cleaned = phone_number.replace(/\D/g, '');
    const formattedPhone = cleaned.replace(/^91/, '');
    console.log('Formatted phone:', formattedPhone);

    if (formattedPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', otp);

    // Prepare Fast2SMS request
    const message = `Your OTP for Go-On Rides verification is ${otp}. Valid for 10 minutes.`;

    // Call Fast2SMS API
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': FAST2SMS_API_KEY
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: formattedPhone,
        flash: 0
      })
    });

    const data = await response.json();
    console.log('Fast2SMS API Response:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });

    // Check for Fast2SMS error responses
    if (!data.return) {
      console.error('Fast2SMS API Error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send OTP' },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      request_id: otp // Store OTP as request_id for verification
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 500 }
    );
  }
} 
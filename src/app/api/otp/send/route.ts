import { NextResponse } from 'next/server';

const MSG91_API_KEY = process.env.MSG91_API_KEY;

export async function POST(request: Request) {
  try {
    console.log('MSG91_API_KEY present:', !!MSG91_API_KEY);

    if (!MSG91_API_KEY) {
      console.error('MSG91_API_KEY is not configured');
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

    // Prepare MSG91 request
    const msg91Request = {
      flow_id: "otp", // Use flow_id instead of template_id
      sender: "919177197474",
      mobiles: `91${formattedPhone}`,
      otp: otp
    };
    console.log('MSG91 Request:', msg91Request);

    // Call MSG91 API with updated headers
    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authkey': MSG91_API_KEY.trim()
      },
      body: JSON.stringify(msg91Request)
    });

    const data = await response.json();
    console.log('MSG91 API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: data
    });

    // Check for specific MSG91 error responses
    if (data.type === 'error' || data.status === 'error') {
      console.error('MSG91 API Error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send OTP' },
        { status: 400 }
      );
    }

    if (!response.ok) {
      console.error('HTTP Error:', response.status, data);
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: response.status }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      request_id: data.request_id || otp // Use MSG91's request_id if available
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 500 }
    );
  }
} 
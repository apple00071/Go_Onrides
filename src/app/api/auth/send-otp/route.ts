import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppOTP, generateOTP, formatPhoneNumber, validatePhoneNumber } from '@/lib/whatsapp-utils';

/**
 * API route for sending WhatsApp OTP
 * POST /api/auth/send-otp
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    // Validate phone number
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Format phone number for WhatsApp
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Generate OTP
    const otp = generateOTP(6);

    // Send OTP via WhatsApp
    const result = await sendWhatsAppOTP(formattedPhone, otp);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    // In a real application, you would store the OTP in your database
    // with an expiration time for verification
    // For demo purposes, we'll just return success

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      phoneNumber: formattedPhone,
      // Don't send OTP in production - just for demo
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * API route for verifying WhatsApp OTP
 * POST /api/auth/verify-otp
 */
export async function PUT(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json();

    // Validate input
    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Check the OTP against the stored value in database
    // 2. Verify it hasn't expired
    // 3. Mark it as used after successful verification

    // For demo purposes, we'll accept any 6-digit OTP
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format' },
        { status: 400 }
      );
    }

    // Simulate OTP verification
    const isValidOTP = otp.length === 6; // In real app, check against database

    if (!isValidOTP) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      phoneNumber: phoneNumber
    });

  } catch (error) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

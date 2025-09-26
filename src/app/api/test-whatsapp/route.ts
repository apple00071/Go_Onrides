import { NextResponse } from 'next/server';
import WhatsAppService from '@/lib/whatsapp-service';

export async function POST(request: Request) {
  try {
    const { phone_number } = await request.json();

    // Validate phone number
    if (!phone_number) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('Testing WhatsApp API connection...');

    // Test the API connection first
    const connectionTest = await WhatsAppService.testConnection();
    if (!connectionTest.success) {
      console.error('API connection test failed:', connectionTest.error);
      return NextResponse.json(
        {
          success: false,
          error: `API Connection Failed: ${connectionTest.error}`
        },
        { status: 400 }
      );
    }

    // Test data for the booking confirmation template
    const testBookingDetails = {
      bookingId: "TEST123",
      pickupLocation: "Go-On Rides Garage",
      dropLocation: "Go-On Rides Garage",
      scheduledTime: "2024-01-15 10:00 AM",
      vehicleType: "Honda Activa",
      bookingAmount: "500",
      securityDeposit: "1000",
      totalAmount: "1500"
    };

    console.log('Sending test WhatsApp booking confirmation to:', phone_number);

    const result = await WhatsAppService.sendBookingConfirmation(phone_number, testBookingDetails);

    console.log('WhatsApp message sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Test booking confirmation sent successfully!',
      bookingId: testBookingDetails.bookingId,
      apiResponse: result
    });

  } catch (error) {
    console.error('Error in test WhatsApp endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test message'
      },
      { status: 500 }
    );
  }
}
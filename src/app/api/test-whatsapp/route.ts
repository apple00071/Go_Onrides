import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { phone_number } = await request.json();
    
    // Test data for the completed booking template
    const testData = {
      customerName: "John Doe",
      bookingId: "B12345",
      bookingAmount: "1000",
      additionalCharges: "200",
      totalAmount: "1200"
    };

    console.log('Sending test WhatsApp message to:', phone_number, 'with data:', testData);

    const result = await sendWhatsAppMessage(phone_number, testData);
    
    console.log('WhatsApp message result:', result);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error sending test message:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test message'
      },
      { status: 400 }
    );
  }
} 
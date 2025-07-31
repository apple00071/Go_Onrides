import { getSupabaseClient } from './supabase';

interface WhatsAppMessageData {
  customerName?: string;
  bookingId?: string;
  bookingAmount?: string;
  additionalCharges?: string;
  totalAmount?: string;
}

/**
 * Send a WhatsApp message using the Meta WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  data: WhatsAppMessageData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get WhatsApp API credentials from environment variables
    const apiKey = process.env.WHATSAPP_API_KEY;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const fromPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiKey || !templateName || !fromPhoneNumberId) {
      throw new Error('WhatsApp API configuration is missing');
    }

    // Format phone number to international format
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // Prepare message data
    const messageData = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: data.customerName || '' },
              { type: 'text', text: data.bookingId || '' },
              { type: 'text', text: data.bookingAmount || '0' },
              { type: 'text', text: data.additionalCharges || '0' },
              { type: 'text', text: data.totalAmount || '0' }
            ]
          }
        ]
      }
    };

    // Send message using WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v17.0/${fromPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send WhatsApp message');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message' 
    };
  }
}

/**
 * Send a booking update message via WhatsApp
 */
export async function sendBookingUpdateMessage(
  phoneNumber: string,
  bookingId: string,
  status: string,
  additionalInfo: string = ''
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id (
          name
        )
      `)
      .eq('booking_id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');

    // Format amounts
    const bookingAmount = booking.booking_amount.toLocaleString('en-IN');
    const additionalCharges = (
      (booking.damage_charges || 0) + 
      (booking.late_fee || 0) + 
      (booking.extension_fee || 0)
    ).toLocaleString('en-IN');
    const totalAmount = booking.total_amount.toLocaleString('en-IN');

    // Send WhatsApp message
    return sendWhatsAppMessage(phoneNumber, {
      customerName: booking.customer?.name || '',
      bookingId: booking.booking_id,
      bookingAmount,
      additionalCharges,
      totalAmount
    });
  } catch (error) {
    console.error('Error sending booking update message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send booking update message' 
    };
  }
} 
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Get the webhook secret from environment variable
const WEBHOOK_SECRET = process.env.MSG91_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    // Verify the webhook secret if configured
    const authHeader = request.headers.get('x-msg91-secret');
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookData = await request.json();
    console.log('MSG91 Webhook received:', webhookData);

    // Get Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Store the webhook data in Supabase for logging/tracking
    const { error } = await supabase
      .from('otp_logs')
      .insert({
        event_type: webhookData.type,
        phone_number: webhookData.phone,
        status: webhookData.status,
        raw_data: webhookData
      });

    if (error) {
      console.error('Error storing webhook data:', error);
      // Still return 200 to MSG91 to acknowledge receipt
      return NextResponse.json({ status: 'received but not stored' });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to acknowledge receipt
    return NextResponse.json({ status: 'received with errors' });
  }
} 
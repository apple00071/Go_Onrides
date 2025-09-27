import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendReturnReminder } from '@/lib/whatsapp-utils';

/**
 * API route for sending return reminders
 * This endpoint queries active bookings and sends WhatsApp reminders
 * Designed to be triggered by Vercel Cron
 *
 * GET /api/reminders/return-reminders
 */

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Type definitions for better TypeScript support
interface Customer {
  contact: string;
  name: string;
}

interface BookingWithCustomer {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  end_date: string;
  dropoff_time: string;
  vehicle_details: any;
  status: string;
  customer: Customer[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const now = new Date();
    const currentTime = now.toISOString();
    console.log('🔄 Starting return reminder process at:', currentTime);

    // Get reminder configuration from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'return_reminder_hours_before',
        'return_reminder_intervals',
        'enable_return_reminders'
      ]);

    const config = {
      hoursBefore: 24, // Default: 24 hours
      intervals: [24, 2], // Default: 24h and 2h before
      enabled: true // Default: enabled
    };

    // Parse settings if they exist
    settings?.forEach((setting: any) => {
      if (setting.setting_key === 'return_reminder_hours_before') {
        config.hoursBefore = parseInt(setting.setting_value as string) || 24;
      } else if (setting.setting_key === 'return_reminder_intervals') {
        config.intervals = (setting.setting_value as number[]) || [24, 2];
      } else if (setting.setting_key === 'enable_return_reminders') {
        config.enabled = setting.setting_value === 'true' || setting.setting_value === true;
      }
    });

    if (!config.enabled) {
      console.log('ℹ️ Return reminders are disabled in configuration');
      return NextResponse.json({
        success: true,
        message: 'Return reminders are disabled',
        processed: 0
      });
    }

    console.log('⚙️ Reminder configuration:', config);

    // Query active bookings that need return reminders
    // Status should be 'in_use' (vehicle is currently rented)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_id,
        customer_name,
        customer_contact,
        end_date,
        dropoff_time,
        vehicle_details,
        status,
        customer:customer_id (
          contact,
          name
        )
      `)
      .eq('status', 'in_use')
      .not('end_date', 'is', null);

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    // Type assertion for bookings to fix TypeScript inference issues
    const typedBookings = bookings as BookingWithCustomer[] | null;

    if (!typedBookings || typedBookings.length === 0) {
      console.log('ℹ️ No active bookings found');
      return NextResponse.json({
        success: true,
        message: 'No active bookings to process',
        processed: 0
      });
    }

    console.log(`📋 Found ${typedBookings.length} active bookings`);

    let processedCount = 0;
    let sentCount = 0;
    const results: Array<{
      booking_id: string;
      status: string;
      reason?: string;
      customer_phone?: string;
      error?: string;
    }> = [];

    // Process each booking
    for (const booking of typedBookings) {
      try {
        const endDateTime = new Date(`${booking.end_date}T${booking.dropoff_time}`);
        const hoursUntilReturn = (endDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        console.log(`\n🔍 Processing booking ${booking.booking_id}:`);
        console.log(`   - End time: ${endDateTime.toISOString()}`);
        console.log(`   - Hours until return: ${hoursUntilReturn.toFixed(1)}`);

        // Check if this booking needs a reminder
        const needsReminder = config.intervals.some(interval => {
          const shouldSend = hoursUntilReturn <= interval && hoursUntilReturn > (interval - 1);
          if (shouldSend) {
            console.log(`   ✓ Should send ${interval}h reminder`);
          }
          return shouldSend;
        });

        if (!needsReminder) {
          console.log(`   ⏭️ No reminder needed at this time`);
          continue;
        }

        // Check if reminder was already sent for this interval
        const { data: existingReminders } = await supabase
          .from('notifications')
          .select('id')
          .eq('reference_id', booking.id)
          .eq('reference_type', 'booking')
          .eq('type', 'return_reminder')
          .gte('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()); // Last 2 hours

        if (existingReminders && existingReminders.length > 0) {
          console.log(`   ⚠️ Reminder already sent recently`);
          continue;
        }

        // Get customer phone number
        const customerPhone = booking.customer_contact || (() => {
          if (Array.isArray(booking.customer) && booking.customer.length > 0) {
            const customerArray = booking.customer as Array<{contact: string; name: string}>;
            return customerArray[0]?.contact;
          }
          return null;
        })();

        if (!customerPhone) {
          console.log(`   ⚠️ No customer phone number found`);
          results.push({
            booking_id: booking.booking_id,
            status: 'skipped',
            reason: 'No customer phone number'
          });
          continue;
        }

        // Parse vehicle details
        let vehicleModel = 'Vehicle';
        let registrationNumber = '';

        try {
          const vehicleDetails = typeof booking.vehicle_details === 'string'
            ? JSON.parse(booking.vehicle_details)
            : booking.vehicle_details;

          vehicleModel = vehicleDetails?.model || 'Vehicle';
          registrationNumber = vehicleDetails?.registration || '';
        } catch (error) {
          console.log(`   ⚠️ Could not parse vehicle details`);
        }

        // Send return reminder
        console.log(`   📱 Sending return reminder to ${customerPhone}`);

        const rentalDetails = {
          bookingId: booking.booking_id,
          returnTime: booking.dropoff_time,
          returnLocation: 'Go-On Rides Return Location', // You might want to make this configurable
          vehicleModel: vehicleModel,
          registrationNumber: registrationNumber
        };

        const result = await sendReturnReminder(customerPhone, rentalDetails);

        if (result.success) {
          // Log the reminder in notifications table
          const notificationData = {
            user_id: null, // System notification
            title: 'Return Reminder Sent',
            message: `Return reminder sent for booking ${booking.booking_id}`,
            type: 'return_reminder',
            reference_id: booking.id,
            reference_type: 'booking',
            data: {
              booking_id: booking.booking_id,
              customer_phone: customerPhone,
              reminder_type: 'whatsapp',
              sent_at: currentTime
            }
          };

          await (supabase as any).from('notifications').insert(notificationData);

          sentCount++;
          console.log(`   ✅ Reminder sent successfully`);
          results.push({
            booking_id: booking.booking_id,
            status: 'sent',
            customer_phone: customerPhone
          });
        } else {
          console.log(`   ❌ Failed to send reminder: ${result.error}`);
          results.push({
            booking_id: booking.booking_id,
            status: 'failed',
            error: result.error
          });
        }

        processedCount++;

        // Add small delay to avoid overwhelming the WhatsApp API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (bookingError: unknown) {
        console.error(`❌ Error processing booking ${booking.booking_id}:`, bookingError);
        results.push({
          booking_id: booking.booking_id,
          status: 'error',
          error: bookingError instanceof Error ? bookingError.message : 'Unknown error'
        });
      }
    }

    console.log(`\n📊 Return reminder process completed:`);
    console.log(`   - Processed: ${processedCount} bookings`);
    console.log(`   - Sent: ${sentCount} reminders`);
    console.log(`   - Total active bookings: ${typedBookings.length}`);

    return NextResponse.json({
      success: true,
      message: 'Return reminder process completed',
      processed: processedCount,
      sent: sentCount,
      total_bookings: typedBookings.length,
      results: results,
      timestamp: currentTime
    });

  } catch (error: unknown) {
    console.error('❌ Error in return reminders API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

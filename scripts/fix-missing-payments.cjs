const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

// Check if environment variables are loaded correctly
console.log('Checking environment variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing');

// Use service role key if available, otherwise fall back to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: No Supabase key found in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey
);

async function fixMissingPayments() {
  try {
    console.log('Starting to fix missing payment records...');

    // Get all bookings with paid amount > 0 but without corresponding payment records
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_id, customer_name, paid_amount, payment_mode, created_at, created_by')
      .gt('paid_amount', 0);

    if (bookingsError) {
      throw new Error(`Error fetching bookings: ${bookingsError.message}`);
    }

    console.log(`Found ${bookings.length} bookings with paid amount`);

    // For each booking, check if there's a payment record
    for (const booking of bookings) {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id')
        .eq('booking_id', booking.id);

      if (paymentsError) {
        console.error(`Error checking payments for booking ${booking.booking_id}: ${paymentsError.message}`);
        continue;
      }

      // If no payment records exist for this booking, create one
      if (!payments || payments.length === 0) {
        console.log(`Creating payment record for booking ${booking.booking_id} with amount ${booking.paid_amount}`);
        
        const { error: insertError } = await supabase
          .from('payments')
          .insert({
            booking_id: booking.id,
            amount: booking.paid_amount,
            payment_mode: booking.payment_mode || 'cash',
            payment_status: 'completed',
            created_at: booking.created_at,
            created_by: booking.created_by || null
          });

        if (insertError) {
          console.error(`Error creating payment record for booking ${booking.booking_id}: ${insertError.message}`);
        } else {
          console.log(`✓ Successfully created payment record for booking ${booking.booking_id}`);
        }
      } else {
        console.log(`Booking ${booking.booking_id} already has ${payments.length} payment records`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

fixMissingPayments(); 
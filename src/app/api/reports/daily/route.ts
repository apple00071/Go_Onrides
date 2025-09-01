import { NextResponse } from 'next/server';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

interface BookingDetails {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  booking_amount: number;
  security_deposit_amount: number;
  paid_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  damage_charges: number;
  late_fee: number;
  extension_fee: number;
  completed_at: string | null;
  completed_by: string | null;
  start_date: string;
  end_date: string;
  payments: { amount: number }[];
}

interface PaymentDetails {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: string;
  created_at: string;
  booking?: {
    id: string;
    customer_name: string;
    vehicle_details: {
      model: string;
      registration: string;
    };
  };
}

interface DatabasePayment {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: string;
  created_at: string;
  booking: {
    id: string;
    customer_name: string;
    vehicle_details: {
      model: string;
      registration: string;
    };
  };
}

// Configure email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'goonriders6@gmail.com',
    pass: 'xzqu ujms cmak scfw'
  }
});

export const dynamic = 'force-dynamic';

async function generateDailyReport(forDate: Date) {
  // Create authenticated Supabase client with service role
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  // Format the date as YYYY-MM-DD for database query
  const queryDate = forDate.toISOString().split('T')[0];
  
  // Set up query time range for the full IST day
  const startOfDay = new Date(queryDate + 'T00:00:00+05:30');
  const endOfDay = new Date(queryDate + 'T23:59:59.999+05:30');
  
  console.log('Database query parameters:', {
    inputDate: forDate.toISOString(),
    queryDate: queryDate,
    queryRange: {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    }
  });

  // Get bookings for today
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_id,
      customer_name,
      customer_contact,
      vehicle_details,
      booking_amount,
      security_deposit_amount,
      paid_amount,
      damage_charges,
      late_fee,
      extension_fee,
      payment_status,
      status,
      created_at,
      completed_at,
      completed_by,
      start_date,
      end_date,
      payments (
        amount
      )
    `)
    .gte('start_date', startOfDay.toISOString())
    .lt('start_date', endOfDay.toISOString())
    .returns<BookingDetails[]>();

  if (bookingsError) {
    console.error('Bookings query error:', bookingsError);
    throw bookingsError;
  }

  // Get completed bookings for today
  const { data: completedInRange, error: completedError } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'completed')
    .gte('completed_at', startOfDay.toISOString())
    .lt('completed_at', endOfDay.toISOString())
    .returns<BookingDetails[]>();

  if (completedError) {
    console.error('Error fetching completed bookings:', completedError);
    throw completedError;
  }

  // Get payments received today
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      booking_id,
      amount,
      payment_mode,
      created_at,
      booking:bookings!inner(
        id,
        customer_name,
        vehicle_details
      )
    `)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())
    .returns<PaymentDetails[]>();

  if (paymentsError) {
    console.error('Payments query error:', paymentsError);
    throw paymentsError;
  }

  console.log('Data found:', {
    bookingsCount: bookings?.length || 0,
    completedBookingsCount: completedInRange?.length || 0,
    paymentsCount: payments?.length || 0
  });

  const typedBookings = (bookings || []) as BookingDetails[];
  const typedCompletedBookings = (completedInRange || []) as BookingDetails[];
  const typedPayments = (payments || []) as PaymentDetails[];

  // All bookings found within the date range are new bookings
  const newBookings = typedBookings;

  // Use completed bookings from separate query
  const completedBookings = typedCompletedBookings;

  // Calculate totals
  const totalBookingAmount = typedBookings.reduce((sum, booking) => {
    const amount = Number(booking.booking_amount || 0) +
                  Number(booking.damage_charges || 0) +
                  Number(booking.late_fee || 0) +
                  Number(booking.extension_fee || 0);
    return sum + amount;
  }, 0);

  const totalSecurityDeposit = typedBookings.reduce((sum, booking) => 
    sum + Number(booking.security_deposit_amount || 0), 0);

  const totalPayments = (payments || []).reduce((sum, payment) => 
    sum + Number(payment.amount || 0), 0);

  // Calculate pending payments
  const totalPendingPayments = typedBookings.reduce((sum, booking) => {
    const totalCharges = Number(booking.booking_amount || 0) +
                        Number(booking.security_deposit_amount || 0) +
                        Number(booking.damage_charges || 0) +
                        Number(booking.late_fee || 0) +
                        Number(booking.extension_fee || 0);
    const paid = Number(booking.paid_amount || 0);
    return sum + (totalCharges - paid);
  }, 0);

  // Generate HTML report
  const html = `
    <h2>Daily Report - ${formatDate(forDate)} (IST)</h2>
    
    <h3>Summary</h3>
    <ul>
      <li>Total New Bookings: ${newBookings.length}</li>
      <li>Total Completed Bookings: ${completedBookings.length}</li>
      <li>Total Booking Amount (including charges): ${formatCurrency(totalBookingAmount)}</li>
      <li>Total Security Deposits: ${formatCurrency(totalSecurityDeposit)}</li>
      <li>Total Payments Received Today: ${formatCurrency(totalPayments)}</li>
      <li>Total Pending Payments: ${formatCurrency(totalPendingPayments)}</li>
    </ul>

    <h3>New Bookings</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Booking ID</th>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Duration</th>
        <th>Booking Amount</th>
        <th>Additional Charges</th>
        <th>Security Deposit</th>
        <th>Paid Amount</th>
        <th>Status</th>
      </tr>
      ${newBookings.length ? newBookings.map(booking => {
        const additionalCharges = (
          Number(booking.damage_charges || 0) +
          Number(booking.late_fee || 0) +
          Number(booking.extension_fee || 0)
        );
        return `
        <tr>
          <td>${booking.booking_id}</td>
          <td>${booking.customer_name}<br>${booking.customer_contact}</td>
          <td>${booking.vehicle_details.model}<br>${booking.vehicle_details.registration}</td>
          <td>
            Pickup: ${formatDateTime(booking.start_date)}<br>
            Return: ${formatDateTime(booking.end_date)}
          </td>
          <td>${formatCurrency(booking.booking_amount)}</td>
          <td>${formatCurrency(additionalCharges)}</td>
          <td>${formatCurrency(booking.security_deposit_amount)}</td>
          <td>${formatCurrency(booking.paid_amount)}</td>
          <td>${booking.status}</td>
        </tr>
      `}).join('') : '<tr><td colspan="9">No new bookings today</td></tr>'}
    </table>

    <h3>Completed Bookings Today</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Booking ID</th>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Duration</th>
        <th>Total Amount</th>
        <th>Charges Breakdown</th>
        <th>Completed At</th>
        <th>Completed By</th>
      </tr>
      ${completedBookings.length ? completedBookings.map(booking => {
        const additionalCharges = (
          Number(booking.damage_charges || 0) +
          Number(booking.late_fee || 0) +
          Number(booking.extension_fee || 0)
        );
        const totalAmount = (
          Number(booking.booking_amount || 0) +
          Number(booking.security_deposit_amount || 0) +
          additionalCharges
        );
        return `
        <tr>
          <td>${booking.booking_id}</td>
          <td>${booking.customer_name}<br>${booking.customer_contact}</td>
          <td>${booking.vehicle_details.model}<br>${booking.vehicle_details.registration}</td>
          <td>
            Pickup: ${formatDateTime(booking.start_date)}<br>
            Return: ${formatDateTime(booking.end_date)}<br>
            ${booking.completed_at ? `Actual Return: ${formatDateTime(booking.completed_at)}` : ''}
          </td>
          <td>${formatCurrency(totalAmount)}</td>
          <td>
            Booking: ${formatCurrency(booking.booking_amount)}<br>
            Security: ${formatCurrency(booking.security_deposit_amount)}<br>
            ${additionalCharges > 0 ? `Additional: ${formatCurrency(additionalCharges)}` : ''}
          </td>
          <td>${booking.completed_at ? formatDateTime(booking.completed_at) : 'N/A'}</td>
          <td>${booking.completed_by || 'N/A'}</td>
        </tr>
      `}).join('') : '<tr><td colspan="8">No bookings completed today</td></tr>'}
    </table>

    <h3>Payments Received Today</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Time</th>
        <th>Booking ID</th>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Amount</th>
        <th>Payment Mode</th>
      </tr>
      ${payments?.length ? payments.map(payment => `
        <tr>
          <td>${formatDateTime(payment.created_at)}</td>
          <td>${payment.booking_id}</td>
          <td>${payment.booking?.customer_name || 'N/A'}</td>
          <td>${payment.booking?.vehicle_details?.model || 'N/A'}<br>${payment.booking?.vehicle_details?.registration || 'N/A'}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${payment.payment_mode}</td>
        </tr>
      `).join('') : '<tr><td colspan="6">No payments received today</td></tr>'}
    </table>

    <p style="color: #666; font-size: 12px; margin-top: 20px;">
      Generated at ${formatDateTime(new Date())}
    </p>
  `;

  return html;
}

// Helper function to check if a date falls within a range
function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end;
}

export async function GET(request: Request) {
  try {
    // Check for API key or other authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);
    
    // Set to start of current day in IST
    const reportDate = new Date(istDate);
    reportDate.setHours(0, 0, 0, 0);

    const reportHtml = await generateDailyReport(reportDate);

    // Send email with today's date
    await transporter.sendMail({
      from: 'goonriders6@gmail.com',
      to: 'goonriders6@gmail.com',
      subject: `Daily Report - ${formatDate(reportDate)}`,
      html: reportHtml
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
} 
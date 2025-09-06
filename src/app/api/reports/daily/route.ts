import { NextResponse } from 'next/server';
import { formatCurrency, formatDate, formatDateTimeIST, formatDateForDisplay } from '@/lib/utils';
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
  damage_charges: number;
  late_fee: number;
  extension_fee: number;
  payment_status: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  dropoff_time: string | null;
  payments?: { amount: number }[];
}

interface PaymentDetails {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: string;
  created_at: string;
  booking?: {
    id: string;
    booking_id: string;
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

  // Get new bookings for today (not completed)
  const { data: newBookings, error: newBookingsError } = await supabase
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
      pickup_time,
      dropoff_time,
      payments (
        amount
      )
    `)
    .eq('start_date', queryDate)
    .neq('status', 'completed');

  if (newBookingsError) {
    console.error('New bookings query error:', newBookingsError);
    throw newBookingsError;
  }

  // Get completed bookings for today
  const { data: completedBookings, error: completedError } = await supabase
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
      pickup_time,
      dropoff_time
    `)
    .eq('status', 'completed')
    .gte('completed_at', startOfDay.toISOString())
    .lt('completed_at', endOfDay.toISOString());

  if (completedError) {
    console.error('Error fetching completed bookings:', completedError);
    throw completedError;
  }

  // Get payments for the specified day
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      booking_id,
      amount,
      payment_mode,
      created_at,
      booking:bookings(
        id,
        booking_id,
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

  const typedNewBookings = (newBookings || []) as BookingDetails[];
  const typedCompletedBookings = (completedBookings || []) as BookingDetails[];
  const typedPayments = (payments || []) as PaymentDetails[];

  // Calculate totals
  const totalBookingAmount = typedNewBookings.reduce((sum, booking) => {
    const amount = Number(booking.booking_amount || 0) +
                  Number(booking.damage_charges || 0) +
                  Number(booking.late_fee || 0) +
                  Number(booking.extension_fee || 0);
    return sum + amount;
  }, 0);

  const totalSecurityDeposit = typedNewBookings.reduce((sum, booking) => 
    sum + Number(booking.security_deposit_amount || 0), 0);

  const totalPayments = typedPayments.reduce((sum, payment) => 
    sum + Number(payment.amount || 0), 0);

  // Calculate pending payments
  const totalPendingPayments = typedNewBookings.reduce((sum, booking) => {
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
      <li>Total New Bookings: ${typedNewBookings.length}</li>
      <li>Total Completed Bookings: ${typedCompletedBookings.length}</li>
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
      ${typedNewBookings.length ? typedNewBookings.map(booking => {
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
            Pickup: ${formatDateForDisplay(booking.start_date)} ${booking.pickup_time || ''}<br>
            Return: ${formatDateForDisplay(booking.end_date)} ${booking.dropoff_time || ''}
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
      ${typedCompletedBookings.length ? typedCompletedBookings.map(booking => {
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
            Pickup: ${formatDateForDisplay(booking.start_date)} ${booking.pickup_time || ''}<br>
            Return: ${formatDateForDisplay(booking.end_date)} ${booking.dropoff_time || ''}<br>
            ${booking.completed_at ? `Actual Return: ${formatDateTimeIST(booking.completed_at)}` : ''}
          </td>
          <td>${formatCurrency(totalAmount)}</td>
          <td>
            Booking: ${formatCurrency(booking.booking_amount)}<br>
            Security: ${formatCurrency(booking.security_deposit_amount)}<br>
            ${additionalCharges > 0 ? `Additional: ${formatCurrency(additionalCharges)}` : ''}
          </td>
          <td>${booking.completed_at ? formatDateTimeIST(booking.completed_at) : 'N/A'}</td>
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
      ${typedPayments.length ? typedPayments.map(payment => {
        const bookingData = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking;
        return `
        <tr>
          <td>${formatDateTimeIST(payment.created_at)}</td>
          <td>${bookingData?.booking_id || payment.booking_id}</td>
          <td>${bookingData?.customer_name || 'N/A'}</td>
          <td>${bookingData?.vehicle_details?.model || 'N/A'}<br>${bookingData?.vehicle_details?.registration || 'N/A'}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${payment.payment_mode}</td>
        </tr>
      `}).join('') : '<tr><td colspan="6">No payments received today</td></tr>'}
    </table>

    <p style="color: #666; font-size: 12px; margin-top: 20px;">
      Generated at ${formatDateTimeIST(new Date())}
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
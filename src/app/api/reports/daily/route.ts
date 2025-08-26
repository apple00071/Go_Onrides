import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import nodemailer from 'nodemailer';

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
}

interface PaymentDetails {
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
  } | null;
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

async function generateDailyReport() {
  const supabase = getSupabaseClient();
  
  // Set up IST date range for today
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(now.getTime() + istOffset);
  
  // Set to start of day in IST
  const startOfDay = new Date(istDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Set to end of day in IST
  const endOfDay = new Date(istDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Convert back to UTC for database query
  const queryStart = new Date(startOfDay.getTime() - istOffset);
  const queryEnd = new Date(endOfDay.getTime() - istOffset);

  console.log('Fetching data for:', {
    istDate: istDate.toISOString(),
    queryStart: queryStart.toISOString(),
    queryEnd: queryEnd.toISOString()
  });

  // Get today's bookings
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
      payment_status,
      status,
      created_at
    `)
    .gte('created_at', queryStart.toISOString())
    .lt('created_at', queryEnd.toISOString());

  if (bookingsError) throw bookingsError;

  // Get today's payments
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
        customer_name,
        vehicle_details
      )
    `)
    .gte('created_at', queryStart.toISOString())
    .lt('created_at', queryEnd.toISOString());

  if (paymentsError) throw paymentsError;

  const typedBookings = (bookings || []) as BookingDetails[];
  const typedPayments = (payments || []) as PaymentDetails[];

  // Calculate totals
  const totalBookings = typedBookings.length;
  const totalBookingAmount = typedBookings.reduce((sum, booking) => sum + (booking.booking_amount || 0), 0);
  const totalSecurityDeposit = typedBookings.reduce((sum, booking) => sum + (booking.security_deposit_amount || 0), 0);
  const totalPayments = typedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  // Generate HTML report with IST timestamp
  const html = `
    <h2>Daily Report - ${formatDate(istDate)} (IST)</h2>
    
    <h3>Summary</h3>
    <ul>
      <li>Total New Bookings: ${totalBookings}</li>
      <li>Total Booking Amount: ${formatCurrency(totalBookingAmount)}</li>
      <li>Total Security Deposits: ${formatCurrency(totalSecurityDeposit)}</li>
      <li>Total Payments Received: ${formatCurrency(totalPayments)}</li>
    </ul>

    <h3>New Bookings</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Booking ID</th>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Amount</th>
        <th>Security Deposit</th>
        <th>Paid Amount</th>
        <th>Status</th>
      </tr>
      ${typedBookings.length ? typedBookings.map(booking => `
        <tr>
          <td>${booking.booking_id}</td>
          <td>${booking.customer_name}<br>${booking.customer_contact}</td>
          <td>${booking.vehicle_details.model}<br>${booking.vehicle_details.registration}</td>
          <td>${formatCurrency(booking.booking_amount)}</td>
          <td>${formatCurrency(booking.security_deposit_amount)}</td>
          <td>${formatCurrency(booking.paid_amount)}</td>
          <td>${booking.status} (${booking.payment_status})</td>
        </tr>
      `).join('') : '<tr><td colspan="7">No new bookings today</td></tr>'}
    </table>

    <h3>Payments Received</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Booking</th>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Amount</th>
        <th>Payment Mode</th>
      </tr>
      ${typedPayments.length ? typedPayments.map(payment => `
        <tr>
          <td>${payment.booking_id}</td>
          <td>${payment.booking?.customer_name || 'N/A'}</td>
          <td>${payment.booking?.vehicle_details?.model || 'N/A'}<br>${payment.booking?.vehicle_details?.registration || 'N/A'}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${payment.payment_mode}</td>
        </tr>
      `).join('') : '<tr><td colspan="5">No payments received today</td></tr>'}
    </table>

    <p style="color: #666; font-size: 12px; margin-top: 20px;">
      This report was automatically generated at ${istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
    </p>
  `;

  return html;
}

export async function GET(request: Request) {
  try {
    // Check for API key or other authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportHtml = await generateDailyReport();

    // Send email
    await transporter.sendMail({
      from: 'goonriders6@gmail.com',
      to: 'goonriders6@gmail.com',
      subject: `Daily Report - ${formatDate(new Date())}`,
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
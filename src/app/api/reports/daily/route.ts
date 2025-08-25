import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import nodemailer from 'nodemailer';

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
  const today = new Date();
  // Convert to IST (UTC+5:30)
  today.setHours(today.getHours() + 5);
  today.setMinutes(today.getMinutes() + 30);
  // Set to start of day
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      *,
      customer_name,
      customer_contact,
      vehicle_details,
      booking_amount,
      security_deposit_amount,
      paid_amount,
      payment_status,
      created_at
    `)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString());

  if (bookingsError) throw bookingsError;

  // Get today's payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      *,
      booking:bookings(customer_name, vehicle_details)
    `)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString());

  if (paymentsError) throw paymentsError;

  // Calculate totals
  const totalBookings = bookings?.length || 0;
  const totalBookingAmount = bookings?.reduce((sum, booking) => sum + (booking.booking_amount || 0), 0) || 0;
  const totalSecurityDeposit = bookings?.reduce((sum, booking) => sum + (booking.security_deposit_amount || 0), 0) || 0;
  const totalPayments = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

  // Generate HTML report with IST timestamp
  const html = `
    <h2>Daily Report - ${formatDate(today)} (IST)</h2>
    
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
      ${bookings?.map(booking => `
        <tr>
          <td>${booking.booking_id}</td>
          <td>${booking.customer_name}<br>${booking.customer_contact}</td>
          <td>${booking.vehicle_details.model}<br>${booking.vehicle_details.registration}</td>
          <td>${formatCurrency(booking.booking_amount)}</td>
          <td>${formatCurrency(booking.security_deposit_amount)}</td>
          <td>${formatCurrency(booking.paid_amount)}</td>
          <td>${booking.payment_status}</td>
        </tr>
      `).join('') || '<tr><td colspan="7">No new bookings today</td></tr>'}
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
      ${payments?.map(payment => `
        <tr>
          <td>${payment.booking_id}</td>
          <td>${payment.booking?.customer_name || 'N/A'}</td>
          <td>${payment.booking?.vehicle_details?.model || 'N/A'}<br>${payment.booking?.vehicle_details?.registration || 'N/A'}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${payment.payment_mode}</td>
        </tr>
      `).join('') || '<tr><td colspan="5">No payments received today</td></tr>'}
    </table>

    <p style="color: #666; font-size: 12px; margin-top: 20px;">
      This report was automatically generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
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
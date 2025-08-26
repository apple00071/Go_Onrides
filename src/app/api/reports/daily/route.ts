import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';

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
  payments?: Array<{
    amount: number;
  }>;
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
      damage_charges,
      late_fee,
      extension_fee,
      payment_status,
      status,
      created_at,
      payments (
        amount
      )
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
      booking:bookings!inner(
        id,
        customer_name,
        vehicle_details
      )
    `)
    .gte('created_at', queryStart.toISOString())
    .lt('created_at', queryEnd.toISOString());

  if (paymentsError) throw paymentsError;

  const typedBookings = (bookings || []) as BookingDetails[];
  const typedPayments = (payments || []).map(payment => {
    const bookingData = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking;
    return {
      id: String(payment.id),
      booking_id: String(payment.booking_id),
      amount: Number(payment.amount),
      payment_mode: String(payment.payment_mode),
      created_at: String(payment.created_at),
      booking: bookingData ? {
        id: String(bookingData.id),
        customer_name: String(bookingData.customer_name),
        vehicle_details: bookingData.vehicle_details
      } : null
    };
  });

  const totalBookings = typedBookings.length;

  // Calculate totals using the same logic as dashboard
  const totalBookingAmount = typedBookings.reduce((sum, booking) => {
    const amount = Number(booking.booking_amount || 0) +
                  Number(booking.damage_charges || 0) +
                  Number(booking.late_fee || 0) +
                  Number(booking.extension_fee || 0);
    return sum + amount;
  }, 0);

  const totalSecurityDeposit = typedBookings.reduce((sum, booking) => 
    sum + Number(booking.security_deposit_amount || 0), 0);

  const totalPayments = typedPayments.reduce((sum, payment) => 
    sum + Number(payment.amount || 0), 0);

  // Calculate pending payments using the same logic as dashboard
  const pendingAmount = typedBookings.reduce((sum, booking) => {
    if (!['confirmed', 'in_use'].includes(booking.status) || 
        !['pending', 'partial'].includes(booking.payment_status)) {
      return sum;
    }
    
    const totalCharges = (
      Number(booking.booking_amount || 0) +
      Number(booking.security_deposit_amount || 0) +
      Number(booking.damage_charges || 0) +
      Number(booking.late_fee || 0) +
      Number(booking.extension_fee || 0)
    );

    // Calculate total payments including both paid_amount and any additional payments
    const additionalPayments = booking.payments?.reduce((pSum, payment) => 
      pSum + Number(payment.amount || 0), 0) || 0;
    const totalPaid = Number(booking.paid_amount || 0) + additionalPayments;

    // Calculate pending amount
    const pendingAmount = Math.max(0, totalCharges - totalPaid);
    return sum + pendingAmount;
  }, 0);

  // Generate HTML report with IST timestamp
  const html = `
    <h2>Daily Report - ${formatDate(istDate)} (IST)</h2>
    
    <h3>Summary</h3>
    <ul>
      <li>Total New Bookings: ${totalBookings}</li>
      <li>Total Booking Amount (including charges): ${formatCurrency(totalBookingAmount)}</li>
      <li>Total Security Deposits: ${formatCurrency(totalSecurityDeposit)}</li>
      <li>Total Payments Received Today: ${formatCurrency(totalPayments)}</li>
      <li>Total Pending Payments: ${formatCurrency(pendingAmount)}</li>
    </ul>

    <h3>New Bookings</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Booking ID</th>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Booking Amount</th>
        <th>Additional Charges</th>
        <th>Security Deposit</th>
        <th>Paid Amount</th>
        <th>Status</th>
      </tr>
      ${typedBookings.length ? typedBookings.map(booking => {
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
          <td>${formatCurrency(booking.booking_amount)}</td>
          <td>${formatCurrency(additionalCharges)}</td>
          <td>${formatCurrency(booking.security_deposit_amount)}</td>
          <td>${formatCurrency(booking.paid_amount)}</td>
          <td>${booking.status} (${booking.payment_status})</td>
        </tr>
      `}).join('') : '<tr><td colspan="8">No new bookings today</td></tr>'}
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
      Generated at ${format(istDate, 'PPpp')} IST
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
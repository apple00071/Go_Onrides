import { NextResponse } from 'next/server';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import nodemailer from 'nodemailer';
import { format, parse } from 'date-fns';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, BookingRecord, PaymentRecord } from '@/types/bookings';

// Configure email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'goonriders6@gmail.com',
    pass: 'xzqu ujms cmak scfw'
  }
});

async function generateReport(startDate: Date, endDate: Date, supabase: SupabaseClient<Database>) {
  console.log('Querying with dates:', {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  });

  // Test query to verify data exists without any filters
  const { data: testData, error: testError } = await supabase
    .from('bookings')
    .select('id, created_at, completed_at, status')
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<Pick<BookingRecord, 'id' | 'created_at' | 'completed_at' | 'status'>[]>();

  console.log('Test query results (most recent bookings):', {
    count: testData?.length || 0,
    sample: testData?.map(b => ({
      id: b.id,
      created: b.created_at,
      completed: b.completed_at,
      status: b.status
    }))
  });

  if (testError) {
    console.error('Error in test query:', testError);
  }

  // Get all bookings without date filters first
  const { data: allBookings, error: allBookingsError } = await supabase
    .from('bookings')
    .select('id, created_at, completed_at')
    .returns<Pick<BookingRecord, 'id' | 'created_at' | 'completed_at'>[]>();

  console.log('All bookings in database:', {
    total: allBookings?.length || 0,
    dateRange: allBookings?.map(b => ({
      id: b.id,
      created: b.created_at,
      completed: b.completed_at
    }))
  });

  // Now get bookings for the date range
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
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .returns<BookingRecord[]>();

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    throw bookingsError;
  }

  // Get completed bookings
  const { data: completedInRange, error: completedError } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString())
    .returns<BookingRecord[]>();

  if (completedError) {
    console.error('Error fetching completed bookings:', completedError);
    throw completedError;
  }

  // Get payments
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
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .returns<(Omit<PaymentRecord, 'booking'> & {
      booking: {
        id: string;
        customer_name: string;
        vehicle_details: {
          model: string;
          registration: string;
        };
      };
    })[]>();

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
    throw paymentsError;
  }

  // Combine and deduplicate bookings
  const allBookingsInRange = [...(bookings || [])];
  completedInRange?.forEach(booking => {
    if (!allBookingsInRange.find(b => b.id === booking.id)) {
      allBookingsInRange.push(booking);
    }
  });

  const typedBookings = allBookingsInRange;
  const typedPayments = (payments || []).map(payment => ({
    ...payment,
    booking: payment.booking ? {
      id: payment.booking.id,
      customer_name: payment.booking.customer_name,
      vehicle_details: payment.booking.vehicle_details
    } : null
  }));

  // Log processed data for debugging
  console.log('Processed data:', {
    totalBookings: typedBookings.length,
    newBookings: typedBookings.filter(b => {
      const createdDate = new Date(b.created_at);
      return createdDate >= startDate && createdDate <= endDate;
    }).length,
    completedBookings: typedBookings.filter(b => {
      if (!b.completed_at) return false;
      const completedDate = new Date(b.completed_at);
      return completedDate >= startDate && completedDate <= endDate;
    }).length,
    totalPayments: typedPayments.length
  });

  // Separate new and completed bookings
  const newBookings = typedBookings.filter(booking => 
    isDateInRange(new Date(booking.created_at), startDate, endDate)
  );

  const completedBookings = typedBookings.filter(booking => 
    booking.completed_at && isDateInRange(new Date(booking.completed_at), startDate, endDate)
  );

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

  const totalPayments = typedPayments.reduce((sum, payment) => 
    sum + Number(payment.amount || 0), 0);

  // Calculate pending payments
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
    const paidAmount = Number(booking.paid_amount || 0);
    const pendingAmount = Math.max(0, totalCharges - paidAmount);
    return sum + pendingAmount;
  }, 0);

  // Generate HTML report
  const html = `
    <h2>Report for ${formatDate(startDate)} to ${formatDate(endDate)}</h2>
    
    <h3>Summary</h3>
    <ul>
      <li>Total New Bookings: ${newBookings.length}</li>
      <li>Total Completed Bookings: ${completedBookings.length}</li>
      <li>Total Booking Amount (including charges): ${formatCurrency(totalBookingAmount)}</li>
      <li>Total Security Deposits: ${formatCurrency(totalSecurityDeposit)}</li>
      <li>Total Payments Received: ${formatCurrency(totalPayments)}</li>
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
          <td>${formatCurrency(booking.booking_amount)}</td>
          <td>${formatCurrency(additionalCharges)}</td>
          <td>${formatCurrency(booking.security_deposit_amount)}</td>
          <td>${formatCurrency(booking.paid_amount)}</td>
          <td>${booking.status} (${booking.payment_status})</td>
        </tr>
      `}).join('') : '<tr><td colspan="8">No new bookings in this period</td></tr>'}
    </table>

    <h3>Completed Bookings</h3>
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
            Start: ${formatDateTime(booking.start_date)}<br>
            End: ${formatDateTime(booking.end_date)}
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
      `}).join('') : '<tr><td colspan="8">No bookings completed in this period</td></tr>'}
    </table>

    <h3>Payments Received</h3>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr>
        <th>Time</th>
        <th>Booking ID</th>
        <th>Customer</th>
        <th>Vehicle</th>
        <th>Amount</th>
        <th>Payment Mode</th>
      </tr>
      ${typedPayments.length ? typedPayments.map(payment => `
        <tr>
          <td>${formatDateTime(payment.created_at)}</td>
          <td>${payment.booking_id}</td>
          <td>${payment.booking?.customer_name || 'N/A'}</td>
          <td>${payment.booking?.vehicle_details?.model || 'N/A'}<br>${payment.booking?.vehicle_details?.registration || 'N/A'}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${payment.payment_mode}</td>
        </tr>
      `).join('') : '<tr><td colspan="6">No payments received in this period</td></tr>'}
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

export async function POST(request: Request) {
  try {
    // Create authenticated Supabase client
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

    const { startDate, endDate } = await request.json();
    console.log('Received dates:', { startDate, endDate });

    // Parse dates and convert to UTC
    const start = parse(startDate, 'yyyy-MM-dd', new Date());
    start.setUTCHours(0, 0, 0, 0);

    const end = parse(endDate, 'yyyy-MM-dd', new Date());
    end.setUTCHours(23, 59, 59, 999);

    console.log('UTC dates:', {
      start: start.toISOString(),
      end: end.toISOString()
    });

    const reportHtml = await generateReport(start, end, supabase);

    // Send email
    await transporter.sendMail({
      from: 'goonriders6@gmail.com',
      to: 'goonriders6@gmail.com',
      subject: `Report - ${formatDate(start)} to ${formatDate(end)}`,
      html: reportHtml
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send report' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/permission-checker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has manageBookings permission
    const { hasPermission, error: permissionError } = await requirePermission(
      user.id, 
      'manageBookings'
    );

    if (!hasPermission) {
      return NextResponse.json({ 
        error: permissionError || 'Insufficient permissions to complete bookings' 
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      damageCharges,
      damageDescription,
      vehicleRemarks,
      odometer_reading,
      fuel_level,
      inspection_notes,
      lateFee,
      extensionFee,
      paymentAmount,
      paymentMethod,
      notes
    } = body;

    // Update booking with completion details
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        damage_charges: parseFloat(damageCharges) || 0,
        damage_description: damageDescription,
        vehicle_remarks: vehicleRemarks,
        odometer_reading: odometer_reading,
        fuel_level: fuel_level,
        inspection_notes: inspection_notes,
        late_fee: parseFloat(lateFee) || 0,
        extension_fee: parseFloat(extensionFee) || 0,
        total_amount: parseFloat(paymentAmount) || 0,
        payment_status: paymentMethod === 'cash' ? 'completed' : 'pending',
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json({ error: 'Failed to complete booking' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Booking completed successfully', 
      booking: updatedBooking 
    });
  } catch (error) {
    console.error('Error in POST /api/bookings/[id]/complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
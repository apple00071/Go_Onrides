-- Create booking_extensions table
CREATE TABLE booking_extensions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    previous_end_date DATE NOT NULL,
    previous_dropoff_time VARCHAR(5) NOT NULL,
    new_end_date DATE NOT NULL,
    new_dropoff_time VARCHAR(5) NOT NULL,
    additional_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups by booking id
CREATE INDEX idx_booking_extensions_booking_id ON booking_extensions(booking_id);

-- Add new notification type for booking extensions
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BOOKING_EXTENDED'; 
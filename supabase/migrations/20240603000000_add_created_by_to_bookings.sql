-- Add created_by column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add index on created_by column for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON public.bookings(created_by);

-- Update function for logging booking creation events
CREATE OR REPLACE FUNCTION on_booking_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the booking creation if the user is available
    IF NEW.created_by IS NOT NULL THEN
        PERFORM log_user_activity(
            NEW.created_by,
            'create',
            'booking',
            NEW.id::text,
            jsonb_build_object(
                'booking_id', NEW.booking_id,
                'customer_name', NEW.customer_name,
                'amount', NEW.booking_amount,
                'vehicle_model', (NEW.vehicle_details->>'model')
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking creation logging
DROP TRIGGER IF EXISTS log_booking_created ON public.bookings;
CREATE TRIGGER log_booking_created
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION on_booking_created(); 
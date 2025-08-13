-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Add next_payment_date to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- Create a view for pending payments
CREATE OR REPLACE VIEW public.pending_payments AS
SELECT 
    b.id as booking_id,
    b.booking_id as booking_number,
    b.customer_name,
    b.total_amount,
    b.paid_amount,
    (b.total_amount - b.paid_amount) as remaining_amount,
    b.next_payment_date,
    b.created_at,
    b.status
FROM public.bookings b
WHERE 
    b.payment_status = 'partial' 
    AND b.next_payment_date IS NOT NULL 
    AND b.status != 'cancelled'
ORDER BY b.next_payment_date ASC;

-- Grant permissions
GRANT SELECT ON public.pending_payments TO authenticated;
GRANT ALL ON public.bookings TO authenticated;

-- Add policy for bookings if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND schemaname = 'public' 
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.bookings
            FOR SELECT TO authenticated USING (true);
    END IF;
END
$$; 
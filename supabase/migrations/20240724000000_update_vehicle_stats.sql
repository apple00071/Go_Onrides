-- Update existing vehicle statistics
WITH booking_stats AS (
    SELECT 
        vehicle_details->>'registration' as registration,
        COUNT(*) as total_bookings,
        COALESCE(SUM(paid_amount), 0) as total_revenue
    FROM bookings
    WHERE status IN ('completed', 'in_use')
    GROUP BY vehicle_details->>'registration'
)
UPDATE vehicles v
SET 
    total_bookings = bs.total_bookings,
    total_revenue = bs.total_revenue,
    updated_at = NOW()
FROM booking_stats bs
WHERE v.registration = bs.registration; 
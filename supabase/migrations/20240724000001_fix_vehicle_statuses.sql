-- Fix vehicle statuses based on their latest booking status
WITH latest_bookings AS (
    SELECT DISTINCT ON (vehicle_details->>'registration')
        vehicle_details->>'registration' as registration,
        status as booking_status
    FROM bookings
    WHERE vehicle_details->>'registration' IS NOT NULL
    ORDER BY vehicle_details->>'registration', created_at DESC
)
UPDATE vehicles v
SET 
    status = CASE 
        WHEN lb.booking_status = 'completed' THEN 'available'
        WHEN lb.booking_status IN ('confirmed', 'in_use') THEN 'in_use'
        ELSE v.status
    END,
    updated_at = NOW()
FROM latest_bookings lb
WHERE v.registration = lb.registration; 
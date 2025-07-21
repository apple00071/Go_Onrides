-- Populate vehicles table from existing bookings
WITH vehicle_stats AS (
    SELECT
        vehicle_details->>'model' as model,
        vehicle_details->>'registration' as registration,
        CASE 
            WHEN bool_or(status = 'confirmed' OR status = 'in_use') THEN 'in_use'
            ELSE 'available'
        END as status,
        MIN(created_at) as added_date,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN booking_amount ELSE 0 END) as total_revenue,
        MIN(created_at) as created_at,
        MIN(created_by::text)::uuid as created_by
    FROM bookings
    WHERE vehicle_details->>'registration' IS NOT NULL
    GROUP BY 
        vehicle_details->>'model',
        vehicle_details->>'registration'
)
INSERT INTO vehicles (
    model,
    registration,
    status,
    added_date,
    total_bookings,
    total_revenue,
    created_at,
    created_by
)
SELECT
    model,
    registration,
    status,
    added_date,
    total_bookings,
    total_revenue,
    created_at,
    created_by
FROM vehicle_stats
ON CONFLICT (registration) DO UPDATE
SET 
    total_bookings = EXCLUDED.total_bookings,
    total_revenue = EXCLUDED.total_revenue,
    updated_at = NOW(); 
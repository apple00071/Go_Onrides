-- Fix incorrect extension fees
-- Reset extension fee to 0 for bookings where:
-- 1. The completion time is on the same day as the expected return time
UPDATE bookings
SET extension_fee = 0
WHERE DATE(COALESCE(completed_at, NOW())) = DATE(end_date || 'T' || dropoff_time)
AND extension_fee > 0; 
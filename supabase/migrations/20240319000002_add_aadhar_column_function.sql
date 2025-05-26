-- Create a function to add the aadhar_number column if it doesn't exist
CREATE OR REPLACE FUNCTION add_aadhar_column()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'aadhar_number'
    ) THEN
        -- Add the column if it doesn't exist
        EXECUTE 'ALTER TABLE bookings ADD COLUMN aadhar_number TEXT';
    END IF;
END;
$$; 
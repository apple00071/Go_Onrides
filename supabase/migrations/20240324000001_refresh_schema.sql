-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Ensure proper permissions are set
GRANT ALL ON vehicle_maintenance TO authenticated;
GRANT ALL ON vehicle_maintenance TO service_role;
GRANT USAGE ON TYPE maintenance_type TO authenticated;
GRANT USAGE ON TYPE maintenance_type TO service_role;

-- Refresh materialized views if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_matviews 
        WHERE matviewname = 'supabase_users'
    ) THEN
        EXECUTE 'REFRESH MATERIALIZED VIEW supabase_users';
    END IF;
END $$; 
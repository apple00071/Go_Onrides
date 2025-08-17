-- First check if the table exists
DO $$ 
BEGIN
    -- Create the table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'vehicle_maintenance') THEN
        CREATE TABLE vehicle_maintenance (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            vehicle_registration TEXT REFERENCES vehicles(registration) ON DELETE CASCADE,
            maintenance_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            maintenance_type maintenance_type NOT NULL,
            description TEXT,
            cost DECIMAL(10,2),
            next_due_date TIMESTAMP WITH TIME ZONE,
            next_due_km INTEGER,
            odometer_reading INTEGER,
            performed_by TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            created_by UUID REFERENCES auth.users(id),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_by UUID REFERENCES auth.users(id)
        );
    ELSE
        -- If table exists but column is missing, add it
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'vehicle_maintenance' 
            AND column_name = 'maintenance_type'
        ) THEN
            -- First add the column as nullable
            ALTER TABLE vehicle_maintenance 
            ADD COLUMN maintenance_type maintenance_type;
            
            -- Set a default value for existing records
            UPDATE vehicle_maintenance 
            SET maintenance_type = 'general_service'
            WHERE maintenance_type IS NULL;
            
            -- Now make it NOT NULL
            ALTER TABLE vehicle_maintenance 
            ALTER COLUMN maintenance_type SET NOT NULL;
        END IF;
    END IF;
END $$;

-- Ensure proper permissions
GRANT ALL ON vehicle_maintenance TO authenticated;
GRANT ALL ON vehicle_maintenance TO service_role;
GRANT USAGE ON TYPE maintenance_type TO authenticated;
GRANT USAGE ON TYPE maintenance_type TO service_role;

-- Force a schema reload
NOTIFY pgrst, 'reload schema'; 
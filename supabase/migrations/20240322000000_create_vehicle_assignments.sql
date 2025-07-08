-- Drop triggers first
DROP TRIGGER IF EXISTS update_worker_stats_on_inspection ON vehicle_inspections;
DROP TRIGGER IF EXISTS update_worker_stats_on_assignment ON vehicle_assignments;

-- Drop function
DROP FUNCTION IF EXISTS update_worker_stats();

-- Drop tables (order matters due to foreign key constraints)
DROP TABLE IF EXISTS vehicle_inspections;
DROP TABLE IF EXISTS vehicle_assignments;

-- Create vehicle_assignments table
CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL,
    vehicle_details JSONB NOT NULL,
    assignment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Create vehicle_inspections table
CREATE TABLE IF NOT EXISTS vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES vehicle_assignments(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES auth.users(id),
    vehicle_id TEXT NOT NULL,
    inspection_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('pre_assignment', 'daily', 'post_assignment')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    checklist JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    photos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX idx_vehicle_assignments_worker_id ON vehicle_assignments(worker_id);
CREATE INDEX idx_vehicle_assignments_vehicle_id ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_status ON vehicle_assignments(status);
CREATE INDEX idx_vehicle_inspections_assignment_id ON vehicle_inspections(assignment_id);
CREATE INDEX idx_vehicle_inspections_worker_id ON vehicle_inspections(worker_id);
CREATE INDEX idx_vehicle_inspections_vehicle_id ON vehicle_inspections(vehicle_id);
CREATE INDEX idx_vehicle_inspections_status ON vehicle_inspections(status);

-- Enable RLS
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle_assignments

-- Admins can do everything
CREATE POLICY "Admins can do everything with vehicle assignments"
    ON vehicle_assignments
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Workers can view their own assignments
CREATE POLICY "Workers can view their own assignments"
    ON vehicle_assignments
    FOR SELECT
    USING (worker_id = auth.uid());

-- Create RLS policies for vehicle_inspections

-- Admins can do everything
CREATE POLICY "Admins can do everything with vehicle inspections"
    ON vehicle_inspections
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Workers can view and create inspections for their assignments
CREATE POLICY "Workers can view their own inspections"
    ON vehicle_inspections
    FOR SELECT
    USING (worker_id = auth.uid());

CREATE POLICY "Workers can create inspections for their assignments"
    ON vehicle_inspections
    FOR INSERT
    WITH CHECK (
        worker_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM vehicle_assignments
            WHERE vehicle_assignments.id = vehicle_inspections.assignment_id
            AND vehicle_assignments.worker_id = auth.uid()
        )
    );

-- Create function to update worker stats on assignment/inspection changes
CREATE OR REPLACE FUNCTION update_worker_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update assigned_vehicles count
    UPDATE worker_stats
    SET 
        assigned_vehicles = (
            SELECT COUNT(*)::integer
            FROM vehicle_assignments
            WHERE worker_id = NEW.worker_id
            AND status IN ('pending', 'in_progress')
        ),
        completed_inspections = (
            SELECT COUNT(*)::integer
            FROM vehicle_inspections
            WHERE worker_id = NEW.worker_id
            AND status = 'completed'
        ),
        pending_inspections = (
            SELECT COUNT(*)::integer
            FROM vehicle_inspections
            WHERE worker_id = NEW.worker_id
            AND status = 'pending'
        ),
        updated_at = NOW()
    WHERE worker_id = NEW.worker_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update worker stats
CREATE TRIGGER update_worker_stats_on_assignment
    AFTER INSERT OR UPDATE OR DELETE ON vehicle_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats();

CREATE TRIGGER update_worker_stats_on_inspection
    AFTER INSERT OR UPDATE OR DELETE ON vehicle_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats(); 
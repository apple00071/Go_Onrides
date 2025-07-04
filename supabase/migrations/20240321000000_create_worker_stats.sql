-- Create worker_stats table
CREATE TABLE IF NOT EXISTS worker_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_vehicles INTEGER DEFAULT 0,
    completed_inspections INTEGER DEFAULT 0,
    pending_inspections INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(worker_id)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_worker_stats_updated_at
    BEFORE UPDATE ON worker_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats_updated_at();

-- Add RLS policies
ALTER TABLE worker_stats ENABLE ROW LEVEL SECURITY;

-- Workers can view their own stats
CREATE POLICY "Workers can view their own stats"
    ON worker_stats FOR SELECT
    USING (auth.uid() = worker_id);

-- Workers can update their own stats
CREATE POLICY "Workers can update their own stats"
    ON worker_stats FOR UPDATE
    USING (auth.uid() = worker_id);

-- Admins can view all worker stats
CREATE POLICY "Admins can view all worker stats"
    ON worker_stats FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all worker stats
CREATE POLICY "Admins can update all worker stats"
    ON worker_stats FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can insert worker stats
CREATE POLICY "Admins can insert worker stats"
    ON worker_stats FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete worker stats
CREATE POLICY "Admins can delete worker stats"
    ON worker_stats FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON worker_stats TO authenticated; 
-- Create user logs table to track all activities
CREATE TABLE IF NOT EXISTS public.user_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('login', 'logout', 'create', 'update', 'delete')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'booking', 'customer', 'payment', 'document', 'vehicle')),
    entity_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_email TEXT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON public.user_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_action_type ON public.user_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_logs_entity_type ON public.user_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON public.user_logs(created_at);

-- Create a function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action_type TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_user_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.user_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        details,
        user_email
    ) VALUES (
        p_user_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_details,
        p_user_email
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for user_logs
ALTER TABLE public.user_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view user logs
CREATE POLICY "Allow authenticated users to view user logs"
ON public.user_logs
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert user logs
CREATE POLICY "Allow authenticated users to insert user logs"
ON public.user_logs
FOR INSERT
TO authenticated
WITH CHECK (true); 
-- Create worker_stats table
CREATE TABLE IF NOT EXISTS public.worker_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(worker_id)
);

-- Enable RLS
ALTER TABLE public.worker_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Workers can view their own stats"
    ON public.worker_stats
    FOR SELECT
    TO authenticated
    USING (auth.uid() = worker_id);

CREATE POLICY "System can update worker stats"
    ON public.worker_stats
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create function to update updated_at on record changes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER handle_worker_stats_updated_at
    BEFORE UPDATE ON public.worker_stats
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create function to initialize worker stats on user creation
CREATE OR REPLACE FUNCTION public.handle_new_worker()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.worker_stats (worker_id)
    VALUES (NEW.id)
    ON CONFLICT (worker_id) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to initialize worker stats when a new worker is created
CREATE TRIGGER on_worker_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    WHEN (NEW.raw_user_meta_data->>'role' = 'worker')
    EXECUTE PROCEDURE public.handle_new_worker(); 
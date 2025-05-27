-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view documents
CREATE POLICY "Allow authenticated users to view documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        JOIN public.profiles ON auth.users.id = profiles.id
        WHERE auth.users.id = auth.uid()
        AND (
            profiles.role = 'admin' 
            OR profiles.permissions->>'viewDocuments' = 'true'
        )
    )
);

-- Allow authenticated users with proper permissions to manage documents
CREATE POLICY "Allow users to manage documents"
ON public.documents
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        JOIN public.profiles ON auth.users.id = profiles.id
        WHERE auth.users.id = auth.uid()
        AND (
            profiles.role = 'admin' 
            OR profiles.permissions->>'uploadDocuments' = 'true'
        )
    )
);

-- Create indexes
CREATE INDEX idx_documents_booking_id ON public.documents(booking_id);
CREATE INDEX idx_documents_type ON public.documents(type);
CREATE INDEX idx_documents_uploaded_at ON public.documents(uploaded_at); 
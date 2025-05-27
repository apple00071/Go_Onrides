-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all customers
CREATE POLICY "Allow authenticated users to view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users with admin role to manage customers
CREATE POLICY "Allow admins to manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        JOIN public.profiles ON auth.users.id = profiles.id
        WHERE auth.users.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.permissions->>'manageCustomers' = 'true')
    )
);

-- Create index on commonly searched fields
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone ON public.customers(phone); 
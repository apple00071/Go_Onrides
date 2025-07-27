-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    gst_number TEXT,
    invoice_date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    vehicle_registration TEXT NOT NULL,
    pickup_date_time TEXT NOT NULL,
    dropoff_date_time TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX idx_invoices_vehicle_registration ON invoices(vehicle_registration);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- Add RLS policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Allow users to view all invoices in their organization
CREATE POLICY "Users can view all invoices" ON invoices
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM organizations_users
        WHERE organization_id = (
            SELECT organization_id FROM organizations_users WHERE user_id = auth.uid()
        )
    ));

-- Allow users to create invoices
CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own invoices
CREATE POLICY "Users can update their own invoices" ON invoices
    FOR UPDATE
    USING (auth.uid() = created_by);

-- Add updated_at trigger
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp(); 
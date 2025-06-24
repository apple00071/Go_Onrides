-- Create document_type enum
CREATE TYPE document_type AS ENUM (
    'customer_photo',
    'aadhar_front',
    'aadhar_back',
    'dl_front',
    'dl_back',
    'pan_card',
    'voter_id',
    'passport',
    'rental_agreement',
    'electricity_bill',
    'bank_statement',
    'other_document_1',
    'other_document_2',
    'other_document_3'
);

-- Create customer_documents table
CREATE TABLE customer_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(customer_id, type)
);

-- Add trigger for updated_at
CREATE TRIGGER update_customer_documents_updated_at
    BEFORE UPDATE ON customer_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for customer_documents
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view customer documents
CREATE POLICY "Allow authenticated users to view customer documents"
ON customer_documents
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert customer documents
CREATE POLICY "Allow authenticated users to insert customer documents"
ON customer_documents
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND (
            role = 'admin' OR
            permissions->>'uploadDocuments' = 'true'
        )
    )
);

-- Create indexes
CREATE INDEX idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX idx_customer_documents_type ON customer_documents(type);

-- Create storage bucket for customer documents if it doesn't exist
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('customer-documents', 'customer-documents', false)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Set up storage policies for the customer-documents bucket
CREATE POLICY "Allow authenticated users to view customer documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'customer-documents');

CREATE POLICY "Allow authenticated users to upload customer documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-documents'); 
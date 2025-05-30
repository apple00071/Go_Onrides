-- Drop existing tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  dob DATE,
  aadhar_number TEXT,
  dl_number TEXT,
  dl_expiry_date DATE,
  temp_address_street TEXT,
  temp_address_city TEXT,
  temp_address_state TEXT,
  temp_address_pincode TEXT,
  perm_address_street TEXT,
  perm_address_city TEXT,
  perm_address_state TEXT,
  perm_address_pincode TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  documents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  customer_email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  aadhar_number TEXT,
  date_of_birth DATE,
  dl_number TEXT,
  dl_expiry_date DATE,
  temp_address TEXT,
  perm_address TEXT,
  vehicle_details JSONB NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  dropoff_time TIME NOT NULL,
  booking_amount DECIMAL(10,2) NOT NULL,
  security_deposit_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create payments table with proper foreign key reference
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_documents_booking_id ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

-- Add RLS policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to view bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to view payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to insert bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to update bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to update payments" ON payments;

-- Allow authenticated users to view all records
CREATE POLICY "Allow authenticated users to view customers"
ON customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view bookings"
ON bookings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view documents"
ON documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to view payments"
ON payments FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert customers"
ON customers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert payments"
ON payments FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update records
CREATE POLICY "Allow authenticated users to update customers"
ON customers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update documents"
ON documents FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payments"
ON payments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true); 
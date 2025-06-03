-- Add updated_by column to tables
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON public.bookings(updated_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_updated_by ON public.payments(updated_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_updated_by ON public.documents(updated_by);

-- Create function to handle updates and track who made them
CREATE OR REPLACE FUNCTION update_record_with_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle record creation and track who created it
CREATE OR REPLACE FUNCTION set_record_creator()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for payments table
DROP TRIGGER IF EXISTS set_payment_creator ON public.payments;
CREATE TRIGGER set_payment_creator
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION set_record_creator();

DROP TRIGGER IF EXISTS set_payment_updater ON public.payments;
CREATE TRIGGER set_payment_updater
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION update_record_with_user();

-- Create triggers for documents table
DROP TRIGGER IF EXISTS set_document_creator ON public.documents;
CREATE TRIGGER set_document_creator
BEFORE INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION set_record_creator();

DROP TRIGGER IF EXISTS set_document_updater ON public.documents;
CREATE TRIGGER set_document_updater
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION update_record_with_user();

-- Create trigger for bookings table (update only since created_by exists)
DROP TRIGGER IF EXISTS set_booking_updater ON public.bookings;
CREATE TRIGGER set_booking_updater
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION update_record_with_user(); 
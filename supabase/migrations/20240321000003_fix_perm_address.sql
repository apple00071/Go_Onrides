-- Add perm_address column for backward compatibility
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS perm_address TEXT;

-- Migrate existing data from perm_address_street to perm_address if needed
UPDATE customers 
SET perm_address = perm_address_street 
WHERE perm_address IS NULL AND perm_address_street IS NOT NULL;

-- Migrate data from perm_address to perm_address_street if needed
UPDATE customers 
SET perm_address_street = perm_address 
WHERE perm_address_street IS NULL AND perm_address IS NOT NULL;

-- Add trigger to keep both columns in sync
CREATE OR REPLACE FUNCTION sync_perm_address()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.perm_address IS NOT NULL AND NEW.perm_address != COALESCE(OLD.perm_address, '') THEN
            NEW.perm_address_street = NEW.perm_address;
        ELSIF NEW.perm_address_street IS NOT NULL AND NEW.perm_address_street != COALESCE(OLD.perm_address_street, '') THEN
            NEW.perm_address = NEW.perm_address_street;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_perm_address_trigger ON customers;
CREATE TRIGGER sync_perm_address_trigger
    BEFORE INSERT OR UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION sync_perm_address(); 
-- Add missing columns to vehicle_batteries
ALTER TABLE vehicle_batteries
ADD COLUMN IF NOT EXISTS old_battery_image_url TEXT,
ADD COLUMN IF NOT EXISTS warranty_card_image_url TEXT,
ADD COLUMN IF NOT EXISTS warranty_details TEXT,
ADD COLUMN IF NOT EXISTS battery_health INTEGER CHECK (battery_health >= 0 AND battery_health <= 100);

-- Create storage bucket for maintenance images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance', 'maintenance', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance');

CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'maintenance' 
  AND auth.role() = 'authenticated'
); 
-- Add late fee and extension fee columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS late_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS extension_fee DECIMAL(10, 2) DEFAULT 0;

-- Add global settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add default settings for late fee and extension fee
INSERT INTO app_settings (setting_key, setting_value)
VALUES 
  ('late_fee', '{"amount": 1000, "grace_period_hours": 2}'::jsonb),
  ('extension_fee', '{"amount": 1000, "threshold_hours": 6}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to read and update app settings
CREATE POLICY "Allow admins to manage app settings" ON app_settings
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create policy to allow workers to read app settings only
CREATE POLICY "Allow workers to read app settings" ON app_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- Add trigger for updating updated_at column
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN bookings.late_fee IS 'Fee charged for returning the vehicle after grace period';
COMMENT ON COLUMN bookings.extension_fee IS 'Fee charged for extended usage beyond allowed hours';
COMMENT ON TABLE app_settings IS 'Global application settings';
COMMENT ON COLUMN app_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN app_settings.setting_value IS 'JSON value for the setting'; 
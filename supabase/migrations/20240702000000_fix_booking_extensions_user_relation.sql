-- Enable Row Level Security
ALTER TABLE booking_extensions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view booking extensions
CREATE POLICY "Allow authenticated users to view booking extensions"
ON booking_extensions FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to create booking extensions
CREATE POLICY "Allow authenticated users to create booking extensions"
ON booking_extensions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create view to expose user data safely
CREATE OR REPLACE VIEW extended_user_data AS
SELECT 
    id,
    email,
    raw_user_meta_data as user_metadata
FROM auth.users;

-- Grant necessary permissions
GRANT SELECT ON extended_user_data TO authenticated;

-- Create foreign key relationship through the view
COMMENT ON COLUMN booking_extensions.created_by IS E'@foreignKey (id) references extended_user_data'; 
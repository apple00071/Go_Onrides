-- Temporarily disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing profile if it exists
DELETE FROM profiles WHERE id = '4cc2784a-a397-47de-8197-1544ac2f471a';

-- Insert admin profile
INSERT INTO profiles (
    id,
    email,
    username,
    role,
    permissions,
    created_at,
    updated_at
)
VALUES (
    '4cc2784a-a397-47de-8197-1544ac2f471a',
    'applegraphicshyd@gmail.com',
    'applegraphicshyd',
    'admin',
    '{
        "createBooking": true,
        "viewBookings": true,
        "uploadDocuments": true,
        "viewDocuments": true,
        "managePayments": true,
        "accessReports": true
    }'::jsonb,
    NOW(),
    NOW()
);

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify the profile was created
SELECT * FROM profiles WHERE id = '4cc2784a-a397-47de-8197-1544ac2f471a'; 
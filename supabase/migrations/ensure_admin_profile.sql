-- Temporarily disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Insert or update the admin profile
INSERT INTO profiles (
    id,
    email,
    role,
    permissions
)
VALUES (
    '4cc2784a-a397-47de-8197-1544ac2f471a',  -- Admin ID from error
    'applegraphicshyd@gmail.com',             -- Admin email
    'admin',
    jsonb_build_object(
        'createBooking', true,
        'viewBookings', true,
        'uploadDocuments', true,
        'viewDocuments', true,
        'managePayments', true,
        'accessReports', true
    )
)
ON CONFLICT (id) DO UPDATE
SET 
    role = 'admin',
    permissions = jsonb_build_object(
        'createBooking', true,
        'viewBookings', true,
        'uploadDocuments', true,
        'viewDocuments', true,
        'managePayments', true,
        'accessReports', true
    );

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; 
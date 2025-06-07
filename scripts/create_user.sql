-- Function to create a new user with profile
CREATE OR REPLACE FUNCTION create_new_user(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'worker',
    p_permissions JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_default_permissions JSONB;
BEGIN
    -- Set default permissions if none provided
    v_default_permissions := CASE
        WHEN p_role = 'admin' THEN
            jsonb_build_object(
                'createBooking', true,
                'viewBookings', true,
                'managePayments', true,
                'accessReports', true
            )
        ELSE
            jsonb_build_object(
                'createBooking', false,
                'viewBookings', true,
                'managePayments', false,
                'accessReports', false
            )
    END;

    -- Create user in auth.users
    v_user_id := (
        SELECT id FROM auth.users
        WHERE email = p_email
        UNION ALL
        SELECT auth.sign_up(p_email, p_password)::uuid
        LIMIT 1
    );

    -- Create or update profile
    INSERT INTO public.profiles (id, email, role, permissions)
    VALUES (
        v_user_id,
        p_email,
        p_role,
        COALESCE(p_permissions, v_default_permissions)
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        updated_at = now();

    -- Confirm the email
    UPDATE auth.users
    SET email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN v_user_id;
END;
$$;

-- Example usage:
-- SELECT create_new_user('newadmin@example.com', 'strong_password', 'admin');
-- SELECT create_new_user('newworker@example.com', 'strong_password', 'worker'); 
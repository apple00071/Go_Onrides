•	# GoonRiders System Implementation Guide

This document provides instructions for implementing the pending features and fixes to complete your vehicle rental management system.

## 1. Database Migrations

### Step 1: Apply the notifications table migration
Run the following SQL in your Supabase SQL editor:

```sql
-- Create notifications table for system events
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_link TEXT,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for quick access to user-specific notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_notification_timestamp
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notification_timestamp();

-- Create RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for accessing notifications
CREATE POLICY "Allow users to see their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy for updating own notifications (e.g., marking as read)
CREATE POLICY "Allow users to update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
```

### Step 2: Add created_by column to bookings table
Run the following SQL in your Supabase SQL editor:

```sql
-- Add created_by column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add index on created_by column for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON public.bookings(created_by);
```

### Step 3: Create user logs table
Run the following SQL in your Supabase SQL editor:

```sql
-- Create user logs table to track all activities
CREATE TABLE IF NOT EXISTS public.user_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('login', 'logout', 'create', 'update', 'delete')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'booking', 'customer', 'payment', 'document', 'vehicle')),
    entity_id TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_email TEXT
);

-- Create indexes for faster queries
CREATE INDEX idx_user_logs_user_id ON public.user_logs(user_id);
CREATE INDEX idx_user_logs_action_type ON public.user_logs(action_type);
CREATE INDEX idx_user_logs_entity_type ON public.user_logs(entity_type);
CREATE INDEX idx_user_logs_created_at ON public.user_logs(created_at);

-- Create a function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action_type TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_user_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.user_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        details,
        user_email
    ) VALUES (
        p_user_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_details,
        p_user_email
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
```

## 2. System Setup

After applying the database migrations, you'll need to:

1. Restart your application to make sure it picks up the new database tables and columns
2. Navigate to the dashboard as an admin to verify everything is working correctly

## 3. User Management Logs

The user activity logs will now be visible in the Settings page. This tracks actions taken by users including:

- Creating bookings
- Updating customer information
- Processing payments
- Admin actions

## 4. Reports Data Consistency

The reports page has been updated to:

1. Fix the "undefined" issue in vehicle utilization charts
2. Make the data consistent between dashboard and reports
3. Add placeholder for the staff performance metrics until we gather real data

## 5. Permission-Based Access Control

The system now has improved permission controls:

1. User roles (admin/worker) determine access to specific features
2. Permission badges are displayed in the User Management screen
3. Permission checks are enforced throughout the application

## 6. Notifications System

The notifications table now exists and will store:

1. Booking updates
2. Payment confirmations
3. Document uploads
4. System alerts

## Future Enhancements

Consider implementing the following enhancements in the future:

1. Complete staff performance tracking using the created_by column
2. Enhanced audit logs with more details
3. Automated reports scheduled via email
4. Mobile responsive design improvements
5. Customer self-service portal 
-- Add new columns to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS data JSONB,
ADD COLUMN IF NOT EXISTS target_roles TEXT[],
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);

-- Update RLS policies
DROP POLICY IF EXISTS "Allow users to see their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow users to update their own notifications" ON notifications;

-- Create new policies
CREATE POLICY "Allow users to see notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text = ANY(notifications.target_roles)
  )
);

CREATE POLICY "Allow users to update notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Allow users to create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text = 'admin'
  )
); 
-- Add created_by column to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);

-- Add comment for documentation
COMMENT ON COLUMN notifications.created_by IS 'References the user who created the notification'; 
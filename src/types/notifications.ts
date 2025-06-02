export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  action_link?: string | null;
  reference_type: string;
  reference_id: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  unread: number;
  limit: number;
  page: number;
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  actionLink?: string;
  referenceType: string;
  referenceId: string;
  targetRoles?: string[];
  targetUserIds?: string[];
}

export const NotificationTypes = {
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_UPDATED: 'BOOKING_UPDATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_EXTENDED: 'BOOKING_EXTENDED',
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  CUSTOMER_CREATED: 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
} as const;

export type NotificationType = keyof typeof NotificationTypes; 
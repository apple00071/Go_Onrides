import { getSupabaseClient } from './supabase';
import { 
  NotificationTypes, 
  CreateNotificationPayload,
  Notification,
  NotificationsResponse
} from '@/types/notifications';

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(
  options: { 
    unreadOnly?: boolean;
    limit?: number;
    page?: number;
  } = {}
): Promise<NotificationsResponse> {
  const { unreadOnly = false, limit = 50, page = 0 } = options;
  const supabase = getSupabaseClient();
  
  const params = new URLSearchParams({
    unread: unreadOnly.toString(),
    limit: limit.toString(),
    page: page.toString()
  });
  
  const response = await fetch(`/api/notifications?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch notifications');
  }
  
  return response.json();
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
  options: { 
    ids?: string[];
    markAll?: boolean;
  }
): Promise<void> {
  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to mark notifications as read');
  }
}

/**
 * Create a notification for a booking event
 * @param type The type of booking event
 * @param bookingId The ID of the booking
 * @param details Additional details for the notification
 */
export async function notifyBookingEvent(
  type: 'BOOKING_CREATED' | 'BOOKING_UPDATED' | 'BOOKING_CANCELLED' | 'BOOKING_EXTENDED',
  bookingId: string,
  details: {
    customerName?: string;
    bookingId: string;
    actionBy: string;
    vehicleInfo?: string;
    previousEndDate?: string;
    newEndDate?: string;
    additionalAmount?: string;
  }
) {
  const title = getBookingEventTitle(type, details);
  const message = getBookingEventMessage(type, details);
  
  const payload: CreateNotificationPayload = {
    title,
    message,
    actionLink: `/dashboard/bookings/${bookingId}`,
    referenceType: type,
    referenceId: bookingId,
    targetRoles: ['admin']
  };
  
  return createNotification(payload);
}

/**
 * Create a notification for a customer event
 * @param type The type of customer event
 * @param customerId The ID of the customer
 * @param details Additional details for the notification
 */
export async function notifyCustomerEvent(
  type: 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED',
  customerId: string,
  details: {
    customerName: string;
    actionBy: string;
  }
) {
  const title = getCustomerEventTitle(type, details);
  const message = getCustomerEventMessage(type, details);
  
  const payload: CreateNotificationPayload = {
    title,
    message,
    actionLink: `/dashboard/customers/${customerId}`,
    referenceType: type,
    referenceId: customerId,
    targetRoles: ['admin']
  };
  
  return createNotification(payload);
}

/**
 * Create a notification for a payment event
 * @param type The type of payment event
 * @param paymentId The ID of the payment
 * @param details Additional details for the notification
 */
export async function notifyPaymentEvent(
  type: 'PAYMENT_CREATED' | 'PAYMENT_UPDATED',
  paymentId: string,
  details: {
    amount: number;
    bookingId: string;
    customerName: string;
    actionBy: string;
  }
) {
  const title = getPaymentEventTitle(type, details);
  const message = getPaymentEventMessage(type, details);
  
  const payload: CreateNotificationPayload = {
    title,
    message,
    actionLink: `/dashboard/payments`,
    referenceType: type,
    referenceId: paymentId,
    targetRoles: ['admin']
  };
  
  return createNotification(payload);
}

/**
 * Create a notification for admins about a document upload
 */
export async function notifyDocumentUploaded(
  documentId: string,
  details: {
    documentType: string;
    customerName: string;
    bookingId?: string;
    actionBy: string;
  }
) {
  // Only create notifications for admin users
  const targetRoles = ['admin'];
  
  const title = 'Document Uploaded';
  const message = `A new ${details.documentType} document has been uploaded for ${details.customerName} by ${details.actionBy}`;
  const actionLink = details.bookingId ? `/dashboard/bookings/${details.bookingId}` : undefined;
  
  return createNotification({
    title,
    message,
    actionLink,
    referenceType: NotificationTypes.DOCUMENT_UPLOADED,
    referenceId: documentId,
    targetRoles
  });
}

/**
 * Base function to create a notification
 */
async function createNotification(payload: CreateNotificationPayload): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create notification');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return false;
  }
}

// Helper functions for generating notification content

function getBookingEventTitle(
  type: 'BOOKING_CREATED' | 'BOOKING_UPDATED' | 'BOOKING_CANCELLED' | 'BOOKING_EXTENDED',
  details: { 
    customerName?: string; 
    bookingId: string;
    previousEndDate?: string;
    newEndDate?: string;
  }
) {
  switch (type) {
    case 'BOOKING_CREATED':
      return `New Booking Created: ${details.bookingId}`;
    case 'BOOKING_UPDATED':
      return `Booking Updated: ${details.bookingId}`;
    case 'BOOKING_CANCELLED':
      return `Booking Cancelled: ${details.bookingId}`;
    case 'BOOKING_EXTENDED':
      return `Booking Extended: ${details.bookingId}`;
    default:
      return 'Booking Update';
  }
}

function getBookingEventMessage(
  type: 'BOOKING_CREATED' | 'BOOKING_UPDATED' | 'BOOKING_CANCELLED' | 'BOOKING_EXTENDED',
  details: {
    customerName?: string;
    bookingId: string;
    actionBy: string;
    vehicleInfo?: string;
    previousEndDate?: string;
    newEndDate?: string;
    additionalAmount?: string;
  }
) {
  switch (type) {
    case 'BOOKING_CREATED':
      return `A new booking (${details.bookingId}) has been created for ${details.customerName} for vehicle ${details.vehicleInfo} by ${details.actionBy}`;
    case 'BOOKING_UPDATED':
      return `Booking ${details.bookingId} for ${details.customerName} has been updated by ${details.actionBy}`;
    case 'BOOKING_CANCELLED':
      return `Booking ${details.bookingId} for ${details.customerName} has been cancelled by ${details.actionBy}`;
    case 'BOOKING_EXTENDED':
      return `Booking ${details.bookingId} has been extended from ${details.previousEndDate} to ${details.newEndDate} with additional amount ${details.additionalAmount || '0'} by ${details.actionBy}`;
    default:
      return `Booking ${details.bookingId} has been modified`;
  }
}

function getCustomerEventTitle(
  type: 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED',
  details: { customerName: string }
) {
  switch (type) {
    case 'CUSTOMER_CREATED':
      return `New Customer Added: ${details.customerName}`;
    case 'CUSTOMER_UPDATED':
      return `Customer Updated: ${details.customerName}`;
    default:
      return 'Customer Update';
  }
}

function getCustomerEventMessage(
  type: 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED',
  details: { customerName: string; actionBy: string }
) {
  switch (type) {
    case 'CUSTOMER_CREATED':
      return `A new customer ${details.customerName} has been added by ${details.actionBy}`;
    case 'CUSTOMER_UPDATED':
      return `Customer ${details.customerName}'s information has been updated by ${details.actionBy}`;
    default:
      return `Customer ${details.customerName}'s information has been modified`;
  }
}

function getPaymentEventTitle(
  type: 'PAYMENT_CREATED' | 'PAYMENT_UPDATED',
  details: { amount: number; bookingId: string }
) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(details.amount);
  
  switch (type) {
    case 'PAYMENT_CREATED':
      return `New Payment: ${formattedAmount} for Booking ${details.bookingId}`;
    case 'PAYMENT_UPDATED':
      return `Payment Updated: ${formattedAmount} for Booking ${details.bookingId}`;
    default:
      return 'Payment Update';
  }
}

function getPaymentEventMessage(
  type: 'PAYMENT_CREATED' | 'PAYMENT_UPDATED',
  details: {
    amount: number;
    bookingId: string;
    customerName: string;
    actionBy: string;
  }
) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(details.amount);
  
  switch (type) {
    case 'PAYMENT_CREATED':
      return `A new payment of ${formattedAmount} has been recorded for booking ${details.bookingId} (${details.customerName}) by ${details.actionBy}`;
    case 'PAYMENT_UPDATED':
      return `A payment of ${formattedAmount} for booking ${details.bookingId} (${details.customerName}) has been updated by ${details.actionBy}`;
    default:
      return `A payment for booking ${details.bookingId} has been modified`;
  }
} 
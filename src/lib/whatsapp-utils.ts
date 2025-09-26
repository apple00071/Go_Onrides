import WhatsAppService from './whatsapp-service';

/**
 * Utility functions for WhatsApp messaging
 */

/**
 * Send OTP via WhatsApp
 */
export async function sendWhatsAppOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    await WhatsAppService.sendOTP(phoneNumber, otp);
    return { success: true };
  } catch (error) {
    console.error('Error sending WhatsApp OTP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send OTP'
    };
  }
}

/**
 * Send booking confirmation via WhatsApp
 */
export async function sendBookingConfirmation(
  phoneNumber: string,
  bookingDetails: {
    bookingId: string;
    pickupLocation: string;
    dropLocation: string;
    scheduledTime: string;
    vehicleType?: string;
    bookingAmount?: string;
    securityDeposit?: string;
    totalAmount?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await WhatsAppService.sendBookingConfirmation(phoneNumber, bookingDetails);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send booking confirmation'
    };
  }
}

/**
 * Send pickup reminder via WhatsApp
 */
export async function sendPickupReminder(
  phoneNumber: string,
  rentalDetails: {
    bookingId: string;
    pickupTime: string;
    pickupLocation: string;
    vehicleModel: string;
    registrationNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await WhatsAppService.sendPickupReminder(phoneNumber, rentalDetails);
    return { success: true };
  } catch (error) {
    console.error('Error sending pickup reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send pickup reminder'
    };
  }
}

/**
 * Send return reminder via WhatsApp
 */
export async function sendReturnReminder(
  phoneNumber: string,
  rentalDetails: {
    bookingId: string;
    returnTime: string;
    returnLocation: string;
    vehicleModel: string;
    registrationNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await WhatsAppService.sendReturnReminder(phoneNumber, rentalDetails);
    return { success: true };
  } catch (error) {
    console.error('Error sending return reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send return reminder'
    };
  }
}

/**
 * Send trip completion notification via WhatsApp
 */
export async function sendTripCompletion(
  phoneNumber: string,
  tripDetails: {
    totalFare: number;
    distance: string;
    duration: string;
    paymentMethod: string;
    bookingId?: string;
    vehicleModel?: string;
    registrationNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await WhatsAppService.sendTripCompletion(phoneNumber, tripDetails);
    return { success: true };
  } catch (error) {
    console.error('Error sending trip completion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send trip completion'
    };
  }
}

/**
 * Send promotional message via WhatsApp
 */
export async function sendPromotion(
  phoneNumber: string,
  promotion: {
    title: string;
    description: string;
    code?: string;
    validUntil: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await WhatsAppService.sendPromotion(phoneNumber, promotion);
    return { success: true };
  } catch (error) {
    console.error('Error sending promotion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send promotion'
    };
  }
}

/**
 * Send custom message via WhatsApp
 */
export async function sendCustomMessage(
  phoneNumber: string,
  message: string,
  type: 'text' | 'image' | 'document' = 'text',
  mediaUrl?: string,
  filename?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await WhatsAppService.sendMessage({
      to: phoneNumber,
      message,
      type,
      mediaUrl,
      filename
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending custom message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send custom message'
    };
  }
}

/**
 * Validate and format phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  return WhatsAppService.formatPhoneNumber(phoneNumber);
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  return WhatsAppService.validatePhoneNumber(phoneNumber);
}

/**
 * Generate OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  return otp;
}

/**
 * Format currency for WhatsApp messages
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Format date and time for WhatsApp messages
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Create booking confirmation message template
 */
export function createBookingConfirmationMessage(bookingDetails: {
  bookingId: string;
  pickupLocation: string;
  dropLocation: string;
  scheduledTime: string;
  vehicleType?: string;
  bookingAmount?: string;
  securityDeposit?: string;
  totalAmount?: string;
}): string {
  return `🎉 *BOOKING CONFIRMED!*

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Booking ID:* ${bookingDetails.bookingId}
🚗 *Vehicle:* ${bookingDetails.vehicleType || 'Vehicle details will be shared'}
⏰ *Pickup:* ${bookingDetails.scheduledTime}

💰 *Payment Details:*
• Booking Amount: ₹${bookingDetails.bookingAmount || 'TBD'}
• Security Deposit: ₹${bookingDetails.securityDeposit || 'TBD'}
• Total Amount: ₹${bookingDetails.totalAmount || 'TBD'}

📍 *Pickup Location:* ${bookingDetails.pickupLocation}
📍 *Return Location:* ${bookingDetails.dropLocation}

✅ *Next Steps:*
• Arrive 15 minutes early
• Bring valid driving license
• Check vehicle condition
• Note fuel level on pickup

🆘 *Emergency:* Call +91-8247494622

Thank you for choosing Go-On Rides!
Safe travels! 🛣️✨`;
}

/**
 * Create pickup reminder message template
 */
export function createPickupReminderMessage(rentalDetails: {
  bookingId: string;
  pickupTime: string;
  pickupLocation: string;
  vehicleModel: string;
  registrationNumber?: string;
}): string {
  return `⏰ *PICKUP REMINDER*

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Booking ID:* ${rentalDetails.bookingId}
🚗 *Vehicle:* ${rentalDetails.vehicleModel}
${rentalDetails.registrationNumber ? `🔢 *Reg. No:* ${rentalDetails.registrationNumber}` : ''}
⏰ *Pickup Time:* ${rentalDetails.pickupTime}

📍 *Location:* ${rentalDetails.pickupLocation}

⚠️ *Important Reminders:*
• Arrive 15 minutes early
• Bring valid driving license
• Bring original Aadhar card
• Check vehicle condition
• Note current fuel level
• Take photos of any existing damage

🆘 *Need Help?* Call +91-8247494622

Ready for your journey?
Go-On Rides awaits! 🏍️🚗`;
}

/**
 * Create return reminder message template
 */
export function createReturnReminderMessage(rentalDetails: {
  bookingId: string;
  returnTime: string;
  returnLocation: string;
  vehicleModel: string;
  registrationNumber?: string;
}): string {
  return `⏰ *RETURN REMINDER*

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Booking ID:* ${rentalDetails.bookingId}
🚗 *Vehicle:* ${rentalDetails.vehicleModel}
${rentalDetails.registrationNumber ? `🔢 *Reg. No:* ${rentalDetails.registrationNumber}` : ''}
⏰ *Return Time:* ${rentalDetails.returnTime}

📍 *Return Location:* ${rentalDetails.returnLocation}

⚠️ *Before Returning:*
• Top up fuel to original level
• Remove personal belongings
• Check for any new damages
• Take final odometer reading
• Return all documents

🚫 *Late Return Policy:*
• ₹500/hour after grace period
• Maximum 3 hours grace period

🆘 *Running Late?* Call +91-8247494622

Thank you for riding with Go-On Rides!
Hope you had a great experience! 🌟`;
}

/**
 * Create trip completion message template
 */
export function createTripCompletionMessage(tripDetails: {
  totalFare: number;
  distance: string;
  duration: string;
  paymentMethod: string;
  bookingId?: string;
  vehicleModel?: string;
  registrationNumber?: string;
}): string {
  return `✅ *RENTAL COMPLETED!*

━━━━━━━━━━━━━━━━━━━━━━━━━
${tripDetails.bookingId ? `📋 *Booking ID:* ${tripDetails.bookingId}` : ''}
🚗 *Vehicle:* ${tripDetails.vehicleModel || 'Vehicle details'}
${tripDetails.registrationNumber ? `🔢 *Reg. No:* ${tripDetails.registrationNumber}` : ''}

📊 *Trip Summary:*
⏱️ *Duration:* ${tripDetails.duration}
📏 *Distance:* ${tripDetails.distance}
💰 *Total Amount:* ₹${tripDetails.totalFare}
💳 *Payment:* ${tripDetails.paymentMethod}

🎉 *Thank You!*
We hope you enjoyed your journey with Go-On Rides!

📝 *Feedback:*
Rate your experience and help us improve!

🔄 *Next Rental:*
Get 10% off on your next booking with code: GOR10

🆘 *Questions?* Call +91-8247494622

Drive safe! See you again soon! 🚗✨`;
}

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
 * Send booking processed notification via WhatsApp (when customer arrives and booking is created)
 */
export async function sendBookingProcessed(
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
    await WhatsAppService.sendBookingProcessed(phoneNumber, bookingDetails);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking processed notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send booking processed notification'
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
 * Format date and time for WhatsApp messages in DD/MM/YYYY 12-hour format
 */
export function formatWhatsAppDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';

  try {
    // Handle different input formats
    let date: Date;
    if (dateTimeStr.includes(' ')) {
      // Format: "YYYY-MM-DD HH:mm"
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      date = new Date(year, month - 1, day, hours, minutes);
    } else {
      // Try to parse as ISO string or other format
      date = new Date(dateTimeStr);
    }

    if (isNaN(date.getTime())) {
      return dateTimeStr; // Return original if parsing fails
    }

    // Format date as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    // Format time as 12-hour with AM/PM
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12

    return `${day}/${month}/${year} ${hours}:${minutes} ${period}`;
  } catch (error) {
    console.error('Error formatting date time:', error);
    return dateTimeStr; // Return original on error
  }
}

/**
 * Format date only for WhatsApp messages in DD/MM/YYYY format
 */
export function formatWhatsAppDate(dateStr: string): string {
  if (!dateStr) return '';

  try {
    let date: Date;
    if (dateStr.includes('-')) {
      // Format: "YYYY-MM-DD"
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
}

/**
 * Format time only for WhatsApp messages in 12-hour format
 */
export function formatWhatsAppTime(timeStr: string): string {
  if (!timeStr) return '';

  try {
    let hours: number, minutes: number;

    if (timeStr.includes(':')) {
      [hours, minutes] = timeStr.split(':').map(Number);
    } else {
      // If only hours, assume minutes are 0
      hours = parseInt(timeStr, 10);
      minutes = 0;
    }

    if (isNaN(hours) || isNaN(minutes)) {
      return timeStr;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return `${hours}:${formattedMinutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeStr;
  }
}

/**
 * Create booking confirmation message template
 */
export function createBookingConfirmationMessage(bookingDetails: {
  bookingId: string;
  pickupLocation: string;
  dropLocation: string;
  scheduledTime: string;
  dropoffTime?: string;
  vehicleType?: string;
  registrationNumber?: string;
  bookingAmount?: string;
  securityDeposit?: string;
  totalAmount?: string;
}): string {
  return `🛵 Go-On Rides – Booking Processed

🆔 Booking ID: ${bookingDetails.bookingId}
🚘 Vehicle: ${bookingDetails.vehicleType || 'Vehicle details will be shared'}
🔖 Reg. No.: ${bookingDetails.registrationNumber || 'TBD'}
📅 Pickup: ${formatWhatsAppDateTime(bookingDetails.scheduledTime)}
📅 Drop-off: ${bookingDetails.dropoffTime ? formatWhatsAppDateTime(bookingDetails.dropoffTime) : 'TBD'}
💰 Amount Collected: ₹${bookingDetails.totalAmount || 'TBD'} (₹${bookingDetails.bookingAmount || 'TBD'} booking + ₹${bookingDetails.securityDeposit || 'TBD'} security)

📌 Terms & Conditions:
• Carry a valid Driving License during the ride
• Fuel is not included in the booking amount
• Vehicle must be returned on time; late returns may attract extra charges
• Any damage or traffic fines will be deducted from the security deposit
• Please check vehicle condition before taking delivery
• Note fuel level and odometer reading

🙏 Thank you for choosing Go-On Rides! Have a safe ride.`;
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
⏰ *Pickup Time:* ${formatWhatsAppTime(rentalDetails.pickupTime)}

📍 *Location:* ${rentalDetails.pickupLocation}

⚠️ *Vehicle Handover Instructions:*
• Please complete document verification
• Check vehicle condition before taking
• Note current fuel level and odometer
• Take photos of any existing damage
• Ensure all documents are in order

🆘 *Need Help?* Call +91-8247494622

Your vehicle is ready for handover!
Go-On Rides team is waiting to serve you! 🏍️🚗`;
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
⏰ *Return Time:* ${formatWhatsAppTime(rentalDetails.returnTime)}

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

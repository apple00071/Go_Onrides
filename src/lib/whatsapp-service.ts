import axios from 'axios';

interface WhatsAppConfig {
  apiKey: string;
  baseUrl: string;
}

interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'image' | 'document';
  mediaUrl?: string;
  filename?: string;
}

class WhatsAppService {
  private config: WhatsAppConfig;

  constructor() {
    this.config = {
      apiKey: process.env.NEXT_PUBLIC_WASENDER_API_KEY || '',
      baseUrl: 'https://www.wasenderapi.com' // Correct WasenderAPI domain
    };
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(messageData: WhatsAppMessage): Promise<any> {
    try {
      // Validate API key
      if (!this.config.apiKey) {
        throw new Error('WhatsApp API key is not configured. Please check your environment variables.');
      }

      // Validate phone number
      if (!messageData.to) {
        throw new Error('Phone number is required');
      }

      const formattedPhone = this.formatPhoneNumber(messageData.to);
      if (!this.validatePhoneNumber(formattedPhone)) {
        throw new Error(`Invalid phone number format: ${messageData.to}. Expected format: 10 digits or 12 digits with country code.`);
      }

      // Keep the original message formatting for WhatsApp
      const message = messageData.message;

      console.log('Sending WhatsApp message to:', formattedPhone);
      console.log('Message:', message);

      // Use only the working WasenderAPI endpoint with correct Bearer authentication
      const url = `${this.config.baseUrl}/api/send-message`;

      console.log('Sending WhatsApp message to:', formattedPhone);
      console.log('Message:', message);

      // Use the correct authentication format that we know works
      const response = await axios.post(url,
        {
          to: formattedPhone,
          text: message
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      console.log('WhatsApp API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error;
        if (axiosError.response) {
          // Server responded with error status
          const errorMessage = axiosError.response.data?.message || axiosError.response.data?.error || axiosError.response.data?.error_description || 'API Error';
          console.error('API Error Response:', axiosError.response.data);
          console.error('API Error Status:', axiosError.response.status);
          console.error('API Error Headers:', axiosError.response.headers);
          throw new Error(`WhatsApp API Error: ${errorMessage} (Status: ${axiosError.response.status})`);
        } else if (axiosError.request) {
          // Request was made but no response received
          console.error('No response from WhatsApp API');
          console.error('Request details:', axiosError.request);
          throw new Error('WhatsApp API is not responding. Please check your internet connection.');
        } else {
          // Something else happened
          console.error('Request setup error:', axiosError.message);
          console.error('Request config:', axiosError.config);
          throw new Error(`Request Error: ${axiosError.message}`);
        }
      } else {
        // Non-Axios error
        console.error('Non-Axios error:', error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
        if (error instanceof Error) {
          console.error('Error stack:', error.stack);
        }
        throw new Error(`Failed to send WhatsApp message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Send OTP via WhatsApp
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<any> {
    const message = `Your OTP for Go Onrides verification is: ${otp}

Please use this code to verify your account. This code will expire in 10 minutes.

Thank you for choosing Go Onrides!`;

    return this.sendMessage({
      to: phoneNumber,
      message: message,
      type: 'text'
    });
  }

  /**
   * Format date and time for WhatsApp messages in DD/MM/YYYY 12-hour format
   */
  formatDateTime(dateTimeStr: string): string {
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
  formatDate(dateStr: string): string {
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
  formatTime(timeStr: string): string {
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
  async sendBookingProcessed(phoneNumber: string, bookingDetails: {
    bookingId: string;
    pickupLocation: string;
    dropLocation: string;
    scheduledTime: string;
    dropoffTime?: string;
    driverName?: string;
    vehicleType?: string;
    registrationNumber?: string;
    bookingAmount?: string;
    securityDeposit?: string;
    totalAmount?: string;
  }): Promise<any> {
    console.log('sendBookingProcessed called with phone number:', phoneNumber);

    // Professional booking processed message template
    const message = `🛵 Go-On Rides – Booking Processed

🆔 Booking ID: ${bookingDetails.bookingId}
🚘 Vehicle: ${bookingDetails.vehicleType || 'Vehicle details will be shared'}
🔖 Reg. No.: ${bookingDetails.registrationNumber || 'TBD'}
📅 Pickup: ${this.formatDateTime(bookingDetails.scheduledTime)}
📅 Drop-off: ${bookingDetails.dropoffTime ? this.formatDateTime(bookingDetails.dropoffTime) : 'TBD'}
💰 Amount Collected: ₹${bookingDetails.totalAmount || 'TBD'} (₹${bookingDetails.bookingAmount || 'TBD'} booking + ₹${bookingDetails.securityDeposit || 'TBD'} security)

📌 Terms & Conditions:
• Carry a valid Driving License during the ride
• Fuel is not included in the booking amount
• Vehicle must be returned on time; late returns may attract extra charges
• Any damage or traffic fines will be deducted from the security deposit
• Please check vehicle condition before taking delivery
• Note fuel level and odometer reading

🙏 Thank you for choosing Go-On Rides! Have a safe ride.`;

    console.log('Booking processed message:', message);

    return this.sendMessage({
      to: phoneNumber,
      message: message,
      type: 'text'
    });
  }

  /**
   * Send pickup reminder via WhatsApp
   */
  async sendPickupReminder(phoneNumber: string, rentalDetails: {
    bookingId: string;
    pickupTime: string;
    pickupLocation: string;
    vehicleModel: string;
    registrationNumber?: string;
  }): Promise<any> {
    const message = `⏰ *PICKUP REMINDER*

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Booking ID:* ${rentalDetails.bookingId}
🚗 *Vehicle:* ${rentalDetails.vehicleModel}
${rentalDetails.registrationNumber ? `🔢 *Reg. No:* ${rentalDetails.registrationNumber}` : ''}
⏰ *Pickup Time:* ${this.formatTime(rentalDetails.pickupTime)}

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

    return this.sendMessage({
      to: phoneNumber,
      message: message,
      type: 'text'
    });
  }

  /**
   * Send return reminder via WhatsApp
   */
  async sendReturnReminder(phoneNumber: string, rentalDetails: {
    bookingId: string;
    returnTime: string;
    returnLocation: string;
    vehicleModel: string;
    registrationNumber?: string;
  }): Promise<any> {
    const message = `⏰ *RETURN REMINDER*

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Booking ID:* ${rentalDetails.bookingId}
🚗 *Vehicle:* ${rentalDetails.vehicleModel}
${rentalDetails.registrationNumber ? `🔢 *Reg. No:* ${rentalDetails.registrationNumber}` : ''}
⏰ *Return Time:* ${this.formatTime(rentalDetails.returnTime)}

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

    return this.sendMessage({
      to: phoneNumber,
      message: message,
      type: 'text'
    });
  }

  /**
   * Send trip completion notification
   */
  async sendTripCompletion(phoneNumber: string, tripDetails: {
    totalFare: number;
    distance: string;
    duration: string;
    paymentMethod: string;
    bookingId?: string;
    vehicleModel?: string;
    registrationNumber?: string;
  }): Promise<any> {
    const message = `✅ *RENTAL COMPLETED!*

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

    return this.sendMessage({
      to: phoneNumber,
      message: message,
      type: 'text'
    });
  }

  /**
   * Send promotional message
   */
  async sendPromotion(phoneNumber: string, promotion: {
    title: string;
    description: string;
    code?: string;
    validUntil: string;
  }): Promise<any> {
    const message = `🎊 Special Offer!

${promotion.title}
${promotion.description}

${promotion.code ? `Use code: ${promotion.code}` : ''}
Valid until: ${this.formatDate(promotion.validUntil)}

Book now with Go Onrides!`;

    return this.sendMessage({
      to: phoneNumber,
      message: message,
      type: 'text'
    });
  }

  /**
   * Validate phone number format in E.164 format
   * Accepts: +919876543210, 919876543210, 9876543210
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters and any leading plus
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a 10-digit number (without country code)
    if (cleaned.length === 10) {
      return true;
    }
    
    // Check if it's a 12-digit number with country code (91 for India)
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return true;
    }
    
    // Check if it's a 13-digit number with +91 country code
    if (phoneNumber.startsWith('+91') && cleaned.length === 12) {
      return true;
    }
    
    return false;
  }

    /**
   * Format phone number for WhatsApp API in E.164 format
   * Example: +919876543210
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If it's a 10-digit number, add country code with plus sign
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }

    // If it already has country code but no plus, add it
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }

    // If it already has country code with plus, return as is
    if (phoneNumber.startsWith('+91') && cleaned.length === 12) {
      return phoneNumber;
    }

    // For any other format, just add the plus sign if missing
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; message?: string; messageId?: string }> {
    try {
      if (!this.config.apiKey) {
        return { success: false, error: 'WhatsApp API key is not configured. Please check your environment variables.' };
      }

      const testMessage = 'API Connection Test - Go-On Rides';
      const testNumber = '918247494622'; // Test number with country code

      console.log('Testing WhatsApp API connection...');
      
      try {
        const response = await this.sendMessage({
          to: testNumber,
          message: testMessage,
          type: 'text'
        });

        console.log('WhatsApp API response:', response);
        
        // If we get a response object, consider it a success
        if (response) {
          return {
            success: true,
            message: 'Test message sent successfully',
            messageId: response.data?.msgId || 'unknown'
          };
        }
        
        return {
          success: false,
          error: 'Unexpected response format from WhatsApp API'
        };
      } catch (error) {
        console.error('Test connection failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          success: false,
          error: `Failed to send test message: ${errorMessage}`
        };
      }
    } catch (error) {
      console.error('Unexpected error in testConnection:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while testing the WhatsApp API connection'
      };
    }
  }
}

export default new WhatsAppService();

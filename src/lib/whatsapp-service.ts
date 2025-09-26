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

  /**
   * Clean message content by removing problematic characters and formatting
   */
  private cleanMessageContent(message: string): string {
    // Replace newlines with spaces and trim extra whitespace
    return message
      .replace(/\n/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  constructor() {
    this.config = {
      apiKey: process.env.WASENDER_API_KEY || '',
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

      // Clean the message content
      const cleanMessage = this.cleanMessageContent(messageData.message);

      console.log('Sending WhatsApp message to:', formattedPhone);
      console.log('Cleaned message:', cleanMessage);

      // Try different authentication methods and endpoints
      let response;
      const endpoints = [
        `${this.config.baseUrl}/api/send-message`,
        `${this.config.baseUrl}/send-message`,
        `${this.config.baseUrl}/v1/send-message`
      ];

      for (const endpoint of endpoints) {
        try {
          // Method 1: Bearer token in header (correct WasenderAPI format)
          console.log(`Trying endpoint: ${endpoint} with Bearer token auth`);
          response = await axios.post(endpoint, {
            to: formattedPhone,
            text: cleanMessage, // Use cleaned message
            type: messageData.type || 'text'
          }, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          console.log(`Success with ${endpoint} and Bearer token auth`);
          break;
        } catch (headerError) {
          try {
            console.log(`Bearer token failed, trying ${endpoint} with API key header`);
            // Method 2: API key as plain header
            response = await axios.post(endpoint, {
              to: formattedPhone,
              text: cleanMessage,
              type: messageData.type || 'text'
            }, {
              headers: {
                'X-API-Key': this.config.apiKey,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });
            console.log(`Success with ${endpoint} and API key header`);
            break;
          } catch (apiKeyHeaderError) {
            try {
              console.log(`API key header failed, trying ${endpoint} with body auth`);
              // Method 3: API key in body (legacy method)
              response = await axios.post(endpoint, {
                to: formattedPhone,
                text: cleanMessage,
                type: messageData.type || 'text',
                api_key: this.config.apiKey
              }, {
                headers: {
                  'Content-Type': 'application/json'
                },
                timeout: 10000
              });
              console.log(`Success with ${endpoint} and body auth`);
              break;
            } catch (bodyError) {
              console.log(`All auth methods failed for ${endpoint}, trying next endpoint...`);
              continue;
            }
          }
        }
      }

      if (!response) {
        throw new Error('All API endpoints and authentication methods failed');
      }

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
   * Send booking confirmation via WhatsApp
   */
  async sendBookingConfirmation(phoneNumber: string, bookingDetails: {
    bookingId: string;
    pickupLocation: string;
    dropLocation: string;
    scheduledTime: string;
    driverName?: string;
    vehicleType?: string;
    bookingAmount?: string;
    securityDeposit?: string;
    totalAmount?: string;
  }): Promise<any> {
    // Simplified message format without emojis and special characters
    const message = `BOOKING CONFIRMED! Booking ID: ${bookingDetails.bookingId}. Vehicle: ${bookingDetails.vehicleType || 'Vehicle details will be shared'}. ` +
      `Pickup: ${bookingDetails.scheduledTime}. ` +
      `Location: ${bookingDetails.pickupLocation}. ` +
      `Total Amount: Rs.${bookingDetails.totalAmount || 'TBD'} (Booking: Rs.${bookingDetails.bookingAmount || 'TBD'} + Security: Rs.${bookingDetails.securityDeposit || 'TBD'}). ` +
      `Please arrive 15 minutes early with your driving license. Thank you for choosing Go-On Rides!`;

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
Valid until: ${promotion.validUntil}

Book now with Go Onrides!`;

    return this.sendMessage({
      to: phoneNumber,
      message: message,
      type: 'text'
    });
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check if it starts with country code (assuming India)
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return true;
    }

    // Check if it's a 10-digit number (without country code)
    if (cleaned.length === 10) {
      return true;
    }

    return false;
  }

  /**
   * Format phone number for WhatsApp API
   */
  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If it's a 10-digit number, add country code
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }

    // If it already has country code, return as is
    return cleaned;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.apiKey) {
        return { success: false, error: 'API key not configured' };
      }

      // Simple test message
      const testMessage = 'API Connection Test - Go-On Rides';

      const payload = {
        to: '918247494622', // Test with your own number
        text: testMessage  // WasenderAPI uses 'text' not 'message'
      };

      // Try different authentication methods and endpoints
      let response;
      const endpoints = [
        `${this.config.baseUrl}/api/send-message`, // Correct WasenderAPI endpoint
        `${this.config.baseUrl}/send-message`,
        `${this.config.baseUrl}/v1/send-message`
      ];

      for (const endpoint of endpoints) {
        try {
          // Method 1: Bearer token in header (correct WasenderAPI format)
          console.log(`Testing endpoint: ${endpoint} with Bearer token auth`);
          response = await axios.post(endpoint, payload, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          console.log(`Test successful with ${endpoint} and Bearer token auth`);
          break;
        } catch (headerError) {
          try {
            console.log(`Bearer token failed, trying ${endpoint} with API key header`);
            // Method 2: API key as plain header
            response = await axios.post(endpoint, payload, {
              headers: {
                'X-API-Key': this.config.apiKey,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });
            console.log(`Test successful with ${endpoint} and API key header`);
            break;
          } catch (apiKeyHeaderError) {
            try {
              console.log(`API key header failed, trying ${endpoint} with body auth`);
              // Method 3: API key in body (legacy method)
              response = await axios.post(endpoint, {
                ...payload,
                api_key: this.config.apiKey
              }, {
                headers: {
                  'Content-Type': 'application/json'
                },
                timeout: 10000
              });
              console.log(`Test successful with ${endpoint} and body auth`);
              break;
            } catch (bodyError) {
              console.log(`All auth methods failed for ${endpoint}, trying next endpoint...`);
              continue;
            }
          }
        }
      }

      if (!response) {
        throw new Error('All API endpoints and authentication methods failed');
      }

      console.log('API connection test successful:', response.data);
      return { success: true };
    } catch (error) {
      console.error('API connection test failed:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Test API Error Response:', error.response.data);
          console.error('Test API Error Status:', error.response.status);
          console.error('Test API Error Headers:', error.response.headers);
          return {
            success: false,
            error: `API Error: ${error.response.data?.message || error.response.data?.error || error.response.data?.error_description || 'Unknown error'} (Status: ${error.response.status})`
          };
        } else if (error.request) {
          console.error('No response from test API');
          return { success: false, error: 'API not responding. Check internet connection.' };
        } else {
          console.error('Test request setup error:', error.message);
          return { success: false, error: `Request error: ${error.message}` };
        }
      }
      console.error('Non-Axios test error:', error);
      return { success: false, error: 'Unknown error occurred' };
    }
  }
}

export default new WhatsAppService();

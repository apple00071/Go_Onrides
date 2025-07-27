import { useState, useEffect } from 'react';
import { RecaptchaVerifier, PhoneAuthProvider, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface OTPVerificationProps {
  phoneNumber: string;
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
}

export default function OTPVerification({ phoneNumber, onSuccess, onFailure }: OTPVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Initialize reCAPTCHA when component mounts
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  }, []);

  // Format phone number to ensure it's valid for India
  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Remove leading 91 or +91 if present
    const withoutCode = cleaned.replace(/^91/, '');
    // Ensure it's 10 digits
    if (withoutCode.length !== 10) {
      return null;
    }
    return `+91${withoutCode}`;
  };

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      setOtpSent(false);
      setOtpValue('');
      setVerificationId('');
      setErrorMessage(null);

      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      console.log('Sending OTP to:', formattedPhone);

      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setVerificationId(confirmationResult.verificationId);
      setOtpSent(true);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error sending OTP:', error);
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      setErrorMessage(message);
      onFailure(error);
      setOtpSent(false);

      // Reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      if (!otpValue || otpValue.length !== 6) {
        throw new Error('Please enter a valid 6-digit OTP');
      }

      if (!verificationId) {
        throw new Error('Invalid session. Please request a new OTP');
      }

      const credential = PhoneAuthProvider.credential(verificationId, otpValue);
      await auth.signInWithCredential(credential);

      // Immediately sign out since we don't need the auth state
      await auth.signOut();

      onSuccess({ verified: true });
      setErrorMessage(null);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const message = error instanceof Error ? error.message : 'Failed to verify OTP';
      setErrorMessage(message);
      onFailure(error);
    } finally {
      setLoading(false);
    }
  };

  // Only render if we have a valid phone number
  const formattedPhone = formatPhoneNumber(phoneNumber)?.substring(3); // Remove +91 for display
  if (!formattedPhone) {
    return (
      <p className="text-sm text-yellow-600">
        Please enter a valid 10-digit phone number to proceed with verification.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div id="recaptcha-container"></div>

      {!otpSent ? (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            We'll send a verification code to: +91 {formattedPhone}
          </p>
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {loading ? 'Sending...' : 'Send OTP via SMS'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mt-1">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Enter the 6-digit OTP sent to your mobile number
            </label>
            <input
              type="text"
              id="otp"
              maxLength={6}
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit OTP"
              className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleVerifyOTP}
              disabled={loading || otpValue.length !== 6}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Resend OTP
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
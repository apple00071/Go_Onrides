import { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface OTPVerificationProps {
  phoneNumber: string;
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
}

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
    confirmationResult: ConfirmationResult | null;
  }
}

export default function OTPVerification({ phoneNumber, onSuccess, onFailure }: OTPVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Format phone number to ensure it's valid for India
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const withoutCode = cleaned.replace(/^91/, '');
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
      setErrorMessage(null);

      const formattedPhone = formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      console.log('Sending OTP to:', formattedPhone);

      // Clear existing reCAPTCHA if any
      if (window.recaptchaVerifier) {
        await window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      // Create new reCAPTCHA verifier
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          setErrorMessage('Verification expired. Please try again.');
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        }
      });

      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      
      setOtpSent(true);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error sending OTP:', error);
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      setErrorMessage(message);
      onFailure(error);
      setOtpSent(false);

      // Cleanup on error
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

      if (!window.confirmationResult) {
        throw new Error('Please request a new OTP');
      }

      const result = await window.confirmationResult.confirm(otpValue);
      await auth.signOut();
      onSuccess({ verified: true, user: result.user });
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

  const formattedPhone = formatPhoneNumber(phoneNumber)?.substring(3);
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

      <div id="recaptcha-container" className="hidden"></div>

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
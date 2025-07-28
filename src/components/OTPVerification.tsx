import { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

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
  const [isVerified, setIsVerified] = useState(false);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phoneNumber);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Cleanup reCAPTCHA on unmount and when retry count changes
  useEffect(() => {
    const cleanup = () => {
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
        // Remove all existing reCAPTCHA iframes
        const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
        iframes.forEach(iframe => iframe.remove());
        // Clear reCAPTCHA containers
        const containers = document.querySelectorAll('.recaptcha-container');
        containers.forEach(container => {
          if (container instanceof HTMLElement) {
            container.innerHTML = '';
          }
        });
      } catch (error) {
        console.error('Error cleaning up reCAPTCHA:', error);
      }
    };

    cleanup();
    return cleanup;
  }, [retryCount]);

  // Format phone number to ensure it's valid for India
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    // Remove any leading zeros
    const withoutLeadingZeros = cleaned.replace(/^0+/, '');
    // Remove country code if present
    const withoutCode = withoutLeadingZeros.replace(/^91/, '');
    if (withoutCode.length !== 10) {
      return null;
    }
    // Always add +91 prefix for India
    return `+91${withoutCode}`;
  };

  const setupRecaptcha = async () => {
    try {
      // Clean up any existing reCAPTCHA
      if (window.recaptchaVerifier) {
        await window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }

      // Remove any existing reCAPTCHA iframes
      const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
      iframes.forEach(iframe => iframe.remove());

      // Create new reCAPTCHA verifier with a unique container ID
      const containerId = `recaptcha-container-${retryCount}`;
      
      // Make sure the container exists and is empty
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error('reCAPTCHA container not found');
      }
      container.innerHTML = '';

      // Initialize reCAPTCHA with invisible configuration
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response: any) => {
          console.log('reCAPTCHA verified with response:', response);
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          setErrorMessage('Verification expired. Please try again.');
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
          setRetryCount(prev => prev + 1);
        }
      });

      // Wait for reCAPTCHA to be ready
      await window.recaptchaVerifier.render();
      return window.recaptchaVerifier;
    } catch (error) {
      console.error('Error setting up reCAPTCHA:', error);
      // If error is about already rendered, increment retry count to get a new container
      if (error instanceof Error && error.message.includes('already been rendered')) {
        setRetryCount(prev => prev + 1);
      }
      setErrorMessage('Error setting up verification. Please try again.');
      throw error;
    }
  };

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      setOtpSent(false);
      setOtpValue('');
      setErrorMessage(null);

      const formattedPhone = formatPhoneNumber(currentPhoneNumber);
      if (!formattedPhone) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      console.log('Attempting to send OTP to:', formattedPhone);

      // Setup reCAPTCHA first
      const verifier = await setupRecaptcha();
      if (!verifier) {
        throw new Error('Failed to initialize verification system');
      }

      try {
        // Add a small delay to ensure reCAPTCHA is ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        if (!confirmationResult) {
          throw new Error('Failed to send verification code');
        }
        window.confirmationResult = confirmationResult;
        setOtpSent(true);
        setErrorMessage(null);
        setShowPhoneInput(false);
      } catch (otpError: any) {
        console.error('OTP Send Error:', otpError);
        
        // Handle specific Firebase errors
        if (otpError?.code === 'auth/invalid-phone-number') {
          setErrorMessage('Please enter a valid phone number');
        } else if (otpError?.code === 'auth/captcha-check-failed') {
          setErrorMessage('Verification check failed. Please try again.');
          // Clear and retry reCAPTCHA
          try {
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
            }
          } catch (clearError) {
            console.error('Error clearing reCAPTCHA:', clearError);
          }
          setRetryCount(prev => prev + 1);
        } else if (otpError?.code === 'auth/too-many-requests') {
          setErrorMessage('Too many attempts. Please try again later or use a different number.');
          setShowPhoneInput(true);
        } else {
          setErrorMessage('Failed to send verification code. Please try again.');
        }
        throw otpError;
      }
    } catch (error: any) {
      console.error('Error in handleSendOTP:', error);
      if (!error.message.includes('Please try again')) {
        setErrorMessage('Failed to send verification code. Please try again.');
      }
      onFailure(error);
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
      setIsVerified(true);
      onSuccess({ verified: true, user: result.user });
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      // Handle specific Firebase errors
      if (error?.code === 'auth/invalid-verification-code') {
        setErrorMessage('Wrong OTP. Please try again.');
      } else if (error?.code === 'auth/code-expired') {
        setErrorMessage('OTP has expired. Please request a new one.');
      } else {
        const message = error instanceof Error ? error.message : 'Failed to verify OTP';
        setErrorMessage(message);
      }
      
      onFailure(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPhoneNumber(e.target.value);
  };

  if (isVerified) {
    return (
      <div className="rounded-md bg-green-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-800">
              Phone number verified successfully
            </p>
          </div>
        </div>
      </div>
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

      {/* Single reCAPTCHA container */}
      <div 
        id={`recaptcha-container-${retryCount}`} 
        className="recaptcha-container"
        style={{ display: 'inline-block', minWidth: '100px', minHeight: '50px' }}
      />

      {showPhoneInput && (
        <div className="mt-1">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Enter alternative phone number
          </label>
          <input
            type="tel"
            id="phone"
            value={currentPhoneNumber}
            onChange={handlePhoneChange}
            placeholder="Enter 10-digit mobile number"
            className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
        </div>
      )}

      {!otpSent ? (
        <div>
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
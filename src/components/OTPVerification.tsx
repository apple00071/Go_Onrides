import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface OTPVerificationProps {
  phoneNumber: string;
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
}

export default function OTPVerification({ phoneNumber, onSuccess, onFailure }: OTPVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phoneNumber);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [requestId, setRequestId] = useState<string>('');

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
    return withoutCode;
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

      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: formattedPhone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      if (data.success) {
        setOtpSent(true);
        setRequestId(data.request_id);
        setErrorMessage(null);
        setShowPhoneInput(false);
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error in handleSendOTP:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send OTP');
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

      if (!requestId) {
        throw new Error('Please request a new OTP');
      }

      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          otp: otpValue,
          request_id: requestId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      if (data.success) {
        setIsVerified(true);
        onSuccess({ verified: true });
        setErrorMessage(null);
      } else {
        throw new Error(data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify OTP');
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
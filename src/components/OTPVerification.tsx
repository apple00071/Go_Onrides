'use client';

import React, { useEffect } from 'react';

interface OTPVerificationResult {
  success: boolean;
  message?: string;
  request_id?: string;
}

interface OTPVerificationProps {
  phoneNumber: string;
  onSuccess: (data: OTPVerificationResult) => void;
  onFailure: (error: Error | string) => void;
}

// OTP is disabled: This component immediately reports success and renders nothing.
export default function OTPVerification({ onSuccess }: OTPVerificationProps) {
  useEffect(() => {
    try {
      onSuccess({ success: true, message: 'OTP verification bypassed', request_id: 'bypass' });
    } catch (_) {
      // no-op
    }
  }, [onSuccess]);

  return null;
}

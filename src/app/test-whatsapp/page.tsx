'use client';

import { useState } from 'react';

export default function TestWhatsApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('8247494622');

  const sendTestMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setResponse(null);

      const response = await fetch('/api/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber
        })
      });

      const data = await response.json();
      setResponse(data);

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send test message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Test WhatsApp Notification
          </h1>

          <div className="mb-4">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter phone number"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  {response && (
                    <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    {response?.message || 'Test message sent successfully!'}
                  </p>
                  {response && (
                    <pre className="mt-2 text-xs text-green-700 whitespace-pre-wrap">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={sendTestMessage}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {loading ? 'Sending...' : 'Send Test Message'}
          </button>
        </div>
      </div>
    </div>
  );
} 
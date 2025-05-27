'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FixAdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Checking admin status...');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fixAdmin = async () => {
      try {
        const response = await fetch('/api/fix-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fix admin profile');
        }

        setStatus('Admin profile fixed successfully! Redirecting...');
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
      } catch (error: unknown) {
        console.error('Error:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fixAdmin();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Fix Admin Profile
          </h2>
          {loading ? (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">{status}</p>
            </div>
          ) : error ? (
            <div className="mt-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-600">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
} 
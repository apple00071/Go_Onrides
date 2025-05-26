'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FixAdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Checking admin status...');

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
      } catch (error: any) {
        setStatus(`Error: ${error.message}`);
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
          <p className="mt-2 text-sm text-gray-600">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
} 
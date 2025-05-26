'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting to sign in...'); // Debug log
      
      // Sign in with password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError); // Debug log
        throw signInError;
      }

      console.log('Sign in successful:', data); // Debug log

      if (!data.session) {
        throw new Error('No session created');
      }

      // Fetch user profile to check role
      console.log('Fetching user profile...'); // Debug log
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError); // Debug log
        throw profileError;
      }

      if (!profile) {
        console.log('Creating new profile...'); // Debug log
        const defaultPermissions = {
          createBooking: false,
          viewBookings: true,
          uploadDocuments: false,
          viewDocuments: true,
          managePayments: false,
          accessReports: false
        };

        const { error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.session.user.id,
              email: data.session.user.email,
              role: 'worker',
              permissions: defaultPermissions
            }
          ]);

        if (createError) {
          console.error('Create profile error:', createError); // Debug log
          throw createError;
        }

        router.push('/dashboard');
        router.refresh();
        return;
      }

      console.log('Profile found:', profile); // Debug log

      // Redirect based on role
      const redirectPath = profile.role === 'admin' ? '/dashboard/settings' : '/dashboard';
      console.log('Redirecting to:', redirectPath); // Debug log
      router.push(redirectPath);
      router.refresh();
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      <div className="rounded-md shadow-sm -space-y-px">
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Email address"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
            placeholder="Password"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  );
} 
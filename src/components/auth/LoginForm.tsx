'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const LoginForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClientComponentClient();
      
      // First sign in the user
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (signInError) throw signInError;
      if (!authData?.session) throw new Error('No session created');

      // Then get the authenticated user data
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile) {
        // Create default profile for new users
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
          .insert([{
            id: user.id,
            email: user.email,
            role: 'worker',
            permissions: defaultPermissions
          }]);

        if (createError) throw createError;

        router.push('/dashboard');
        router.refresh();
        return;
      }

      // Redirect based on role
      const redirectPath = profile.role === 'admin' ? '/dashboard/settings' : '/dashboard';
      router.push(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      console.error('Login error:', err);
      let errorMessage = 'An error occurred during login';
      
      if (err instanceof Error) {
        if (err.message?.includes('rate limit') || err.message?.includes('Too Many Requests')) {
          errorMessage = 'Too many login attempts. Please try again in a moment.';
        } else if (err.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (err.message?.includes('No session created')) {
          errorMessage = 'Failed to create session. Please try again.';
        } else if (err.message?.includes('No authenticated user found')) {
          errorMessage = 'Authentication failed. Please try again.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
            value={formData.email}
            onChange={handleChange}
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
            value={formData.password}
            onChange={handleChange}
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
};

export default LoginForm; 
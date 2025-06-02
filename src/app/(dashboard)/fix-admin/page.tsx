'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function FixDatabasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  }>({});

  const runFix = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fix-admin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run database fix');
      }
      
      setResult({
        success: true,
        message: data.message || 'Database fixed successfully!'
      });
    } catch (error) {
      console.error('Fix error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run database fix'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Database className="h-6 w-6 text-blue-500 mr-2" />
          <h1 className="text-xl font-semibold text-gray-900">Database Fix Utility</h1>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            This utility will fix database issues by creating missing tables and applying required migrations.
          </p>
          <p className="text-sm text-red-600 font-medium">
            Note: This should only be run by administrators when instructed by the development team.
          </p>
        </div>

        {result.success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6 flex items-start">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-green-700">{result.message}</p>
          </div>
        )}

        {result.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-red-700">{result.error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={runFix}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Running Fix...' : 'Run Database Fix'}
          </button>
        </div>
      </div>
    </div>
  );
} 
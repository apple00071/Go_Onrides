'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface WorkerStats {
  assignedVehicles: number;
  completedInspections: number;
  pendingInspections: number;
  totalTasksCompleted: number;
}

export default function WorkerDashboardPage() {
  const [stats, setStats] = useState<WorkerStats>({
    assignedVehicles: 0,
    completedInspections: 0,
    pendingInspections: 0,
    totalTasksCompleted: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const fetchWorkerStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Fetch worker stats from your database
      // This is a placeholder - implement actual data fetching based on your schema
      const { data: workerData, error: statsError } = await supabase
        .from('worker_stats')
        .select('*')
        .eq('worker_id', user.id)
        .single();

      if (statsError) {
        // If the table doesn't exist yet, return default stats
        if (statsError.code === 'PGRST116') {
          setStats({
            assignedVehicles: 0,
            completedInspections: 0,
            pendingInspections: 0,
            totalTasksCompleted: 0
          });
          return;
        }
        throw statsError;
      }

      if (workerData) {
        setStats(workerData);
      }
    } catch (err) {
      console.error('Error fetching worker stats:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerStats();
  }, []);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Worker Dashboard</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchWorkerStats}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Assigned Vehicles */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 3h5v5M21 3l-7 7M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Assigned Vehicles</h2>
              <p className="text-2xl font-semibold text-gray-900">{stats.assignedVehicles}</p>
            </div>
          </div>
        </div>

        {/* Completed Inspections */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Completed Inspections</h2>
              <p className="text-2xl font-semibold text-gray-900">{stats.completedInspections}</p>
            </div>
          </div>
        </div>

        {/* Pending Inspections */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Pending Inspections</h2>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingInspections}</p>
            </div>
          </div>
        </div>

        {/* Total Tasks Completed */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total Tasks Completed</h2>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTasksCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for future components like task list, inspection schedule, etc. */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <p className="mt-2 text-gray-600">No recent activity to display.</p>
        </div>
      </div>
    </div>
  );
} 
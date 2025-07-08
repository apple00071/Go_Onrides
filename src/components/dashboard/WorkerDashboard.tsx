import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Clipboard, CheckCircle, Clock } from 'lucide-react';

interface WorkerStats {
  totalTasksCompleted: number;
}

export default function WorkerDashboard() {
  const [stats, setStats] = useState<WorkerStats>({
    totalTasksCompleted: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkerData();
  }, []);

  const fetchWorkerData = async () => {
    try {
      const supabase = getSupabaseClient();

      // Fetch worker stats
      const { data: statsData, error: statsError } = await supabase
        .from('worker_stats')
        .select('total_tasks_completed')
        .single();

      if (statsError) throw statsError;

      if (statsData) {
        setStats({
          totalTasksCompleted: statsData.total_tasks_completed || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching worker data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-600">Total Tasks Completed</h2>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTasksCompleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to your Dashboard</h2>
          <p className="text-gray-600">
            Your tasks and assignments will appear here when they are assigned to you.
          </p>
        </div>
      </div>
    </div>
  );
} 
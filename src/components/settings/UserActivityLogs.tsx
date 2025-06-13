'use client';

import { useState, useEffect } from 'react';
import { getUserLogs } from '@/lib/userActivity';
import { format } from 'date-fns';
import type { UserLog } from '@/types/database';
import { 
  Calendar,
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Clock,
  RotateCw
} from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from "react-day-picker";

export default function UserActivityLogs() {
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    actionType: '',
    entityType: '',
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined
    }
  });

  // Set default date range after initial render to avoid hydration mismatch
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date()
      }
    }));
  }, []);

  useEffect(() => {
    if (filters.dateRange.from && filters.dateRange.to) {
      fetchLogs();
    }
  }, [page, filters.actionType, filters.entityType]);

  // Separate effect for date range to avoid running on initial render
  useEffect(() => {
    if (filters.dateRange.from && filters.dateRange.to) {
      fetchLogs();
    }
  }, [filters.dateRange]);

  const fetchLogs = async () => {
    if (!filters.dateRange.from || !filters.dateRange.to) return;
    
    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * limit;
      const { logs: fetchedLogs, count } = await getUserLogs({
        actionType: filters.actionType ? (filters.actionType as UserLog['action_type']) : undefined,
        entityType: filters.entityType ? (filters.entityType as UserLog['entity_type']) : undefined,
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        limit,
        offset
      });

      setLogs(fetchedLogs);
      setTotalLogs(count);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to page 1 when filters change
  };

  const maxPages = Math.max(1, Math.ceil(totalLogs / limit));

  const getActionTypeBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-purple-100 text-purple-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeBadgeColor = (entityType: string) => {
    switch (entityType) {
      case 'user': return 'bg-indigo-100 text-indigo-800';
      case 'booking': return 'bg-blue-100 text-blue-800';
      case 'customer': return 'bg-cyan-100 text-cyan-800';
      case 'payment': return 'bg-green-100 text-green-800';
      case 'document': return 'bg-amber-100 text-amber-800';
      case 'vehicle': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityLink = (log: UserLog) => {
    switch (log.entity_type) {
      case 'user':
        return null; // Users don't have detail pages yet
      case 'booking':
        return `/dashboard/bookings/${log.entity_id}`;
      case 'customer':
        return `/dashboard/customers/${log.entity_id}`;
      case 'payment':
        return `/dashboard/payments`;
      case 'document':
        return null;
      case 'vehicle':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">User Activity Logs</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          <select
            name="actionType"
            value={filters.actionType}
            onChange={handleFilterChange}
            className="p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
          
          <select
            name="entityType"
            value={filters.entityType}
            onChange={handleFilterChange}
            className="p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Entities</option>
            <option value="user">User</option>
            <option value="booking">Booking</option>
            <option value="customer">Customer</option>
            <option value="payment">Payment</option>
            <option value="document">Document</option>
            <option value="vehicle">Vehicle</option>
          </select>
          
          {filters.dateRange.from && filters.dateRange.to && (
            <DatePickerWithRange
              date={filters.dateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setFilters(prev => ({
                    ...prev, 
                    dateRange: { 
                      from: range.from, 
                      to: range.to 
                    }
                  }));
                  setPage(1);
                }
              }}
            />
          )}
          
          <button
            onClick={fetchLogs}
            className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            title="Refresh"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
          <span className="text-red-600">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No activity logs found with the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => {
                const entityLink = getEntityLink(log);
                
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {format(new Date(log.created_at), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(log.created_at), 'hh:mm a')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.user_email || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionTypeBadgeColor(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEntityTypeBadgeColor(log.entity_type)}`}>
                        {log.entity_type}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {log.entity_id.length > 10 ? `${log.entity_id.substring(0, 10)}...` : log.entity_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {entityLink ? (
                        <a
                          href={entityLink}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View details
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {log.details && typeof log.details === 'object'
                            ? JSON.stringify(log.details).length > 50
                              ? `${JSON.stringify(log.details).substring(0, 50)}...`
                              : JSON.stringify(log.details)
                            : 'No details'
                          }
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
          <span className="font-medium">{Math.min(page * limit, totalLogs)}</span> of{' '}
          <span className="font-medium">{totalLogs}</span> results
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="p-2 rounded-md bg-white border disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm">
            Page {page} of {maxPages}
          </div>
          <button
            onClick={() => setPage(prev => Math.min(maxPages, prev + 1))}
            disabled={page === maxPages}
            className="p-2 rounded-md bg-white border disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 
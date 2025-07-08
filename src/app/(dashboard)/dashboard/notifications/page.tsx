'use client';

import { useState, useEffect } from 'react';
import { fetchNotifications, markNotificationsAsRead } from '@/lib/notification';
import { Notification } from '@/types/notifications';
import { formatDistanceToNow, format } from 'date-fns';
import { Bell, Check, CheckCheck, Search, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 20;

  // Load notifications on component mount and when filter/page changes
  useEffect(() => {
    loadNotifications();
  }, [currentPage, filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await fetchNotifications({ 
        unreadOnly: filter === 'unread', 
        limit: pageSize, 
        page: currentPage 
      });
      setNotifications(result.data);
      setTotalCount(result.total);
      setUnreadCount(result.unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markNotificationsAsRead({ markAll: true });
      
      // Update UI state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationsAsRead({ ids: [id] });
      
      // Update UI state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const filteredNotifications = searchQuery 
    ? notifications.filter(notification => 
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        notification.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notifications;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount} unread notifications
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadNotifications}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            aria-label="Refresh notifications"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </button>
          )}
        </div>
      </div>
      
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm rounded-md ${filter === 'all' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 text-sm rounded-md ${filter === 'unread' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Unread
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search notifications..."
            className="pl-10 pr-4 py-2 border rounded-md w-full sm:w-64"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Bell className="h-12 w-12 mb-4 text-gray-300" />
          <p>No notifications found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredNotifications.map(notification => (
            <div 
              key={notification.id} 
              className={`border-b last:border-0 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
            >
              <div className="flex items-start p-4">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <div className="mt-2 flex items-center gap-4">
                    {notification.action_link && (
                      <Link 
                        href={notification.action_link} 
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View details
                      </Link>
                    )}
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500">
            Showing {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
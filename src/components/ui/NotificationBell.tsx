'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { fetchNotifications, markNotificationsAsRead } from '@/lib/notification';
import { Notification } from '@/types/notifications';
import { format } from 'date-fns';
import Link from 'next/link';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on component mount
  useEffect(() => {
    loadNotifications();
    
    // Set up a polling interval for notifications
    const interval = setInterval(loadNotifications, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications data
  const loadNotifications = async () => {
    try {
      const result = await fetchNotifications({ limit: 10 });
      setNotifications(result.data);
      setUnreadCount(result.unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await markNotificationsAsRead({ markAll: true });
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  // Mark a single notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationsAsRead({ ids: [id] });
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Toggle the notification dropdown
  const toggleDropdown = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="p-2 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-blue rounded-md relative"
        aria-label="View notifications"
        onClick={toggleDropdown}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 max-h-96 overflow-auto">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div>
              {notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`px-4 py-3 border-b hover:bg-gray-50 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                >
                  <Link 
                    href={notification.action_link || '#'} 
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    className="block"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <span className="text-xs text-gray-500">
                        {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  </Link>
                </div>
              ))}
              <div className="px-4 py-2 border-t text-center">
                <Link href="/dashboard/notifications" className="text-xs text-blue-600 hover:text-blue-800">
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
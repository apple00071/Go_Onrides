'use client';

import { useState } from 'react';
import { Menu, UserIcon } from 'lucide-react';
import NotificationBell from '@/components/ui/NotificationBell';

interface User {
  email: string;
  role: string;
}

interface HeaderProps {
  user?: User;
  onMenuClick: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 bg-white border-b w-full safe-top">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden -ml-2 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-blue p-2 touch-manipulation"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Right side content */}
        <div className="flex items-center space-x-4 md:space-x-6">
          {/* Notifications */}
          <div className="relative">
            <NotificationBell />
          </div>

          {/* User info */}
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px] lg:max-w-[250px]">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role}
              </p>
            </div>
            <button 
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 touch-manipulation hover:bg-blue-200 transition-colors"
              aria-label="User menu"
            >
              <UserIcon className="h-5 w-5 text-blue-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 
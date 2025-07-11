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
    <header className="sticky top-0 z-10 bg-white border-b w-full">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-blue min-h-[44px] min-w-[44px]"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Right side content */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <NotificationBell />

          {/* User info */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px]">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0">
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 
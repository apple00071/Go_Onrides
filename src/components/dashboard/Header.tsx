'use client';

import { useState } from 'react';
import { Menu, Bell, UserIcon } from 'lucide-react';
import type { UserProfile } from '@/types/database';

interface HeaderProps {
  user: UserProfile | null;
  onMenuClick: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 w-full min-w-[1024px]">
      <div className="flex flex-1 justify-between px-4 bg-white border-b">
        <div className="flex items-center">
          {/* Menu button */}
        <button
          type="button"
            className="lg:hidden p-2 text-gray-500 hover:text-gray-900"
          onClick={onMenuClick}
        >
            <Menu className="h-6 w-6" />
        </button>
        </div>

        {/* Right side content */}
        <div className="ml-4 flex items-center gap-4">
          {/* Notifications */}
            <button
              type="button"
            className="p-2 text-gray-500 hover:text-gray-900"
            >
            <Bell className="h-6 w-6" />
            </button>

          {/* User info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex sm:flex-col sm:items-end">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 
'use client';

import { useState } from 'react';
import { Menu, Bell, User as UserIcon } from 'lucide-react';
import type { UserProfile } from '@/types/database';

interface HeaderProps {
  user: UserProfile | null;
  onMenuClick?: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 flex h-16 flex-shrink-0 bg-white shadow">
      <button
        type="button"
        onClick={onMenuClick}
        className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      
      <div className="flex flex-1 justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1">
          <h2 className="text-2xl font-semibold text-gray-800 self-center hidden sm:block">
            Dashboard
          </h2>
        </div>
        
        <div className="ml-4 flex items-center gap-4">
          <button
            type="button"
            className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Vertical divider */}
          <div className="h-6 w-px bg-gray-200" />

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <UserIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
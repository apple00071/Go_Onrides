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
    <div className="sticky top-0 z-40 bg-card-white shadow-card">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-secondary-text hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2 lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        
        <div className="flex flex-1 items-center justify-between">
          <h1 className="text-xl font-semibold text-primary-text">Dashboard</h1>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-secondary-text hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-2"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex sm:flex-col sm:items-end">
                <p className="text-sm font-medium text-primary-text">{user?.email}</p>
                <p className="text-xs text-secondary-text capitalize">{user?.role}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-blue/10">
                <UserIcon className="h-5 w-5 text-primary-blue" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
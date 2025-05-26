'use client';

import { Menu } from 'lucide-react';
import type { User } from '@/types/database';

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
      <button
        type="button"
        className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      <div className="flex flex-1 justify-between px-4">
        <div className="flex flex-1"></div>
        <div className="ml-4 flex items-center md:ml-6">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-900">
              {user?.email}
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 capitalize">
              {user?.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
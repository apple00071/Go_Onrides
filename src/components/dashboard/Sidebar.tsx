'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  Home,
  Calendar,
  CreditCard,
  BarChart,
  Settings,
  LogOut,
  Users
} from 'lucide-react';
import type { UserProfile } from '@/types/database';

interface SidebarProps {
  user: UserProfile | null;
  isOpen: boolean;
}

export default function Sidebar({ user, isOpen }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
    { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart },
    { name: 'Customers', href: '/dashboard/customers', icon: Users },
    ...(user?.role === 'admin' ? [
      { name: 'Settings', href: '/dashboard/settings', icon: Settings }
    ] : [])
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href || pathname === '/dashboard/';
    }
    return pathname.startsWith(href + '/') || pathname === href;
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside 
      className={`
        flex h-screen flex-col
        fixed md:sticky top-0 z-30
        w-[280px] md:w-64
        bg-white border-r border-gray-200
        transition-transform duration-300 ease-in-out
        ${!isOpen ? '-translate-x-full' : 'translate-x-0'}
        md:translate-x-0
      `}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-blue text-white">
          GR
        </div>
        <h1 className="text-lg font-semibold text-primary-text">Goon Riders</h1>
      </div>
      
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${active
                    ? 'bg-primary-blue/10 text-primary-blue'
                    : 'text-secondary-text hover:bg-gray-50 hover:text-primary-text'
                  }
                `}
              >
                <item.icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors
                    ${active ? 'text-primary-blue' : 'text-gray-400 group-hover:text-primary-text'}
                  `}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-text hover:bg-gray-50 hover:text-primary-text transition-colors"
          >
            <LogOut
              className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-primary-text transition-colors"
              aria-hidden="true"
            />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
} 
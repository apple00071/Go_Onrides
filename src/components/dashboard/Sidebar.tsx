'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  Home,
  CalendarRange,
  Users,
  Car,
  Settings,
  Bell,
  FileText,
  X,
  RotateCcw,
  Clock,
  Wrench,
  Receipt,
  IndianRupee
} from 'lucide-react';
import type { UserProfile } from '@/types/database';

interface SidebarProps {
  user: UserProfile | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    };

    fetchUserRole();
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, showAlways: true },
    { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarRange, showAlways: true },
    { name: "Today's Bookings", href: '/dashboard/bookings/today', icon: CalendarRange, showAlways: true },
    { name: "Today's Returns", href: '/dashboard/returns/today', icon: Clock, showAlways: true },
    { name: 'Customers', href: '/dashboard/customers', icon: Users, showAlways: true },
    { name: 'Vehicles', href: '/dashboard/vehicles', icon: Car, showAlways: true },
    { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench, showAlways: true },
    { name: 'Payments', href: '/dashboard/payments', icon: IndianRupee, showAlways: true },
    { name: "Today's Payments", href: '/dashboard/payments/today', icon: IndianRupee, showAlways: true },
    { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt, showAlways: true },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText, adminOnly: true },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, showAlways: true },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, adminOnly: true },
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

  const filteredNavigation = navigation.filter(item => 
    item.showAlways || (item.adminOnly && userRole === 'admin')
  );

  return (
    <aside 
      className={`
        fixed md:sticky top-0 left-0 z-50 
        h-[100dvh] w-[280px] sm:w-64 
        bg-white border-r shadow-lg md:shadow-none
        transform transition-transform duration-300 ease-in-out 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 safe-top safe-bottom
      `}
    >
      <div className="flex h-14 items-center justify-between px-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-blue text-white">
            GR
          </div>
          <span className="text-lg font-semibold text-gray-900">Go-On Rides</span>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-blue touch-manipulation"
          aria-label="Close sidebar"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="flex flex-col h-[calc(100dvh-4rem)] overflow-y-auto">
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNavigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose && window.innerWidth < 768 ? onClose() : null}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors touch-manipulation
                  ${active
                    ? 'bg-primary-blue/10 text-primary-blue'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors
                    ${active ? 'text-primary-blue' : 'text-gray-400 group-hover:text-gray-900'}
                  `}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-3 mt-auto border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors touch-manipulation"
          >
            <RotateCcw
              className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-900 transition-colors"
              aria-hidden="true"
            />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
} 
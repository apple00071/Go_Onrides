'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Wrench, CalendarRange } from 'lucide-react';
import Link from 'next/link';

interface VehicleLayoutProps {
  children: React.ReactNode;
  params: {
    registration: string;
  };
}

export default function VehicleLayout({ children, params }: VehicleLayoutProps) {
  const pathname = usePathname();
  const decodedRegistration = decodeURIComponent(params.registration);

  const navigation = [
    {
      name: 'Maintenance History',
      href: `/dashboard/maintenance/vehicle/${params.registration}/history`,
      icon: Wrench,
    },
    {
      name: 'Booking History',
      href: `/dashboard/bookings/vehicle/${params.registration}`,
      icon: CalendarRange,
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="space-y-6">
      {/* Vehicle Navigation */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4" aria-label="Vehicle Navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-4 text-sm font-medium border-b-2 
                    ${isActive(item.href)
                      ? 'border-primary-blue text-primary-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
} 
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
  return (
    <div className="space-y-6">
      {/* Page Content */}
      {children}
    </div>
  );
} 
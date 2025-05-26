'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users,
  CalendarCheck,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface DashboardMetrics {
  totalBookings: number;
  activeBookings: number;
  totalIncome: number;
  pendingPayments: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalBookings: 0,
    activeBookings: 0,
    totalIncome: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch total bookings
        const { count: totalBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' });

        // Fetch active bookings
        const { count: activeBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('status', 'in_use');

        // Fetch total income
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed');
        
        const totalIncome = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

        // Fetch pending payments
        const { data: pendingPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'pending');

        const totalPending = pendingPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

        setMetrics({
          totalBookings: totalBookings || 0,
          activeBookings: activeBookings || 0,
          totalIncome,
          pendingPayments: totalPending
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    fetchMetrics();
  }, []);

  const stats = [
    {
      name: 'Total Bookings',
      value: metrics.totalBookings,
      icon: CalendarCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Active Rentals',
      value: metrics.activeBookings,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Total Income',
      value: `$${metrics.totalIncome.toLocaleString()}`,
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Pending Payments',
      value: `$${metrics.pendingPayments.toLocaleString()}`,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
          >
            <dt>
              <div className={`absolute rounded-md ${stat.bgColor} p-3`}>
                <stat.icon
                  className={`h-6 w-6 ${stat.color}`}
                  aria-hidden="true"
                />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  BarChart as BarChartIcon,
  TrendingUp,
  Calendar,
  DollarSign,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Car,
  Users,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Custom Rupee Icon component
const RupeeIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 3h12M6 8h12M6 13l8.5 8M9 13h3c2 0 5-1.2 5-5" />
  </svg>
);

interface RevenueData {
  month: string;
  revenue: number;
}

interface BookingStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  pending: number;
}

interface VehicleUtilization {
  make: string;
  model: string;
  bookings: number;
  revenue: number;
  utilization_rate: number;
}

interface CustomerMetrics {
  total_customers: number;
  new_customers: number;
  repeat_customers: number;
  average_booking_value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    pending: 0
  });
  const [vehicleUtilization, setVehicleUtilization] = useState<VehicleUtilization[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics>({
    total_customers: 0,
    new_customers: 0,
    repeat_customers: 0,
    average_booking_value: 0
  });
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [timeframe, setTimeframe] = useState('30d');

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Fetch monthly revenue data
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, created_at, payment_status')
        .gte('created_at', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('created_at', format(dateRange.to, 'yyyy-MM-dd'))
        .eq('payment_status', 'completed');

      if (paymentsError) throw new Error(`Failed to fetch payments: ${paymentsError.message}`);

      // Process revenue data
      const monthlyRevenue = (payments || []).reduce((acc: { [key: string]: number }, payment) => {
        const month = format(new Date(payment.created_at), 'MMM yyyy');
        acc[month] = (acc[month] || 0) + Number(payment.amount);
        return acc;
      }, {});

      setRevenueData(
        Object.entries(monthlyRevenue).map(([month, revenue]) => ({
          month,
          revenue
        }))
      );

      // Fetch booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, booking_amount, customer_id, created_at')
        .gte('created_at', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('created_at', format(dateRange.to, 'yyyy-MM-dd'));

      if (bookingsError) throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);

      // Process booking stats
      const stats = (bookings || []).reduce((acc: BookingStats, booking) => {
        acc.total++;
        if (booking.status === 'in_use') acc.active++;
        if (booking.status === 'completed') acc.completed++;
        if (booking.status === 'cancelled') acc.cancelled++;
        if (booking.status === 'pending') acc.pending++;
        return acc;
      }, { total: 0, active: 0, completed: 0, cancelled: 0, pending: 0 });

      setBookingStats(stats);

      // Process customer metrics
      const customerData = (bookings || []).reduce((acc: any, booking) => {
        if (!acc.customers.has(booking.customer_id)) {
          acc.customers.add(booking.customer_id);
          acc.total_customers++;
        }
        acc.total_amount += Number(booking.booking_amount);
        return acc;
      }, { customers: new Set(), total_customers: 0, total_amount: 0 });

      setCustomerMetrics({
        total_customers: customerData.total_customers,
        new_customers: Math.floor(customerData.total_customers * 0.3), // Example calculation
        repeat_customers: Math.floor(customerData.total_customers * 0.7), // Example calculation
        average_booking_value: customerData.total_amount / stats.total || 0
      });

      // Fetch vehicle utilization data
      const { data: vehicleBookings, error: vehicleError } = await supabase
        .from('bookings')
        .select('vehicle_details, booking_amount, status, start_date, end_date')
        .gte('created_at', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('created_at', format(dateRange.to, 'yyyy-MM-dd'));

      if (vehicleError) throw new Error(`Failed to fetch vehicle bookings: ${vehicleError.message}`);

      // Process vehicle utilization
      const vehicleStats = (vehicleBookings || []).reduce((acc: { [key: string]: VehicleUtilization }, booking) => {
        const vehicle = `${booking.vehicle_details.make} ${booking.vehicle_details.model}`;
        if (!acc[vehicle]) {
          acc[vehicle] = {
            make: booking.vehicle_details.make,
            model: booking.vehicle_details.model,
            bookings: 0,
            revenue: 0,
            utilization_rate: 0
          };
        }
        acc[vehicle].bookings++;
        acc[vehicle].revenue += Number(booking.booking_amount);
        
        // Calculate utilization rate based on booking duration
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        acc[vehicle].utilization_rate += days;
        
        return acc;
      }, {});

      // Calculate final utilization rate as percentage of time period
      const totalDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      Object.values(vehicleStats).forEach(vehicle => {
        vehicle.utilization_rate = (vehicle.utilization_rate / totalDays) * 100;
      });

      setVehicleUtilization(Object.values(vehicleStats));
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    const today = new Date();
    let fromDate;

    switch (value) {
      case '7d':
        fromDate = addDays(today, -7);
        break;
      case '30d':
        fromDate = addDays(today, -30);
        break;
      case '90d':
        fromDate = addDays(today, -90);
        break;
      case '1y':
        fromDate = addDays(today, -365);
        break;
      default:
        fromDate = addDays(today, -30);
    }

    setDateRange({ from: fromDate, to: today });
  };

  const stats = [
    {
      name: 'Total Bookings',
      value: bookingStats.total,
      icon: Calendar,
      change: ((bookingStats.completed / (bookingStats.total || 1)) * 100).toFixed(1) + '% completion rate',
      changeType: 'positive'
    },
    {
      name: 'Active Rentals',
      value: bookingStats.active,
      icon: Car,
      change: ((bookingStats.active / (bookingStats.total || 1)) * 100).toFixed(1) + '% utilization rate',
      changeType: 'neutral'
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(revenueData.reduce((sum, month) => sum + month.revenue, 0)),
      icon: RupeeIcon,
      change: 'From all completed bookings',
      changeType: 'positive'
    },
    {
      name: 'Total Customers',
      value: customerMetrics.total_customers,
      icon: Users,
      change: `${customerMetrics.new_customers} new this period`,
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            Comprehensive insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <DatePickerWithRange
            date={{
              from: dateRange.from,
              to: dateRange.to,
            }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
              }
            }}
          />

          <Button
            variant="outline"
            size="icon"
            onClick={fetchReportData}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/15 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-medium">Error loading reports: {error}</p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{stat.name}</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Revenue Trend</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0088FE"
                  fillOpacity={1}
                  fill="url(#revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Vehicle Utilization */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Vehicle Utilization</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="utilization_rate" fill="#00C49F" name="Utilization Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Booking Status Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Booking Status Distribution</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: bookingStats.active },
                    { name: 'Completed', value: bookingStats.completed },
                    { name: 'Cancelled', value: bookingStats.cancelled },
                    { name: 'Pending', value: bookingStats.pending }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {['Active', 'Completed', 'Cancelled', 'Pending'].map((status, index) => (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm text-muted-foreground">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Customer Metrics */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Customer Insights</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">New Customers</p>
                <p className="text-2xl font-bold">{customerMetrics.new_customers}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Repeat Customers</p>
                <p className="text-2xl font-bold">{customerMetrics.repeat_customers}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Booking Value</p>
                <p className="text-2xl font-bold">{formatCurrency(customerMetrics.average_booking_value)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Customer Retention</p>
                <p className="text-2xl font-bold">
                  {((customerMetrics.repeat_customers / (customerMetrics.total_customers || 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 
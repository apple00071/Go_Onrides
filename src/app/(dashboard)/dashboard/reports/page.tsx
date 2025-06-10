'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { Card } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { addDays, format, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval } from 'date-fns';
import { AlertTriangle, Calendar, Car, RefreshCw, Users, TrendingUp, IndianRupee as RupeeIcon, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RevenueData {
  date: string;
  revenue: number;
}

interface CustomerMetrics {
  total_customers: number;
  new_customers: number;
  repeat_customers: number;
  average_booking_value: number;
}

interface VehicleUtilization {
  make: string;
  model: string;
  bookings: number;
  revenue: number;
  utilization_rate: number;
}

interface BookingStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  pending: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const CHART_TYPES = ['line', 'bar', 'area'] as const;
type ChartType = typeof CHART_TYPES[number];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ReportsPage() {
  const { hasPermission, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
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
  const [selectedChart, setSelectedChart] = useState<ChartType>('area');
  const [revenuePeriod, setRevenuePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Get total income from completed payments
      const { data: completedPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('payment_status', 'completed')
        .gte('created_at', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('created_at', format(dateRange.to, 'yyyy-MM-dd'));

      if (paymentsError) throw new Error(`Failed to fetch completed payments: ${paymentsError.message}`);

      // Calculate total income from completed payments
      let calculatedTotalIncome = 0;
      const revenueByDate = new Map<string, number>();
      
      // Initialize periods with 0 revenue based on selected timeframe
      let intervalData: Date[] = [];
      let formatString = '';

      switch (revenuePeriod) {
        case 'daily':
          intervalData = eachDayOfInterval({
            start: dateRange.from,
            end: dateRange.to
          });
          formatString = 'MMM dd';
          break;
        case 'weekly':
          intervalData = eachWeekOfInterval({
            start: dateRange.from,
            end: dateRange.to
          });
          formatString = "'Week of' MMM dd";
          break;
        case 'monthly':
          intervalData = eachMonthOfInterval({
            start: dateRange.from,
            end: dateRange.to
          });
          formatString = 'MMM yyyy';
          break;
      }

      // Initialize all periods with 0 revenue
      intervalData.forEach(date => {
        const periodKey = format(date, formatString);
        revenueByDate.set(periodKey, 0);
      });

      // Sum up revenue by period from completed payments
      (completedPayments || []).forEach(payment => {
        let periodKey = '';
        const paymentDate = new Date(payment.created_at);
        
        switch (revenuePeriod) {
          case 'daily':
            periodKey = format(paymentDate, 'MMM dd');
            break;
          case 'weekly':
            // Find the start of the week containing this payment
            intervalData.forEach(weekStart => {
              if (paymentDate >= weekStart && 
                  paymentDate < addDays(weekStart, 7)) {
                periodKey = format(weekStart, "'Week of' MMM dd");
              }
            });
            break;
          case 'monthly':
            periodKey = format(paymentDate, 'MMM yyyy');
            break;
        }

        if (periodKey && revenueByDate.has(periodKey)) {
          const amount = typeof payment.amount === 'string'
            ? parseFloat(payment.amount)
            : payment.amount;

          if (!isNaN(amount)) {
            revenueByDate.set(
              periodKey, 
              (revenueByDate.get(periodKey) || 0) + amount
            );
            // Add to total income
            calculatedTotalIncome += amount;
          }
        }
      });

      // Set total income
      setTotalIncome(calculatedTotalIncome);

      // Convert the map to array for the chart
      const revenueArray = Array.from(revenueByDate.entries()).map(([date, revenue]) => ({
        date,
        revenue
      }));

      setRevenueData(revenueArray);

      // Fetch booking statistics
      const { data: bookings, error: statsError } = await supabase
        .from('bookings')
        .select('status, booking_amount, customer_id, created_at')
        .gte('created_at', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('created_at', format(dateRange.to, 'yyyy-MM-dd'));

      if (statsError) throw new Error(`Failed to fetch booking statistics: ${statsError.message}`);

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
        // Extract make and model safely, providing defaults if missing
        const make = booking.vehicle_details?.make || '';
        const model = booking.vehicle_details?.model || booking.vehicle_details?.registration || 'Unknown Vehicle';
        const registration = booking.vehicle_details?.registration || '';
        
        // Create a better vehicle key that doesn't show "Unknown" prefix
        const vehicleKey = make && make.toLowerCase() !== 'unknown' 
          ? `${make} ${model}` 
          : model;
        
        if (!acc[vehicleKey]) {
          acc[vehicleKey] = {
            // Don't use "Unknown" as a prefix if we have a model name
            make: make && make.toLowerCase() !== 'unknown' ? make : '',
            model: model,
            bookings: 0,
            revenue: 0,
            utilization_rate: 0
          };
        }
        
        acc[vehicleKey].bookings++;
        acc[vehicleKey].revenue += Number(booking.booking_amount);
        
        // Calculate utilization rate based on booking duration
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        acc[vehicleKey].utilization_rate += days;
        
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
  }, [dateRange, revenuePeriod]);

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

  // Export reports to CSV
  const exportToCsv = () => {
    // Revenue data
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Revenue data header
    csvContent += "Period,Revenue\n";
    
    // Revenue data rows
    revenueData.forEach(item => {
      csvContent += `${item.date},${item.revenue}\n`;
    });
    
    // Add a blank line between datasets
    csvContent += "\n";
    
    // Booking stats header
    csvContent += "Booking Metric,Count\n";
    
    // Booking stats rows
    csvContent += `Total Bookings,${bookingStats.total}\n`;
    csvContent += `Active Bookings,${bookingStats.active}\n`;
    csvContent += `Completed Bookings,${bookingStats.completed}\n`;
    csvContent += `Cancelled Bookings,${bookingStats.cancelled}\n`;
    csvContent += `Pending Bookings,${bookingStats.pending}\n`;
    
    // Add a blank line between datasets
    csvContent += "\n";
    
    // Vehicle utilization header
    csvContent += "Vehicle,Bookings,Revenue,Utilization Rate (%)\n";
    
    // Vehicle utilization rows
    vehicleUtilization.forEach(vehicle => {
      csvContent += `${vehicle.make} ${vehicle.model},${vehicle.bookings},${vehicle.revenue},${vehicle.utilization_rate.toFixed(1)}\n`;
    });
    
    // Encode the CSV
    const encodedUri = encodeURI(csvContent);
    
    // Create a temporary link to trigger the download
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `goonriders_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    
    // Trigger download and remove the link
    link.click();
    document.body.removeChild(link);
  };

  const stats = [
    {
      name: 'Total Income',
      value: formatCurrency(totalIncome),
      icon: RupeeIcon,
      change: 'From all completed payments',
      changeType: 'positive'
    },
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
      name: 'Total Customers',
      value: customerMetrics.total_customers,
      icon: Users,
      change: `${customerMetrics.new_customers} new this period`,
      changeType: 'positive'
    }
  ];

  // Check if user has permission to access reports
  if (!hasPermission('accessReports')) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            Comprehensive insights and performance metrics
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
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
          
          <Button
            variant="outline"
            onClick={exportToCsv}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
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
            <div className="flex items-center gap-2">
              <Select value={revenuePeriod} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setRevenuePeriod(value)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-1">
                {CHART_TYPES.map(type => (
                  <Button
                    key={type}
                    variant={selectedChart === type ? 'default' : 'outline'}
                    size="sm"
                    className="px-2 py-1 h-8"
                    onClick={() => setSelectedChart(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {selectedChart === 'area' ? (
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
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
              ) : selectedChart === 'bar' ? (
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#0088FE" />
                </BarChart>
              ) : (
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Booking Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Booking Status</h3>
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

        {/* Vehicle Utilization */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Vehicle Utilization</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={vehicleUtilization}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  dataKey={(vehicle) => {
                    // Display only model if make is empty, otherwise show make + model
                    return vehicle.make ? `${vehicle.make} ${vehicle.model}` : vehicle.model;
                  }} 
                  type="category" 
                  width={150}
                />
                <Tooltip formatter={(value: any) => {
                  // Ensure value is treated as a number for formatting
                  const numValue = Number(value);
                  return [`${numValue.toFixed(1)}%`, 'Utilization'];
                }} />
                <Legend />
                <Bar dataKey="utilization_rate" fill="#82ca9d" name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
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
            
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'New Customers', value: customerMetrics.new_customers },
                      { name: 'Repeat Customers', value: customerMetrics.repeat_customers }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#0088FE" />
                    <Cell fill="#00C49F" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 
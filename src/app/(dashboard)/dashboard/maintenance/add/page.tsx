'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Save, Plus, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parse } from 'date-fns';
import { formatDate } from '@/lib/utils';
import BatteryMaintenanceForm from '@/components/maintenance/BatteryMaintenanceForm';

// Date format helpers
const formatDateForDisplay = (date: Date) => format(date, 'dd-MM-yyyy');
const formatDateForInput = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parsedDate = parse(dateStr, 'dd-MM-yyyy', new Date());
    return format(parsedDate, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};
const formatDateForState = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
    return format(parsedDate, 'dd-MM-yyyy');
  } catch {
    return '';
  }
};

// Get today's date in DD-MM-YYYY format
const today = formatDateForDisplay(new Date());
const todayForInput = format(new Date(), 'yyyy-MM-dd');

const maintenanceTypes = [
  { 
    value: 'engine_oil', 
    label: 'Engine Oil Change',
    requiresNextDue: true 
  },
  { 
    value: 'oil_filter', 
    label: 'Oil Filter',
    requiresNextDue: true 
  },
  { 
    value: 'air_filter', 
    label: 'Air Filter',
    requiresNextDue: true 
  },
  { 
    value: 'battery', 
    label: 'Battery',
    requiresNextDue: true,
    requiresDetails: true 
  },
  { value: 'tyre_change', label: 'Tyre Change' },
  { value: 'tyre_rotation', label: 'Tyre Rotation' },
  { value: 'brake_pads', label: 'Brake Pads' },
  { value: 'chain_sprocket', label: 'Chain & Sprocket' },
  { value: 'general_service', label: 'General Service' },
  { value: 'other', label: 'Other' }
];

interface MaintenanceType {
  value: string;
  label: string;
  nextDueDate?: string;
}

interface Vehicle {
  registration: string;
  model: string;
  status: string;
}

export default function AddMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawVehicleRegistration = searchParams.get('vehicle');
  // Properly decode the vehicle registration from URL
  const vehicleRegistration = rawVehicleRegistration ? decodeURIComponent(rawVehicleRegistration.replace(/\+/g, ' ')) : '';
  
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_registration: vehicleRegistration,
    maintenance_date: today, // Initialize with today's date in DD-MM-YYYY
    maintenance_types: [] as MaintenanceType[],
    description: '',
    cost: 0,
    odometer_reading: 0,
    performed_by: '',
    notes: ''
  });
  const [selectedBatteryId, setSelectedBatteryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleRegistration) {
      fetchVehicle();
      checkUserRole();
    } else {
      router.push('/dashboard/maintenance');
    }
  }, [vehicleRegistration]);

  const checkUserRole = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's role from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchVehicle = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('registration', vehicleRegistration)
        .single();

      if (error) throw error;
      setVehicle(data);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      toast.error('Failed to fetch vehicle details');
      router.push('/dashboard/maintenance');
    }
  };

  const handleMaintenanceTypeChange = (type: MaintenanceType, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      maintenance_types: checked 
        ? [...prev.maintenance_types, { ...type, nextDueDate: '' }]
        : prev.maintenance_types.filter(t => t.value !== type.value)
    }));
  };

  const handleNextDueDateChange = (typeValue: string, date: string) => {
    setFormData(prev => ({
      ...prev,
      maintenance_types: prev.maintenance_types.map(type => 
        type.value === typeValue ? { ...type, nextDueDate: date } : type
      )
    }));
  };

  const handleBatteryDetailsChange = (batteryId: string | null) => {
    setSelectedBatteryId(batteryId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const maxRetries = 3;
    let retryCount = 0;

    const attemptInsert = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // Check and refresh auth session if needed
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          throw new Error('No active session found');
        }

        // Parse the DD-MM-YYYY date to YYYY-MM-DD for database
        const dbDate = format(parse(formData.maintenance_date, 'dd-MM-yyyy', new Date()), 'yyyy-MM-dd');

        // Create separate maintenance records for each type
        for (const maintenanceType of formData.maintenance_types) {
          // Ensure all numeric fields are properly typed
          const maintenanceData = {
            vehicle_registration: vehicleRegistration.trim(), // Use the decoded registration directly
            maintenance_date: dbDate,
            maintenance_type: maintenanceType.value,
            description: (formData.description || '').trim(),
            cost: Number(formData.cost) / formData.maintenance_types.length, // Ensure it's a number
            next_due_date: maintenanceType.nextDueDate ? 
              format(parse(maintenanceType.nextDueDate, 'dd-MM-yyyy', new Date()), 'yyyy-MM-dd') : 
              null,
            odometer_reading: Number(formData.odometer_reading), // Ensure it's a number
            performed_by: (formData.performed_by || '').trim(),
            notes: (formData.notes || '').trim(),
            created_by: session.user.id,
            updated_by: session.user.id,
            updated_at: new Date().toISOString()
          };

          // Only add battery details if this is a battery maintenance and we have a battery ID
          if (maintenanceType.value === 'battery' && selectedBatteryId) {
            Object.assign(maintenanceData, { battery_details: selectedBatteryId });
          }

          console.log('Inserting maintenance data:', maintenanceData);

          const { error: insertError } = await supabase
            .from('vehicle_maintenance')
            .insert([maintenanceData]);

          if (insertError) {
            console.error('Insert error:', insertError);
            throw insertError;
          }
        }

        // Check for active bookings before updating vehicle status
        const { data: activeBookings, error: bookingError } = await supabase
          .from('bookings')
          .select('id')
          .contains('vehicle_details', { registration: vehicleRegistration })
          .in('status', ['confirmed', 'in_use'])
          .limit(1);

        if (bookingError) {
          console.error('Booking query error:', bookingError);
          throw bookingError;
        }

        // Only update vehicle status if there are no active bookings
        if (!activeBookings?.length) {
          const { error: vehicleError } = await supabase
            .from('vehicles')
            .update({ 
              status: 'available',
              updated_at: new Date().toISOString(),
              updated_by: session.user.id
            })
            .eq('registration', vehicleRegistration);

          if (vehicleError) {
            if (vehicleError.message.includes('Cannot change vehicle status: Vehicle has active bookings')) {
              setError('Cannot update vehicle status: Vehicle has active bookings');
              setLoading(false);
              return;
            }
            throw vehicleError;
          }
        }

        toast.success('Maintenance record added successfully');
        router.push('/dashboard/maintenance');
      } catch (error: any) {
        console.error('Operation error:', error);
        if (error.code === 'PGRST204' && retryCount < maxRetries) {
          // Retry the entire operation
          return attemptInsert();
        }
        if (error.message === 'No active session found') {
          // Redirect to login if session is invalid
          router.push('/login');
          return;
        }
        throw error;
      }
    };

    try {
      await attemptInsert();
    } catch (error: any) {
      console.error('Error adding maintenance record:', error);
      setError(error.message || 'An error occurred while adding the maintenance record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Maintenance Record</h1>
            <p className="text-sm text-gray-600">
              Create a new maintenance record for {vehicle?.model} ({vehicle?.registration})
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Information Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Model</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{vehicle?.model}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Registration</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{vehicle?.registration}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{vehicle?.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Maintenance Details</h3>
            
            <div className="space-y-6">
              {/* Maintenance Date */}
              <div>
                <label htmlFor="maintenance_date" className="block text-sm font-medium text-gray-700">
                  Maintenance Date {isAdmin && <span className="text-red-500">*</span>}
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="maintenance_date"
                    required
                    value={formatDateForInput(formData.maintenance_date)}
                    onChange={(e) => {
                      if (isAdmin) {
                        setFormData(prev => ({
                          ...prev,
                          maintenance_date: formatDateForState(e.target.value)
                        }));
                      }
                    }}
                    max={todayForInput}
                    disabled={!isAdmin}
                    className={`block w-full rounded-lg border ${!isAdmin ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} shadow-sm py-2.5 px-3 sm:text-sm`}
                  />
                  {!isAdmin && (
                    <p className="mt-1 text-xs text-gray-500">Only administrators can modify the maintenance date</p>
                  )}
                </div>
              </div>

              {/* Maintenance Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maintenance Types <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {maintenanceTypes.map(type => {
                    const isSelected = formData.maintenance_types.some(t => t.value === type.value);
                    return (
                      <div key={type.value} className="relative">
                        <div className={`p-4 rounded-lg border ${isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200'} transition-colors`}>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={type.value}
                              checked={isSelected}
                              onChange={(e) => handleMaintenanceTypeChange(type, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={type.value} className="ml-2 block text-sm font-medium text-gray-900">
                              {type.label}
                            </label>
                          </div>
                          
                          {isSelected && type.requiresNextDue && (
                            <div className="mt-3 pl-6">
                              <label className="block text-xs font-medium text-gray-500">Next Due Date <span className="text-red-500">*</span></label>
                              <input
                                type="date"
                                required
                                value={formatDateForInput(formData.maintenance_types.find(t => t.value === type.value)?.nextDueDate || '')}
                                onChange={(e) => handleNextDueDateChange(type.value, formatDateForState(e.target.value))}
                                min={todayForInput}
                                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Battery Maintenance Form */}
              {formData.maintenance_types.some(type => type.value === 'battery') && (
                <div className="border-t border-gray-200 pt-6">
                  <BatteryMaintenanceForm
                    vehicleRegistration={formData.vehicle_registration}
                    onBatteryDetailsChange={handleBatteryDetailsChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Additional Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                  Total Cost
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    id="cost"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    className="block w-full pl-7 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="odometer_reading" className="block text-sm font-medium text-gray-700">
                  Current Odometer Reading
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    id="odometer_reading"
                    min="0"
                    value={formData.odometer_reading}
                    onChange={(e) => setFormData(prev => ({ ...prev, odometer_reading: parseInt(e.target.value) || 0 }))}
                    className="block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">km</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="performed_by" className="block text-sm font-medium text-gray-700">
                  Performed By
                </label>
                <input
                  type="text"
                  id="performed_by"
                  value={formData.performed_by}
                  onChange={(e) => setFormData(prev => ({ ...prev, performed_by: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter mechanic or service center name"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter maintenance details or observations"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Any additional notes or comments"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/maintenance')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.maintenance_types.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Maintenance Record'}
          </button>
        </div>
      </form>
    </div>
  );
} 
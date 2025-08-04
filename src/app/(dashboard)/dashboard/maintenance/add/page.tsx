'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
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
  const vehicleRegistration = searchParams.get('vehicle');
  
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_registration: vehicleRegistration || '',
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

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Parse the DD-MM-YYYY date to YYYY-MM-DD for database
      const dbDate = format(parse(formData.maintenance_date, 'dd-MM-yyyy', new Date()), 'yyyy-MM-dd');

      // Create separate maintenance records for each type
      for (const maintenanceType of formData.maintenance_types) {
        const maintenanceData = {
          vehicle_registration: formData.vehicle_registration,
          maintenance_date: dbDate,
          maintenance_type: maintenanceType.value,
          description: formData.description,
          cost: formData.cost / formData.maintenance_types.length, // Split cost evenly
          next_due_date: maintenanceType.nextDueDate ? 
            format(parse(maintenanceType.nextDueDate, 'dd-MM-yyyy', new Date()), 'yyyy-MM-dd') : 
            null,
          odometer_reading: formData.odometer_reading,
          performed_by: formData.performed_by,
          notes: formData.notes,
          created_by: user.id,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
          // Add battery details if this is a battery maintenance
          ...(maintenanceType.value === 'battery' && selectedBatteryId 
            ? { battery_details: selectedBatteryId } 
            : {})
        };

        const { error: insertError } = await supabase
          .from('vehicle_maintenance')
          .insert(maintenanceData);

        if (insertError) throw insertError;
      }

      // Check for active bookings before updating vehicle status
      const { data: activeBookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('vehicle_details->registration', formData.vehicle_registration)
        .in('status', ['confirmed', 'in_use'])
        .limit(1);

      if (bookingError) throw bookingError;

      // Only update vehicle status if there are no active bookings
      if (!activeBookings?.length) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({ 
            status: 'available',
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('registration', formData.vehicle_registration);

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
      console.error('Error adding maintenance record:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Add Maintenance Record</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create a new maintenance record for {vehicle?.model} ({vehicle?.registration})
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Vehicle
          </label>
          <div className="mt-1 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-900">{vehicle?.model}</p>
            <p className="text-sm text-gray-500">{vehicle?.registration}</p>
            <p className="text-sm text-gray-500 mt-1">Status: <span className="capitalize">{vehicle?.status}</span></p>
          </div>
        </div>

        <div>
          <label htmlFor="maintenance_date" className="block text-sm font-medium text-gray-700">
            Maintenance Date {isAdmin && '*'}
          </label>
          <div className="relative">
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
              className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                ${!isAdmin ? 'bg-gray-50 cursor-not-allowed' : 'focus:outline-none focus:ring-blue-500 focus:border-blue-500'}
                sm:text-sm`}
            />
            {!isAdmin && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-xs text-gray-500">{formData.maintenance_date}</span>
              </div>
            )}
          </div>
          {!isAdmin && (
            <p className="mt-1 text-xs text-gray-500">
              Only administrators can modify the maintenance date
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Types *
          </label>
          <div className="space-y-2 border border-gray-200 rounded-md p-4">
            {maintenanceTypes.map(type => {
              const isSelected = formData.maintenance_types.some(t => t.value === type.value);
              return (
                <div key={type.value} className="flex flex-col space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={type.value}
                      checked={isSelected}
                      onChange={(e) => handleMaintenanceTypeChange(type, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={type.value} className="ml-2 block text-sm text-gray-900">
                      {type.label}
                    </label>
                  </div>
                  {isSelected && type.requiresNextDue && (
                    <div className="ml-6">
                      <label className="block text-xs text-gray-500">Next Due Date *</label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          value={formatDateForInput(formData.maintenance_types.find(t => t.value === type.value)?.nextDueDate || '')}
                          onChange={(e) => {
                            handleNextDueDateChange(type.value, formatDateForState(e.target.value));
                          }}
                          min={todayForInput}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-xs text-gray-500">
                            {formData.maintenance_types.find(t => t.value === type.value)?.nextDueDate || ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Show battery form when battery maintenance is selected */}
        {formData.maintenance_types.some(type => type.value === 'battery') && (
          <BatteryMaintenanceForm
            vehicleRegistration={formData.vehicle_registration}
            onBatteryDetailsChange={handleBatteryDetailsChange}
          />
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
            Total Cost
          </label>
          <input
            type="number"
            id="cost"
            min="0"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="odometer_reading" className="block text-sm font-medium text-gray-700">
            Current Odometer Reading
          </label>
          <input
            type="number"
            id="odometer_reading"
            min="0"
            value={formData.odometer_reading}
            onChange={(e) => setFormData(prev => ({ ...prev, odometer_reading: parseInt(e.target.value) || 0 }))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
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
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push('/dashboard/maintenance')}
            className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.maintenance_types.length === 0}
            className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Maintenance Record'}
          </button>
        </div>
      </form>
    </div>
  );
} 
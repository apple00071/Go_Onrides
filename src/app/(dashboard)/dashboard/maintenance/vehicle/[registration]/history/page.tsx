'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { formatDateForDisplay, formatCurrency } from '@/lib/utils';

const getMaintenanceTypeLabel = (types: string[]) => {
  const typeLabels: { [key: string]: string } = {
    'engine_oil': 'Engine Oil Change',
    'oil_filter': 'Oil Filter',
    'air_filter': 'Air Filter',
    'battery': 'Battery',
    'tyre_change': 'Tyre Change',
    'tyre_rotation': 'Tyre Rotation',
    'brake_pads': 'Brake Pads',
    'chain_sprocket': 'Chain & Sprocket',
    'general_service': 'General Service',
    'other': 'Other'
  };
  
  return types.map(type => typeLabels[type] || type).join(', ');
};

interface MaintenanceRecord {
  id: string;
  maintenance_date: string;
  maintenance_types: string[];
  description: string;
  cost: number;
  next_due_date: string | null;
  odometer_reading: number;
  performed_by: string;
  notes: string;
  battery_details?: string | null;
  vehicle_batteries?: BatteryDetails[];
}

interface BatteryDetails {
  id: string;
  old_battery_number: string;
  new_battery_number: string;
  battery_image_url: string | null;
  old_battery_image_url: string | null;
  warranty_card_image_url: string | null;
  warranty_end_date: string;
  warranty_details: string;
  battery_health: number;
  vehicle_registration: string;
}

interface Vehicle {
  registration: string;
  model: string;
  status: string;
}

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MaintenanceRecord;
  batteryDetails?: BatteryDetails;
}

function MaintenanceModal({ isOpen, onClose, record, batteryDetails }: MaintenanceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Maintenance Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Services Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Services Performed</h3>
            <div className="flex flex-wrap gap-2">
              {record.maintenance_types.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {getMaintenanceTypeLabel([type])}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-base text-gray-900">{formatDateForDisplay(record.maintenance_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cost</p>
              <p className="mt-1 text-sm text-gray-900">{formatCurrency(record.cost)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Odometer Reading</p>
              <p className="mt-1 text-sm text-gray-900">{record.odometer_reading.toLocaleString()} km</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Performed By</p>
              <p className="mt-1 text-sm text-gray-900">{record.performed_by || '-'}</p>
            </div>
          </div>

          {/* Next Due Date Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Next Due Date</h3>
            <p className="text-base text-gray-900">
              {record.next_due_date ? formatDateForDisplay(record.next_due_date) : 'Not specified'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This date applies to all services performed in this maintenance.
            </p>
          </div>

          {record.description && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="mt-1 text-sm text-gray-900">{record.description}</p>
            </div>
          )}

          {/* Battery Details Section */}
          {record.maintenance_types.includes('battery') && batteryDetails && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Battery Details</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Old Battery Number</p>
                  <p className="mt-1 text-sm text-gray-900">{batteryDetails.old_battery_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">New Battery Number</p>
                  <p className="mt-1 text-sm text-gray-900">{batteryDetails.new_battery_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Warranty End Date</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {batteryDetails.warranty_end_date ? formatDateForDisplay(batteryDetails.warranty_end_date) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Battery Health</p>
                  <p className="mt-1 text-sm text-gray-900">{batteryDetails.battery_health || '-'}%</p>
                </div>
              </div>

              {/* Battery Images */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {batteryDetails.battery_image_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">New Battery</p>
                    <a 
                      href={batteryDetails.battery_image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={batteryDetails.battery_image_url} 
                        alt="New Battery"
                        className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}
                {batteryDetails.old_battery_image_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Old Battery</p>
                    <a 
                      href={batteryDetails.old_battery_image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={batteryDetails.old_battery_image_url} 
                        alt="Old Battery"
                        className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}
                {batteryDetails.warranty_card_image_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Warranty Card</p>
                    <a 
                      href={batteryDetails.warranty_card_image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={batteryDetails.warranty_card_image_url} 
                        alt="Warranty Card"
                        className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VehicleMaintenanceHistoryPage({ params }: { params: { registration: string } }) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batteryDetails, setBatteryDetails] = useState<{ [key: string]: BatteryDetails }>({});
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchVehicleAndHistory();
  }, []);

  const fetchVehicleAndHistory = async () => {
    try {
      const rawRegistration = decodeURIComponent(params.registration.replace(/\+/g, ' '));
      const supabase = getSupabaseClient();
      
      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('registration', rawRegistration)
        .single();

      if (vehicleError) {
        if (vehicleError.code === 'PGRST116') {
          setError('Vehicle not found');
          return;
        }
        throw vehicleError;
      }
      
      setVehicle(vehicleData);

      // First fetch maintenance records
      const { data: historyData, error: historyError } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_registration', rawRegistration)
        .order('maintenance_date', { ascending: false });

      if (historyError) {
        console.error('History Error:', historyError);
        throw historyError;
      }

      // Process maintenance records
      const processedHistory = (historyData || []).map(record => {
        // Process maintenance types
        const maintenanceTypes = Array.isArray(record.maintenance_types) 
          ? record.maintenance_types 
          : typeof record.maintenance_types === 'string'
            ? [record.maintenance_types]
            : [];

        console.log('Processing record:', {
          id: record.id,
          types: maintenanceTypes,
          hasBattery: maintenanceTypes.includes('battery'),
          batteryDetailsId: record.battery_details
        });

        return {
          ...record,
          maintenance_types: maintenanceTypes
        };
      });

      // Fetch battery details for records that have battery maintenance
      const batteryRecords = processedHistory.filter(record => 
        record.maintenance_types.includes('battery') && record.battery_details
      );

      console.log('Battery Records:', batteryRecords);

      const batteryDetailsMap: { [key: string]: BatteryDetails } = {};

      if (batteryRecords.length > 0) {
        // Fetch battery details
        const { data: batteryData, error: batteryError } = await supabase
          .from('vehicle_batteries')
          .select('*')
          .in('id', batteryRecords.map(record => record.battery_details));

        if (batteryError) {
          console.error('Battery Error:', batteryError);
        } else if (batteryData) {
          console.log('Battery Data:', batteryData);
          
          batteryData.forEach(battery => {
            const record = batteryRecords.find(r => r.battery_details === battery.id);
            if (record) {
              // Add storage URL prefix if needed
              const getFullImageUrl = (url: string | null) => {
                if (!url) return null;
                if (url.startsWith('http')) return url;
                const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                console.log('Constructing image URL:', {
                  baseUrl: storageUrl,
                  imageUrl: url,
                  full: `${storageUrl}/storage/v1/object/public/battery-images/${url}`
                });
                return `${storageUrl}/storage/v1/object/public/battery-images/${url}`;
              };

              batteryDetailsMap[record.id] = {
                ...battery,
                battery_image_url: getFullImageUrl(battery.battery_image_url),
                old_battery_image_url: getFullImageUrl(battery.old_battery_image_url),
                warranty_card_image_url: getFullImageUrl(battery.warranty_card_image_url)
              };

              console.log('Added battery details:', {
                recordId: record.id,
                details: batteryDetailsMap[record.id]
              });
            }
          });
        }
      }

      console.log('Final Battery Details Map:', batteryDetailsMap);
      setBatteryDetails(batteryDetailsMap);
      setMaintenanceHistory(processedHistory);
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      setError('Failed to fetch vehicle details');
    } finally {
      setLoading(false);
    }
  };

  const renderBatteryDetails = (record: MaintenanceRecord) => {
    const battery = batteryDetails[record.id];
    if (!battery) return null;

    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Old Battery Number</p>
            <p className="text-sm text-gray-900">{battery.old_battery_number}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">New Battery Number</p>
            <p className="text-sm text-gray-900">{battery.new_battery_number}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Warranty End Date</p>
            <p className="text-sm text-gray-900">{formatDateForDisplay(battery.warranty_end_date)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Battery Health</p>
            <p className="text-sm text-gray-900">{battery.battery_health}%</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {battery.battery_image_url && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">New Battery Photo</p>
              <img src={battery.battery_image_url} alt="New Battery" className="rounded-lg w-full h-32 object-cover" />
            </div>
          )}
          {battery.old_battery_image_url && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Old Battery Photo</p>
              <img src={battery.old_battery_image_url} alt="Old Battery" className="rounded-lg w-full h-32 object-cover" />
            </div>
          )}
          {battery.warranty_card_image_url && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Warranty Card</p>
              <img src={battery.warranty_card_image_url} alt="Warranty Card" className="rounded-lg w-full h-32 object-cover" />
            </div>
          )}
        </div>
        {battery.warranty_details && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Warranty Details</p>
            <p className="text-sm text-gray-900 mt-1">{battery.warranty_details}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="inline-block p-4 rounded-full bg-red-50 mb-4">
            <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Vehicle not found</h2>
          <p className="text-gray-600 mb-6">
            The vehicle with registration number "{decodeURIComponent(params.registration.replace(/\+/g, ' '))}" could not be found in the system.
          </p>
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Maintenance
          </button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">
              {vehicle.model} ({vehicle.registration})
            </h1>
            <p className="text-sm text-gray-600">
              Vehicle Maintenance History
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Vehicle Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Details</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Registration</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{vehicle.registration}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Model</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{vehicle.model}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{vehicle.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance History Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance History</h3>
            {maintenanceHistory.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">No maintenance records found</p>
                <button
                  onClick={() => router.push(`/dashboard/maintenance/add?vehicle=${encodeURIComponent(vehicle.registration)}`)}
                  className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add First Maintenance Record
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Due
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Odometer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {maintenanceHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsModalOpen(true);
                          }}
                        >
                          {formatDateForDisplay(record.maintenance_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(record.cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.next_due_date ? formatDateForDisplay(record.next_due_date) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.odometer_reading.toLocaleString()} km
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.performed_by || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance Details Modal */}
      {selectedRecord && (
        <MaintenanceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
          batteryDetails={batteryDetails[selectedRecord.id]}
        />
      )}
    </div>
  );
} 
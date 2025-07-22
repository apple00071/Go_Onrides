'use client';

import { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';

interface BatteryMaintenanceFormProps {
  vehicleRegistration: string;
  onBatteryDetailsChange: (batteryId: string | null) => void;
}

export default function BatteryMaintenanceForm({ 
  vehicleRegistration,
  onBatteryDetailsChange 
}: BatteryMaintenanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batteryImage, setBatteryImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    oldBatteryNumber: '',
    newBatteryNumber: '',
    warrantyEndDate: '',
    batteryHealth: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBatteryImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = getSupabaseClient();
      let batteryImageUrl = null;

      // Upload battery image if exists
      if (batteryImage) {
        const fileExt = batteryImage.name.split('.').pop();
        const fileName = `${vehicleRegistration}-${Date.now()}.${fileExt}`;
        const filePath = `battery-images/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('maintenance')
          .upload(filePath, batteryImage);

        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('maintenance')
          .getPublicUrl(filePath);
          
        batteryImageUrl = publicUrl;
      }

      // Create battery record
      const { data: batteryData, error: batteryError } = await supabase
        .from('vehicle_batteries')
        .insert({
          vehicle_registration: vehicleRegistration,
          old_battery_number: formData.oldBatteryNumber,
          new_battery_number: formData.newBatteryNumber,
          battery_image_url: batteryImageUrl,
          warranty_end_date: formData.warrantyEndDate || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (batteryError) throw batteryError;

      // Pass battery ID back to parent
      onBatteryDetailsChange(batteryData.id);

    } catch (error) {
      console.error('Error saving battery details:', error);
      setError(error instanceof Error ? error.message : 'Failed to save battery details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-medium">Battery Details</h3>
      
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Old Battery Number
          </label>
          <input
            type="text"
            name="oldBatteryNumber"
            value={formData.oldBatteryNumber}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            New Battery Number *
          </label>
          <input
            type="text"
            name="newBatteryNumber"
            value={formData.newBatteryNumber}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Warranty End Date
          </label>
          <input
            type="date"
            name="warrantyEndDate"
            value={formData.warrantyEndDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Battery Health (%)
          </label>
          <input
            type="number"
            name="batteryHealth"
            value={formData.batteryHealth}
            onChange={handleChange}
            min="0"
            max="100"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Battery Image Upload */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Battery Image
        </label>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Camera className="h-5 w-5 inline-block mr-2" />
            Upload Image
          </button>

          {imagePreview && (
            <div className="relative h-20 w-20">
              <Image
                src={imagePreview}
                alt="Battery preview"
                fill
                className="object-cover rounded-md"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
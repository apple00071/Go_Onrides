'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Camera, X } from 'lucide-react';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';

interface BatteryMaintenanceFormProps {
  vehicleRegistration: string;
  onBatteryDetailsChange: (batteryId: string | null) => void;
}

interface ImageUpload {
  file: File;
  preview: string;
}

export interface BatteryFormHandle {
  handleSubmit: () => Promise<void>;
}

const STORAGE_BUCKET = 'maintenance';  // Change this to match your Supabase bucket name

const BatteryMaintenanceForm = forwardRef<BatteryFormHandle, BatteryMaintenanceFormProps>(({ 
  vehicleRegistration,
  onBatteryDetailsChange 
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<{
    battery?: ImageUpload;
    oldBattery?: ImageUpload;
    warrantyCard?: ImageUpload;
  }>({});
  
  const fileInputRefs = {
    battery: useRef<HTMLInputElement>(null),
    oldBattery: useRef<HTMLInputElement>(null),
    warrantyCard: useRef<HTMLInputElement>(null)
  };

  const [formData, setFormData] = useState({
    oldBatteryNumber: '',
    newBatteryNumber: '',
    warrantyEndDate: '',
    batteryHealth: '',
    warrantyDetails: ''
  });

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.newBatteryNumber) {
        const error = 'New battery number is required';
        setError(error);
        throw new Error(error);
      }

      setLoading(true);
      setError(null);
      
      const supabase = getSupabaseClient();
      const imageUrls: { [key: string]: string } = {};

      // Upload all images
      for (const [type, image] of Object.entries(images)) {
        if (image?.file) {
          const fileExt = image.file.name.split('.').pop();
          const fileName = `battery/${vehicleRegistration}-${type}-${Date.now()}.${fileExt}`;

          console.log('Uploading image:', {
            type,
            fileName,
            bucket: STORAGE_BUCKET
          });

          // Upload the file
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, image.file);

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            throw new Error(`Failed to upload ${type} image: ${uploadError.message}`);
          }
          
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);
            
          // Map the image type to the correct field name
          const fieldMap = {
            'battery': 'battery_image_url',
            'oldBattery': 'old_battery_image_url',
            'warrantyCard': 'warranty_card_image_url'
          };
          
          imageUrls[fieldMap[type as keyof typeof fieldMap]] = publicUrl;
          
          console.log('Image uploaded successfully:', {
            type,
            url: publicUrl
          });
        }
      }

      console.log('Creating battery record with data:', {
        registration: vehicleRegistration,
        formData,
        imageUrls
      });

      // Create battery record
      const { data: batteryData, error: batteryError } = await supabase
        .from('vehicle_batteries')
        .insert({
          vehicle_registration: vehicleRegistration,
          old_battery_number: formData.oldBatteryNumber.trim(),
          new_battery_number: formData.newBatteryNumber.trim(),
          battery_image_url: imageUrls.battery_image_url || null,
          old_battery_image_url: imageUrls.old_battery_image_url || null,
          warranty_card_image_url: imageUrls.warranty_card_image_url || null,
          warranty_end_date: formData.warrantyEndDate ? new Date(formData.warrantyEndDate).toISOString() : null,
          warranty_details: formData.warrantyDetails.trim(),
          battery_health: formData.batteryHealth ? parseInt(formData.batteryHealth) : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (batteryError) {
        console.error('Error creating battery record:', batteryError);
        throw new Error(`Failed to create battery record: ${batteryError.message}`);
      }

      if (!batteryData || !batteryData.id) {
        throw new Error('No battery ID received from server');
      }

      console.log('Battery record created successfully:', batteryData);

      // Pass battery ID back to parent
      onBatteryDetailsChange(batteryData.id);

    } catch (error) {
      console.error('Error saving battery details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save battery details';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Expose handleSubmit to parent component
  useImperativeHandle(ref, () => ({
    handleSubmit
  }));

  const handleImageChange = (type: 'battery' | 'oldBattery' | 'warrantyCard', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({
          ...prev,
          [type]: {
            file,
            preview: reader.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (type: 'battery' | 'oldBattery' | 'warrantyCard') => {
    setImages(prev => {
      const newImages = { ...prev };
      delete newImages[type];
      return newImages;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderImageUpload = (type: 'battery' | 'oldBattery' | 'warrantyCard', label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <input
        type="file"
        ref={fileInputRefs[type]}
        onChange={(e) => handleImageChange(type, e)}
        accept="image/*"
        className="hidden"
      />

      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={() => fileInputRefs[type].current?.click()}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Camera className="h-5 w-5 inline-block mr-2" />
          Upload Image
        </button>

        {images[type] && (
          <div className="relative">
            <div className="relative h-20 w-20">
              <Image
                src={images[type]!.preview}
                alt={`${label} preview`}
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => removeImage(type)}
              className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Battery Details</h3>
      
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Old Battery Number
          </label>
          <input
            type="text"
            name="oldBatteryNumber"
            value={formData.oldBatteryNumber}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            New Battery Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="newBatteryNumber"
            value={formData.newBatteryNumber}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Warranty Details
          </label>
          <textarea
            name="warrantyDetails"
            value={formData.warrantyDetails}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter warranty terms and conditions"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Documentation</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderImageUpload('battery', 'New Battery Photo')}
          {renderImageUpload('oldBattery', 'Old Battery Photo')}
          {renderImageUpload('warrantyCard', 'Warranty Card Photo')}
        </div>
      </div>
    </div>
  );
});

BatteryMaintenanceForm.displayName = 'BatteryMaintenanceForm';

export default BatteryMaintenanceForm; 
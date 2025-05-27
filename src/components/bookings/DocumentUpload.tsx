import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface DocumentUploadProps {
  customerId: string;
  documentType: 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';
  onUploadComplete: (url: string) => void;
  existingUrl?: string;
}

const BUCKET_NAME = 'customer-documents';

export default function DocumentUpload({
  customerId,
  documentType,
  onUploadComplete,
  existingUrl
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const supabase = getSupabaseClient();

      // Delete existing file if any
      if (preview) {
        try {
          const existingPath = new URL(preview).pathname.split('/').pop();
          if (existingPath) {
            await supabase.storage
              .from(BUCKET_NAME)
              .remove([`${customerId}/${existingPath}`]);
          }
        } catch (error) {
          console.warn('Failed to delete existing file:', error);
          // Continue with upload even if delete fails
        }
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${customerId}/${documentType}_${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Changed to true to handle existing files
        });

      if (uploadError) {
        throw uploadError;
      }

      if (!data) {
        throw new Error('No data returned from upload');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      // Update preview
      setPreview(urlData.publicUrl);
      
      // Notify parent component
      onUploadComplete(urlData.publicUrl);
      
      toast.success('Document uploaded successfully');
    } catch (error: any) {
      console.error('Upload error details:', error);
      toast.error(error.message || 'Failed to upload document. Please try again.');
      // Reset the file input
      e.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!preview) return;

    try {
      const supabase = getSupabaseClient();
      const existingPath = new URL(preview).pathname.split('/').pop();

      if (existingPath) {
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([`${customerId}/${existingPath}`]);

        if (deleteError) {
          throw deleteError;
        }
      }

      setPreview(null);
      onUploadComplete('');
      toast.success('Document removed successfully');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error(error.message || 'Failed to remove document');
    }
  };

  const documentLabels = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Card Front',
    aadhar_back: 'Aadhar Card Back',
    dl_front: 'Driving License Front',
    dl_back: 'Driving License Back'
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {documentLabels[documentType]}
      </label>
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={documentLabels[documentType]}
            className="w-full h-40 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id={`file-${documentType}`}
            disabled={uploading}
          />
          <label
            htmlFor={`file-${documentType}`}
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer 
              ${uploading 
                ? 'border-gray-400 bg-gray-50' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className={`h-8 w-8 ${uploading ? 'text-gray-400' : 'text-gray-500'}`} />
              <p className="mt-2 text-sm text-gray-500">
                {uploading ? 'Uploading...' : 'Click to upload'}
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
} 
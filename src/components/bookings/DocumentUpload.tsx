import { useState } from 'react';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

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
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }

    await uploadFile(file);
    setShowOptions(false);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const supabase = createClientComponentClient();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${customerId}-${documentType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onUploadComplete?.(publicUrl);
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
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
    } catch (error: unknown) {
      console.error('Remove error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove document';
      toast.error(errorMessage);
    }
  };
  
  const requestPermissions = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Requesting camera access...');
      
      // Request camera permission first
      if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
        // This will trigger the browser permission dialog for camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the stream immediately after permission is granted
        cameraStream.getTracks().forEach(track => track.stop());
        
        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success('Camera access granted. You can now take photos or select from gallery.');
      } else {
        // Device doesn't support camera API
        toast.dismiss(loadingToast);
        toast.error('Your device doesn\'t support camera access. Try uploading from gallery.');
      }
      
      // Show the upload options
      setShowOptions(true);
    } catch (err) {
      console.error('Permission request error:', err);
      toast.error('Camera access denied. You may need to enable it in your device settings. You can still upload from gallery.');
      // Still show options even if camera permission is denied
      // as user might want to upload from gallery
      setShowOptions(true);
    }
  };
  
  const toggleOptions = () => {
    if (!showOptions) {
      requestPermissions();
    } else {
      setShowOptions(false);
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
          <Image
            src={preview}
            alt={documentLabels[documentType]}
            width={400}
            height={160}
            className="w-full h-40 object-cover rounded-lg"
            style={{ width: 'auto', height: '160px' }}
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={toggleOptions}
            className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={uploading}
          >
            <Upload className="h-5 w-5 mr-2 text-gray-500" />
            <span className="text-sm text-gray-700">Upload Document</span>
          </button>
          
          {showOptions && (
            <div className="flex flex-col gap-2 border rounded-lg p-4 bg-gray-50 animate-fadeIn">
              <label
                htmlFor={`camera-${documentType}`}
                className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Camera className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-sm text-gray-700">Take Photo (Camera Access Required)</span>
                <input
                  type="file"
                  id={`camera-${documentType}`}
                  accept="image/*"
                  capture={documentType === 'customer_photo' ? 'user' : 'environment'}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              
              <label
                htmlFor={`gallery-${documentType}`}
                className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
              >
                <ImageIcon className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-sm text-gray-700">Choose from Gallery (Storage Access Required)</span>
                <input
                  type="file"
                  id={`gallery-${documentType}`}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          )}
          
          {uploading && (
            <p className="text-center text-sm text-gray-500 mt-2">Uploading...</p>
          )}
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 
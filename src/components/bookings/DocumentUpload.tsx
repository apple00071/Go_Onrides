import { useState } from 'react';
import { Upload, X } from 'lucide-react';
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError('No file selected');
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

    setUploading(true);
    setError(null);

    try {
      const supabase = createClientComponentClient();
      const fileExt = file.name.split('.').pop();
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
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 
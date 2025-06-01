import { useState, useRef } from 'react';
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
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    await uploadFile(file);
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

  const openCamera = async () => {
    try {
      setShowCamera(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: documentType === 'customer_photo' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Failed to access camera. Please check permissions.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `${documentType}-${Date.now()}.jpg`, { type: 'image/jpeg' });
          closeCamera();
          await uploadFile(file);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
      
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="bg-black p-4 flex justify-between items-center">
            <button
              type="button"
              onClick={closeCamera}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Capture
            </button>
          </div>
        </div>
      )}
      
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
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id={`file-${documentType}`}
            disabled={uploading}
          />
          
          <button
            type="button"
            onClick={openCamera}
            className="flex flex-col items-center justify-center w-full h-20 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={uploading}
          >
            <div className="flex items-center justify-center">
              <Camera className="h-5 w-5 mr-2 text-gray-500" />
              <span className="text-sm text-gray-700">Take Photo</span>
            </div>
          </button>
          
          <button
            type="button"
            onClick={openGallery}
            className="flex flex-col items-center justify-center w-full h-20 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={uploading}
          >
            <div className="flex items-center justify-center">
              <ImageIcon className="h-5 w-5 mr-2 text-gray-500" />
              <span className="text-sm text-gray-700">Choose from Gallery</span>
            </div>
          </button>
          
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
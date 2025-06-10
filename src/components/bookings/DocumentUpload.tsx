import { useState, useRef, useEffect } from 'react';
import { Upload, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { validateFileType, validateAadhaarDocument, type DocumentType } from '@/lib/documentValidation';
import CameraOverlay from '@/components/ui/CameraOverlay';

interface DocumentUploadProps {
  customerId: string;
  documentType: DocumentType;
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
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showCameraOverlay, setShowCameraOverlay] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  
  // Create a hidden file input element
  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    return () => {
      document.body.removeChild(input);
    };
  }, []);

  const getOverlayType = () => {
    if (documentType === 'customer_photo') return 'photo';
    if (documentType.startsWith('aadhar_')) return 'aadhar';
    if (documentType.startsWith('dl_')) return 'dl';
    return 'photo';
  };

  const handleFileSelection = async (captureMethod: 'camera' | 'gallery') => {
    try {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (!fileInput) return;

      // Configure file input
      if (captureMethod === 'camera') {
        fileInput.setAttribute('capture', 'environment');
        setShowCameraOverlay(true);
      } else {
        fileInput.removeAttribute('capture');
      }
      
      fileInput.onchange = async (e: Event) => {
        setShowCameraOverlay(false);
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) return;
        
        // Basic file validation
        const fileValidation = validateFileType(file);
        if (!fileValidation.isValid) {
          setError(fileValidation.message);
          return;
        }

        // Additional validation for Aadhaar documents
        if (documentType === 'aadhar_front' || documentType === 'aadhar_back') {
          setValidating(true);
          setError(null);
          setOcrProgress('Initializing OCR...');
          
          try {
            const aadhaarValidation = await validateAadhaarDocument(file);
            console.log('Validation result:', aadhaarValidation);
            
            if (!aadhaarValidation.isValid) {
              setError(aadhaarValidation.message);
              if (aadhaarValidation.debug) {
                console.log('Validation debug info:', aadhaarValidation.debug);
                if (aadhaarValidation.debug.matchedPatterns?.length > 0) {
                  setError(`Document validation failed. Could not find all required Aadhaar card elements. Found: ${aadhaarValidation.debug.matchedPatterns.join(', ')}`);
                }
              }
              setValidating(false);
              return;
            }
          } catch (err) {
            console.error('Validation error:', err);
            setError('Error validating Aadhaar document. Please try again with a clearer image.');
            setValidating(false);
            return;
          }
          
          setValidating(false);
          setOcrProgress('');
        }

        await uploadFile(file);
      };
      
      fileInput.click();
    } catch (err) {
      console.error('Error selecting document:', err);
      toast.error('Failed to open file picker');
    } finally {
      setShowUploadOptions(false);
    }
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
      toast.success('Document uploaded successfully');
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowUploadOptions(true)}
            className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={uploading || validating}
          >
            {validating ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 mr-2 text-gray-500" />
            )}
            <span className="text-sm text-gray-700">
              {validating ? 'Validating...' : uploading ? 'Uploading...' : 'Upload Document'}
            </span>
          </button>
          
          {(uploading || validating) && (
            <div className="text-center space-y-1">
              <p className="text-sm text-gray-500">
                {validating ? 'Validating document...' : 'Uploading...'}
              </p>
              {ocrProgress && (
                <p className="text-xs text-gray-400">{ocrProgress}</p>
              )}
            </div>
          )}

          {/* Upload Options Modal */}
          {showUploadOptions && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-80 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Choose Upload Method</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleFileSelection('camera')}
                    className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-5 w-5 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">Take Photo</span>
                  </button>
                  <button
                    onClick={() => handleFileSelection('gallery')}
                    className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ImageIcon className="h-5 w-5 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">Choose from Gallery</span>
                  </button>
                  <button
                    onClick={() => setShowUploadOptions(false)}
                    className="flex items-center justify-center w-full py-2 px-4 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Camera Overlay */}
          <CameraOverlay
            documentType={getOverlayType()}
            isVisible={showCameraOverlay}
          />
        </div>
      )}
      
      {error && (
        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
} 
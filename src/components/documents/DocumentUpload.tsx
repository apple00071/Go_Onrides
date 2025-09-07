'use client';

import { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface DocumentUploadProps {
  bookingId: string;
  onDocumentsUploaded: (documents: UploadedDocuments) => void;
  existingDocuments?: UploadedDocuments;
}

interface UploadedDocuments {
  customer_photo?: string;
  aadhar_front?: string;
  aadhar_back?: string;
  dl_front?: string;
  dl_back?: string;
}

const STORAGE_BUCKET = 'customer-documents';

export default function DocumentUpload({ bookingId, onDocumentsUploaded, existingDocuments }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocuments>(existingDocuments || {});
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [tempPreviews, setTempPreviews] = useState<Record<string, string>>({});
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const supabase = getSupabaseClient();

  const getPublicUrl = async (path: string): Promise<string | undefined> => {
    try {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      // Add cache busting parameter to prevent browser caching
      return data.publicUrl + '?t=' + new Date().getTime();
    } catch (error) {
      console.error('Error getting public URL:', error);
      return undefined;
    }
  };

  useEffect(() => {
    if (existingDocuments) {
      setDocuments(existingDocuments);
      // Get URLs for all existing documents
      Object.entries(existingDocuments).forEach(([type, path]) => {
        if (path) {
          // If the path is already a full URL, use it directly
          if (path.startsWith('http')) {
            setDocumentUrls(prev => ({ ...prev, [type]: path }));
          } else {
            // Otherwise, get the public URL from storage
            const supabase = getSupabaseClient();
            const { data } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(path);
            if (data?.publicUrl) {
              setDocumentUrls(prev => ({ ...prev, [type]: data.publicUrl }));
            }
          }
        }
      });
    }
    setLoadingDocuments(false);
  }, [existingDocuments]);

  const handleFileUpload = async (file: File, type: keyof UploadedDocuments) => {
    try {
      setUploading(true);
      
      // Create temporary preview immediately
      const previewUrl = URL.createObjectURL(file);
      setTempPreviews(prev => ({ ...prev, [type]: previewUrl }));

      // If there's an existing file, delete it first
      if (documents[type]) {
        const { error: deleteError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([documents[type]!]);

        if (deleteError) {
          console.error('Error deleting existing file:', deleteError);
          toast.error('Failed to delete existing file');
          return;
        }
      }

      // Generate unique filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `${type}_${timestamp}`;
      const filePath = `${bookingId}/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: 'no-cache'
        });

      if (error) throw error;

      // Update documents state with new path
      const newDocuments = { ...documents, [type]: data.path };
      setDocuments(newDocuments);
      
      // Get and set the public URL
      const publicUrl = await getPublicUrl(data.path);
      if (publicUrl) {
        setDocumentUrls(prev => {
          const newUrls = { ...prev };
          newUrls[type] = publicUrl;
          return newUrls;
        });
      }

      // Reset file inputs
      if (fileInputRefs.current[type]) {
        fileInputRefs.current[type]!.value = '';
      }
      if (fileInputRefs.current[`${type}_camera`]) {
        fileInputRefs.current[`${type}_camera`]!.value = '';
      }
      if (fileInputRefs.current[`${type}_reupload_gallery`]) {
        fileInputRefs.current[`${type}_reupload_gallery`]!.value = '';
      }
      if (fileInputRefs.current[`${type}_reupload_camera`]) {
        fileInputRefs.current[`${type}_reupload_camera`]!.value = '';
      }

      // Clean up preview URL only after public URL is available
      URL.revokeObjectURL(previewUrl);
      setTempPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[type];
        return newPreviews;
      });

      // Notify parent component
      if (onDocumentsUploaded) {
        onDocumentsUploaded(newDocuments);
      }

      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
      
      // Clean up preview on error
      setTempPreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[type];
        return newPreviews;
      });
      
      // Reset file inputs on error too
      if (fileInputRefs.current[type]) {
        fileInputRefs.current[type]!.value = '';
      }
      if (fileInputRefs.current[`${type}_camera`]) {
        fileInputRefs.current[`${type}_camera`]!.value = '';
      }
      if (fileInputRefs.current[`${type}_reupload_gallery`]) {
        fileInputRefs.current[`${type}_reupload_gallery`]!.value = '';
      }
      if (fileInputRefs.current[`${type}_reupload_camera`]) {
        fileInputRefs.current[`${type}_reupload_camera`]!.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: keyof UploadedDocuments) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  };

  const handleRemoveDocument = async (type: keyof UploadedDocuments) => {
    try {
      console.log('Removing document:', type, 'Current documents:', documents);
      setUploading(true);

      // If there's an existing file, delete it from storage
      if (documents[type]) {
        console.log('Deleting from storage:', documents[type]);
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([documents[type]!]);

        if (error) {
          console.error('Storage deletion error:', error);
          throw error;
        }

        // Update state
        const newDocuments = { ...documents };
        delete newDocuments[type];
        console.log('New documents after removal:', newDocuments);
        setDocuments(newDocuments);

        // Reset file inputs
        if (fileInputRefs.current[type]) {
          fileInputRefs.current[type]!.value = '';
        }
        if (fileInputRefs.current[`${type}_camera`]) {
          fileInputRefs.current[`${type}_camera`]!.value = '';
        }
        if (fileInputRefs.current[`${type}_reupload_gallery`]) {
          fileInputRefs.current[`${type}_reupload_gallery`]!.value = '';
        }
        if (fileInputRefs.current[`${type}_reupload_camera`]) {
          fileInputRefs.current[`${type}_reupload_camera`]!.value = '';
        }

        // Remove from URLs and previews
        setDocumentUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[type];
          return newUrls;
        });

        setTempPreviews(prev => {
          const newPreviews = { ...prev };
          delete newPreviews[type];
          return newPreviews;
        });

        // Notify parent component with updated documents
        console.log('Notifying parent with updated documents:', newDocuments);
        onDocumentsUploaded(newDocuments);

        toast.success('Document removed successfully');
      } else {
        console.log('No document to remove for type:', type);
        toast('No document to remove');
      }
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatDocumentType = (type: keyof UploadedDocuments): string => {
    return type.toString().split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const documentTypes: Record<string, string> = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Front',
    aadhar_back: 'Aadhar Back',
    dl_front: 'DL Front',
    dl_back: 'DL Back',
  };

  const setFileInputRef = (type: string, el: HTMLInputElement | null) => {
    if (el) {
      fileInputRefs.current[type] = el;
    }
  };

  const renderUploadSection = (type: keyof UploadedDocuments, label: string) => {
    const hasFile = documents[type];
    const hasTempPreview = tempPreviews[type];
    // Use placeholder image only if no document exists
    const displayUrl = hasTempPreview ? tempPreviews[type] : (documentUrls[type] || (hasFile ? '' : '/placeholder-image.png'));

    if (loadingDocuments) {
      return (
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <div className="border-2 border-dashed rounded-lg p-4 h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {hasFile && <span className="ml-2 text-green-600 text-xs">(Document exists)</span>}
        </label>
        <div className="relative group">
          <div className={`border-2 border-dashed rounded-lg p-4 h-40 flex flex-col items-center justify-center transition-colors ${hasFile || hasTempPreview ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
            {(hasFile || hasTempPreview) && displayUrl ? (
              <>
                <div className="relative w-full h-full">
                  <Image
                    src={displayUrl}
                    alt={label}
                    fill
                    className="object-contain rounded"
                    unoptimized={true}
                  />
                  {!uploading && (
                    <div className="absolute top-1 right-1 flex space-x-1">
                      {/* Gallery upload input */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, type)}
                        className="hidden"
                        ref={(el) => setFileInputRef(`${type}_reupload_gallery`, el)}
                      />
                      {/* Camera upload input */}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileChange(e, type)}
                        className="hidden"
                        ref={(el) => setFileInputRef(`${type}_reupload_camera`, el)}
                      />
                      {/* Camera button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Camera reupload clicked for:', type);
                          const input = fileInputRefs.current[`${type}_reupload_camera`];
                          if (input) {
                            input.click();
                          } else {
                            console.error('Camera reupload input not found for:', type);
                          }
                        }}
                        className="p-1 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                        title="Take new photo"
                        disabled={uploading}
                      >
                        <Camera className="h-4 w-4 text-green-600" />
                      </button>
                      {/* Gallery button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Gallery reupload clicked for:', type);
                          const input = fileInputRefs.current[`${type}_reupload_gallery`];
                          if (input) {
                            input.click();
                          } else {
                            console.error('Gallery reupload input not found for:', type);
                          }
                        }}
                        className="p-1 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
                        title="Choose from gallery"
                        disabled={uploading}
                      >
                        <Upload className="h-4 w-4 text-blue-600" />
                      </button>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Remove button clicked for:', type);
                          handleRemoveDocument(type);
                        }}
                        className="p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                        title="Remove file"
                        disabled={uploading}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, type)}
                  className="hidden"
                  ref={(el) => setFileInputRef(type, el)}
                  name={type}
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(e, type)}
                  className="hidden"
                  ref={(el) => setFileInputRef(`${type}_camera`, el)}
                  name={`${type}_camera`}
                />
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const input = fileInputRefs.current[type];
                        if (input) {
                          input.click();
                        }
                      }}
                      className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                    >
                      Browse Files
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const input = fileInputRefs.current[`${type}_camera`];
                        if (input) {
                          input.click();
                        }
                      }}
                      className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                    >
                      Take Photo
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h4 className="font-medium text-gray-900">Upload Documents</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderUploadSection('customer_photo', 'Customer Photo')}
        {renderUploadSection('aadhar_front', 'Aadhar Front')}
        {renderUploadSection('aadhar_back', 'Aadhar Back')}
        {renderUploadSection('dl_front', 'DL Front')}
        {renderUploadSection('dl_back', 'DL Back')}
      </div>
    </div>
  );
} 
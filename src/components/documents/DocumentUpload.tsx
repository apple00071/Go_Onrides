'use client';

import React, { useState, useEffect } from 'react';
import { Upload, X, Camera, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSupabaseClient } from '@/lib/supabase';
import type { UploadedDocuments } from '@/types/bookings';

interface DocumentUploadProps {
  bookingId: string;
  onDocumentsUploaded: (documents: UploadedDocuments) => void;
  existingDocuments?: UploadedDocuments;
}

export default function DocumentUpload({ bookingId, onDocumentsUploaded, existingDocuments }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocuments>(existingDocuments || {});
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [tempPreviews, setTempPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingDocuments) {
      setDocuments(existingDocuments);
    }
    setLoadingDocuments(false);
  }, [existingDocuments]);

  const handleFileUpload = async (file: File, type: keyof UploadedDocuments) => {
    try {
      // Show immediate preview
      const previewUrl = URL.createObjectURL(file);
      setTempPreviews(prev => ({ ...prev, [type]: previewUrl }));
      
      setUploading(true);
      const supabase = getSupabaseClient();

      // If there's an existing document, delete it first
      if (documents[type]) {
        const existingFileName = documents[type]?.split('/').pop();
        if (existingFileName) {
          await supabase.storage
            .from('customer-documents')
            .remove([`${bookingId}/${existingFileName}`]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${bookingId}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(fileName);

      const updatedDocuments = {
        ...documents,
        [type]: publicUrl
      };

      setDocuments(updatedDocuments);
      onDocumentsUploaded(updatedDocuments);
      
      // Clean up preview URL
      URL.revokeObjectURL(previewUrl);
      setTempPreviews(prev => {
        const { [type]: removed, ...rest } = prev;
        return rest;
      });
      
      toast.success(`${formatDocumentType(type)} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading file:', error);
      // Clean up preview URL on error
      setTempPreviews(prev => {
        const { [type]: removed, ...rest } = prev;
        return rest;
      });
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (type: keyof UploadedDocuments) => {
    try {
      const supabase = getSupabaseClient();
      const fileName = documents[type]?.split('/').pop();

      if (fileName) {
        await supabase.storage
          .from('customer-documents')
          .remove([`${bookingId}/${fileName}`]);
      }

      const updatedDocuments = { ...documents };
      delete updatedDocuments[type];

      setDocuments(updatedDocuments);
      onDocumentsUploaded(updatedDocuments);
      toast.success(`${formatDocumentType(type)} removed`);
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
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

  const renderUploadSection = (type: keyof UploadedDocuments, label: string) => {
    const hasFile = documents[type];
    const hasTempPreview = tempPreviews[type];
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const cameraInputRef = React.useRef<HTMLInputElement>(null);

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
    };

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
            {(hasFile || hasTempPreview) ? (
              <>
                <div className="relative w-full h-full">
                  <img
                    src={hasTempPreview ? tempPreviews[type] : documents[type]}
                    alt={label}
                    className="w-full h-full object-contain rounded"
                  />
                  {!uploading && (
                    <div className="absolute top-1 right-1 flex space-x-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
                        title="Reupload"
                      >
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleRemoveFile(type)}
                        className="p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                        title="Remove file"
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
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, type);
                  }}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
                <div className="flex flex-col items-center">
                  <div className="flex space-x-4 mb-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={uploading}
                    >
                      <Upload className="h-6 w-6 text-gray-600" />
                      <span className="ml-2 text-sm text-gray-600">Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={uploading}
                    >
                      <Camera className="h-6 w-6 text-gray-600" />
                      <span className="ml-2 text-sm text-gray-600">Camera</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    {hasFile ? 'Replace existing document' : 'Upload or capture ' + label}
                  </p>
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
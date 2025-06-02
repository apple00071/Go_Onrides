'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

type DocumentType = 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';

interface DocumentUploadSectionProps {
  onDocumentsChange: (documents: Record<DocumentType, File | null>) => void;
}

export default function DocumentUploadSection({ onDocumentsChange }: DocumentUploadSectionProps) {
  const [documents, setDocuments] = useState<Record<DocumentType, File | null>>({
    customer_photo: null,
    aadhar_front: null,
    aadhar_back: null,
    dl_front: null,
    dl_back: null
  });

  const [previews, setPreviews] = useState<Partial<Record<DocumentType, string>>>({});

  const documentLabels: Record<DocumentType, string> = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Card - Front',
    aadhar_back: 'Aadhar Card - Back',
    dl_front: 'Driving License - Front',
    dl_back: 'Driving License - Back'
  };

  // Handle file selection from native device dialog
  const handleDocumentSelection = (type: DocumentType) => async () => {
    try {
      // Use the native file input to trigger device's file picker
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      // Use a broader MIME type to encourage the OS to show all relevant apps
      fileInput.accept = "image/*,video/*";
      
      // Handle the file selection
      fileInput.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const file = target.files[0];
          
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

          processImageFile(file, type);
        }
      };
      
      // Trigger the file dialog
      fileInput.click();
    } catch (error) {
      console.error('Error selecting document:', error);
      toast.error('Failed to open file picker');
    }
  };

  // Process the image file
  const processImageFile = (file: File, documentType: DocumentType) => {
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({
        ...prev,
        [documentType]: reader.result as string
      }));
    };
    reader.readAsDataURL(file);

    // Update documents
    const updatedDocuments = {
      ...documents,
      [documentType]: file
    };
    setDocuments(updatedDocuments);
    onDocumentsChange(updatedDocuments);
    
    toast.success(`${documentLabels[documentType]} uploaded successfully`);
  };

  // Remove a document
  const removeDocument = (type: DocumentType) => {
    const updatedDocuments = {
      ...documents,
      [type]: null
    };
    setDocuments(updatedDocuments);
    setPreviews(prev => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
    onDocumentsChange(updatedDocuments);
    toast.success(`${documentLabels[type]} removed`);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Required Documents</h3>
      
      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.entries(documentLabels) as [DocumentType, string][]).map(([type, label]) => (
          <div key={type} className="border rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
            {previews[type] ? (
              <div className="relative">
                <Image
                  src={previews[type]!}
                  alt={label}
                  width={200}
                  height={150}
                  className="rounded-lg object-cover"
                  style={{ width: 'auto', height: '150px' }}
                />
                <button
                  onClick={() => removeDocument(type)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleDocumentSelection(type)}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-500 mt-2">Upload Document</p>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 
'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

type DocumentType = 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';

interface DocumentUploadSectionProps {
  onDocumentsChange: (documents: Record<DocumentType, File | null>) => void;
}

export default function DocumentUploadSection({ onDocumentsChange }: DocumentUploadSectionProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [activeDocument, setActiveDocument] = useState<DocumentType | null>(null);
  const [showChooser, setShowChooser] = useState(false);

  useEffect(() => {
    const checkBrowser = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkBrowser();
  }, []);

  const [documents, setDocuments] = useState<Record<DocumentType, File | null>>({
    customer_photo: null,
    aadhar_front: null,
    aadhar_back: null,
    dl_front: null,
    dl_back: null
  });

  const [previews, setPreviews] = useState<Partial<Record<DocumentType, string>>>({});
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const documentLabels: Record<DocumentType, string> = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Card - Front',
    aadhar_back: 'Aadhar Card - Back',
    dl_front: 'Driving License - Front',
    dl_back: 'Driving License - Back'
  };

  const handleFileChange = (type: DocumentType) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({
          ...prev,
          [type]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);

      // Update documents
      const updatedDocuments = {
        ...documents,
        [type]: file
      };
      setDocuments(updatedDocuments);
      onDocumentsChange(updatedDocuments);

      // Reset the input value to allow selecting the same file again
      e.target.value = '';
      setShowChooser(false);
    }
  };

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
  };

  const handleUploadClick = (type: DocumentType) => {
    setActiveDocument(type);
    setShowChooser(true);
  };

  const handleOptionClick = (useCamera: boolean) => {
    if (!activeDocument) return;

    if (useCamera) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    } else {
      if (galleryInputRef.current) {
        galleryInputRef.current.click();
      }
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Global file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={e => activeDocument && handleFileChange(activeDocument)(e)}
      />
      <input
        type="file"
        ref={galleryInputRef}
        className="hidden"
        accept="image/*"
        onChange={e => activeDocument && handleFileChange(activeDocument)(e)}
      />

      {/* Chooser Dialog */}
      {showChooser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80 max-w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Source</h3>
            <div className="space-y-2">
              {isMobile && (
                <button
                  onClick={() => handleOptionClick(true)}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </button>
              )}
              <button
                onClick={() => handleOptionClick(false)}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                Choose from Gallery
              </button>
              <button
                onClick={() => setShowChooser(false)}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-medium text-gray-900">Required Documents</h3>
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
              <div>
                <button
                  onClick={() => handleUploadClick(type)}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Upload className="h-5 w-5 mr-2 text-gray-400" />
                  Upload Document
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 
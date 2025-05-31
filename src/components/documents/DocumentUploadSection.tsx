'use client';

import { useState, useRef } from 'react';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

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
  const [activeType, setActiveType] = useState<DocumentType | null>(null);
  const [showChooser, setShowChooser] = useState(false);

  // Separate refs for camera and gallery inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const documentLabels: Record<DocumentType, string> = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Card - Front',
    aadhar_back: 'Aadhar Card - Back',
    dl_front: 'Driving License - Front',
    dl_back: 'Driving License - Back'
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeType) return;

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
          [activeType]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);

      // Update documents
      const updatedDocuments = {
        ...documents,
        [activeType]: file
      };
      setDocuments(updatedDocuments);
      onDocumentsChange(updatedDocuments);

      // Reset the input value to allow selecting the same file again
      e.target.value = '';
      setShowChooser(false);
      setActiveType(null);
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
    setActiveType(type);
    setShowChooser(true);
  };

  const handleSourceSelect = (useCamera: boolean) => {
    if (!activeType) return;

    try {
      if (useCamera) {
        if (cameraInputRef.current) {
          cameraInputRef.current.click();
        }
      } else {
        if (galleryInputRef.current) {
          galleryInputRef.current.click();
        }
      }
    } catch (error) {
      console.error('Error accessing input:', error);
      alert('Failed to access ' + (useCamera ? 'camera' : 'gallery') + '. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden global inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={galleryInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Chooser Dialog */}
      {showChooser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowChooser(false)}
        >
          <div 
            className="bg-white rounded-lg p-4 w-80 max-w-[90%] shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-lg font-medium text-gray-900 mb-4 text-center">
              Select Source
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleSourceSelect(true)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </button>
              <button
                onClick={() => handleSourceSelect(false)}
                className="w-full py-3 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Choose from Gallery</span>
              </button>
              <button
                onClick={() => setShowChooser(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-900 transition-colors"
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
              <button
                onClick={() => handleUploadClick(type)}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Upload Document</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 
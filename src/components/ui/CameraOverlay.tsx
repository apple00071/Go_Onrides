import React from 'react';

interface CameraOverlayProps {
  documentType: 'aadhar' | 'dl' | 'photo';
  isVisible: boolean;
}

export default function CameraOverlay({ documentType, isVisible }: CameraOverlayProps) {
  if (!isVisible) return null;

  const getOverlayDimensions = () => {
    switch (documentType) {
      case 'aadhar':
        return {
          aspectRatio: '1.586', // Standard Aadhaar card ratio (85.6mm × 54mm)
          guide: 'Position your Aadhaar card within the frame'
        };
      case 'dl':
        return {
          aspectRatio: '1.586', // Standard DL ratio
          guide: 'Position your Driving License within the frame'
        };
      case 'photo':
        return {
          aspectRatio: '1', // Square for photos
          guide: 'Position your face within the frame'
        };
    }
  };

  const { aspectRatio, guide } = getOverlayDimensions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      {/* Camera cutout area */}
      <div className="relative w-[85%] max-w-lg">
        <div 
          className="relative border-2 border-white rounded-lg overflow-hidden"
          style={{ aspectRatio }}
        >
          {/* Corner guides */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>

          {/* Center alignment lines */}
          <div className="absolute top-1/2 left-4 right-4 h-px bg-white/30"></div>
          <div className="absolute top-4 bottom-4 left-1/2 w-px bg-white/30"></div>
        </div>

        {/* Guide text */}
        <div className="absolute -bottom-12 left-0 right-0 text-center">
          <p className="text-white text-sm font-medium">{guide}</p>
          <p className="text-white/70 text-xs mt-1">Ensure good lighting and a clear view</p>
        </div>
      </div>
    </div>
  );
} 
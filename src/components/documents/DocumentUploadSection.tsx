'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, X, Camera, Scan } from 'lucide-react';
import Image from 'next/image';
import Script from 'next/script';

type DocumentType = 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';

interface DocumentUploadSectionProps {
  onDocumentsChange: (documents: Record<DocumentType, File | null>) => void;
}

declare global {
  interface Window {
    cv: any;
  }
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
  const [showScanner, setShowScanner] = useState(false);
  const [activeDocument, setActiveDocument] = useState<DocumentType | null>(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);

  const documentLabels: Record<DocumentType, string> = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Card - Front',
    aadhar_back: 'Aadhar Card - Back',
    dl_front: 'Driving License - Front',
    dl_back: 'Driving License - Back'
  };

  const isDocumentType = (type: DocumentType) => type !== 'customer_photo';

  useEffect(() => {
    if (showScanner && videoRef.current) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showScanner]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isDocumentType(activeDocument!) ? 'environment' : 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Enable flash if available
        const track = stream.getVideoTracks()[0];
        if ('torch' in track.getCapabilities()) {
          await track.applyConstraints({
            advanced: [{ torch: isFlashOn }] as any
          });
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Failed to access camera. Please make sure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleFlash = async () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if ('torch' in track.getCapabilities()) {
        const newFlashState = !isFlashOn;
        await track.applyConstraints({
          advanced: [{ torch: newFlashState }] as any
        });
        setIsFlashOn(newFlashState);
      }
    }
  };

  const detectDocumentEdges = () => {
    if (!canvasRef.current || !videoRef.current || !window.cv) return null;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return null;

    // Draw current video frame to canvas
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Convert to OpenCV format and detect edges
    const src = window.cv.imread(canvasRef.current);
    const dst = new window.cv.Mat();
    
    // Convert to grayscale
    window.cv.cvtColor(src, dst, window.cv.COLOR_RGBA2GRAY);
    
    // Apply Gaussian blur
    window.cv.GaussianBlur(dst, dst, new window.cv.Size(5, 5), 0);
    
    // Detect edges using Canny
    window.cv.Canny(dst, dst, 75, 200);
    
    // Find contours
    const contours = new window.cv.MatVector();
    const hierarchy = new window.cv.Mat();
    window.cv.findContours(dst, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);
    
    // Find the largest contour (assumed to be the document)
    let maxArea = 0;
    let maxContourIndex = -1;
    
    for (let i = 0; i < contours.size(); i++) {
      const area = window.cv.contourArea(contours.get(i));
      if (area > maxArea) {
        maxArea = area;
        maxContourIndex = i;
      }
    }
    
    if (maxContourIndex !== -1) {
      const documentContour = contours.get(maxContourIndex);
      const corners = window.cv.approxPolyDP(documentContour, 0.02 * window.cv.arcLength(documentContour, true), true);
      
      if (corners.rows === 4) {
        // Draw rectangle around document
        const color = new window.cv.Scalar(255, 0, 0);
        window.cv.drawContours(src, contours, maxContourIndex, color, 2);
        window.cv.imshow(canvasRef.current, src);
        return corners;
      }
    }
    
    // Cleanup
    src.delete();
    dst.delete();
    contours.delete();
    hierarchy.delete();
    
    return null;
  };

  const captureImage = async () => {
    if (!canvasRef.current || !videoRef.current || !activeDocument) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Set canvas dimensions to match video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    if (isDocumentType(activeDocument) && window.cv) {
      // For documents: detect edges and apply perspective correction
      const corners = detectDocumentEdges();
      if (corners) {
        // Apply perspective transform
        const dstCorners = new window.cv.Mat(4, 1, window.cv.CV_32FC2);
        dstCorners.data32F[0] = 0;
        dstCorners.data32F[1] = 0;
        dstCorners.data32F[2] = canvasRef.current.width - 1;
        dstCorners.data32F[3] = 0;
        dstCorners.data32F[4] = canvasRef.current.width - 1;
        dstCorners.data32F[5] = canvasRef.current.height - 1;
        dstCorners.data32F[6] = 0;
        dstCorners.data32F[7] = canvasRef.current.height - 1;

        const transform = window.cv.getPerspectiveTransform(corners, dstCorners);
        const dst = new window.cv.Mat();
        window.cv.warpPerspective(
          window.cv.imread(canvasRef.current),
          dst,
          transform,
          new window.cv.Size(canvasRef.current.width, canvasRef.current.height)
        );
        window.cv.imshow(canvasRef.current, dst);
      }
    } else {
      // For customer photo: just capture the frame
      context.drawImage(videoRef.current, 0, 0);
    }

    // Convert canvas to file
    canvasRef.current.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `${activeDocument}.jpg`, { type: 'image/jpeg' });
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => ({
            ...prev,
            [activeDocument!]: reader.result as string
          }));
        };
        reader.readAsDataURL(file);

        // Update documents
        const updatedDocuments = {
          ...documents,
          [activeDocument]: file
        };
        setDocuments(updatedDocuments);
        onDocumentsChange(updatedDocuments);
      }
    }, 'image/jpeg', 0.95);

    setShowScanner(false);
    stopCamera();
  };

  const handleScanClick = (type: DocumentType) => {
    setActiveDocument(type);
    setShowScanner(true);
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

  return (
    <div className="space-y-4 relative">
      <Script
        src="https://docs.opencv.org/4.5.4/opencv.js"
        onLoad={() => setCvLoaded(true)}
      />

      {showScanner && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="relative flex-1">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            {isDocumentType(activeDocument!) && (
              <div className="absolute inset-0 border-2 border-dashed border-white opacity-50 m-8 rounded-lg" />
            )}
          </div>
          <div className="bg-black p-4 flex justify-between items-center">
            <button
              onClick={() => {
                setShowScanner(false);
                stopCamera();
              }}
              className="text-white px-4 py-2 rounded-lg bg-red-600"
            >
              Cancel
            </button>
            <button
              onClick={toggleFlash}
              className={`text-white px-4 py-2 rounded-lg ${isFlashOn ? 'bg-yellow-500' : 'bg-gray-600'}`}
            >
              Flash
            </button>
            <button
              onClick={captureImage}
              className="text-white px-4 py-2 rounded-lg bg-blue-600"
            >
              Capture
            </button>
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
                onClick={() => handleScanClick(type)}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                {isDocumentType(type) ? (
                  <>
                    <Scan className="h-8 w-8 text-gray-400" />
                    <p className="text-xs text-gray-500 mt-2">Scan Document</p>
                  </>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-gray-400" />
                    <p className="text-xs text-gray-500 mt-2">Take Photo</p>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 
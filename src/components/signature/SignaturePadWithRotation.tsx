'use client';

import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'react-signature-canvas';
import type SignaturePadType from 'react-signature-canvas';

interface SignaturePadWithRotationProps {
  onSignatureChange?: (signature: string) => void;
  initialSignature?: string;
  className?: string;
}

export default function SignaturePadWithRotation({
  onSignatureChange,
  initialSignature,
  className = ''
}: SignaturePadWithRotationProps) {
  const signaturePadRef = useRef<SignaturePadType>(null);
  const [signatureData, setSignatureData] = useState<string>(initialSignature || '');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const lastOrientationRef = useRef<number>(window.orientation || 0);

  // Function to save the current signature
  const saveCurrentSignature = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const currentSignature = signaturePadRef.current.toDataURL();
      setSignatureData(currentSignature);
      onSignatureChange?.(currentSignature);
      return currentSignature;
    }
    return signatureData;
  };

  // Function to handle window resize and orientation change
  const handleResize = () => {
    // Clear any pending resize timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Save the current signature before resize
    const savedSignature = saveCurrentSignature();

    // Get container width
    if (signaturePadRef.current) {
      const canvas = signaturePadRef.current.getCanvas();
      const container = canvas.parentElement;
      if (container) {
        const { width } = container.getBoundingClientRect();
        setContainerWidth(width);
        
        // Resize the canvas
        canvas.width = width;
        canvas.height = 200;
        
        // Wait for resize/rotation to complete before redrawing
        resizeTimeoutRef.current = setTimeout(() => {
          if (savedSignature) {
            signaturePadRef.current?.clear();
            const img = new Image();
            img.onload = () => {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                // Save the redrawn signature
                saveCurrentSignature();
              }
            };
            img.src = savedSignature;
          }
        }, 100);
      }
    }
  };

  // Handle orientation change and resize
  useEffect(() => {
    handleResize();

    const orientationHandler = () => {
      const currentOrientation = window.orientation || 0;
      
      // Only trigger resize if orientation actually changed
      if (currentOrientation !== lastOrientationRef.current) {
        lastOrientationRef.current = currentOrientation;
        // Add a small delay to let the browser finish rotating
        setTimeout(handleResize, 150);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', orientationHandler);

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', orientationHandler);
    };
  }, []);

  // Draw initial signature if provided
  useEffect(() => {
    if (initialSignature && signaturePadRef.current) {
      signaturePadRef.current.clear();
      const img = new Image();
      img.onload = () => {
        const canvas = signaturePadRef.current?.getCanvas();
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            saveCurrentSignature();
          }
        }
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  // Auto-save signature on any change
  const handleSignatureChange = () => {
    if (signaturePadRef.current) {
      saveCurrentSignature();
    }
  };

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setSignatureData('');
      onSignatureChange?.('');
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <div className="relative">
        <SignaturePad
          ref={signaturePadRef}
          canvasProps={{
            className: 'border rounded-lg w-full touch-none',
            style: { width: '100%', height: '200px' }
          }}
          onEnd={handleSignatureChange}
          onBegin={handleSignatureChange}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Signature
          </button>
        </div>
      </div>
    </div>
  );
} 
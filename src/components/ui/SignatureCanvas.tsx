'use client';

import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
}

export default function SignatureCanvas({ onSave }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Set canvas dimensions
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    // Initialize signature pad
    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)'
    });

    // Store in ref to avoid recreating event listeners
    signaturePadRef.current = pad;

    // Add event listener for signature changes
    const handleEndStroke = () => {
      if (pad && !pad.isEmpty()) {
        onSave(pad.toDataURL());
      }
    };

    pad.addEventListener('endStroke', handleEndStroke);

    return () => {
      pad.removeEventListener('endStroke', handleEndStroke);
      pad.off();
      signaturePadRef.current = null;
    };
  }, []); // Remove onSave from dependencies to prevent recreation

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onSave(''); // Clear the saved signature data
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
} 
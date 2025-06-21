'use client';

import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
}

export default function SignatureCanvas({ onSave }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signaturePad, setSignaturePad] = useState<SignaturePad | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)'
    });

    // Set canvas dimensions
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    pad.clear(); // Clear and reset dimensions

    setSignaturePad(pad);

    return () => {
      pad.off();
    };
  }, []);

  const handleClear = () => {
    if (signaturePad) {
      signaturePad.clear();
    }
  };

  const handleSave = () => {
    if (signaturePad && !signaturePad.isEmpty()) {
      const signatureData = signaturePad.toDataURL();
      onSave(signatureData);
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
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
} 
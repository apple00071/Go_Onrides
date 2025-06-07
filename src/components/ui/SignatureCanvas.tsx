import { useRef, useEffect } from 'react';
import SignaturePad from 'react-signature-canvas';

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  width?: number;
  height?: number;
}

export default function SignatureCanvas({ onSave, width = 500, height = 200 }: SignatureCanvasProps) {
  const signaturePadRef = useRef<SignaturePad>(null);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onSave(''); // Clear the signature data
    }
  };

  // Auto-save signature when changes occur
  const handleEndStroke = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataURL = signaturePadRef.current.toDataURL('image/png');
      onSave(dataURL);
    } else {
      onSave('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-white">
        <SignaturePad
          ref={signaturePadRef}
          onEnd={handleEndStroke}
          canvasProps={{
            className: 'signature-canvas w-full',
            width: width,
            height: height,
            style: { width: '100%', height: '100%' }
          }}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
} 
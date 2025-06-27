'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { X } from 'lucide-react';
import type { Document } from '@/types/documents';
import Image from 'next/image';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadDocument() {
      try {
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(document.document_url, 3600); // 1 hour expiry

        if (urlError) throw urlError;
        if (!signedUrl?.signedUrl) throw new Error('Failed to generate signed URL');

        setUrl(signedUrl.signedUrl);
      } catch (error) {
        console.error('Error loading document:', error);
        setError(error instanceof Error ? error.message : 'Failed to load document');
      }
    }

    loadDocument();
  }, [document.document_url, supabase.storage]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Document Viewer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {error ? (
            <div className="text-center text-red-600">
              <p>{error}</p>
            </div>
          ) : !url ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : document.document_type.startsWith('image/') ? (
            <div className="relative">
              <Image
                src={url}
                alt="Document preview"
                width={800}
                height={600}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          ) : document.document_type === 'application/pdf' ? (
            <iframe
              src={url}
              className="w-full h-full min-h-[60vh]"
              title="PDF preview"
            />
          ) : (
            <div className="text-center">
              <p className="text-gray-600">
                Preview not available for this file type.
              </p>
              <a
                href={url}
                download
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
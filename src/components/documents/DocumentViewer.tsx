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
        // Extract bookingId and fileName from document_url
        const [bookingId, fileName] = document.document_url.split('/');
        if (!bookingId || !fileName) {
          throw new Error('Invalid document URL format');
        }

        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('customer-documents')  // Use customer-documents bucket
          .createSignedUrl(`${bookingId}/${fileName}`, 3600); // 1 hour expiry

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
            {document.document_type === 'customer_photo' ? 'Customer Photo' :
             document.document_type === 'aadhar_front' ? 'Aadhar Front' :
             document.document_type === 'aadhar_back' ? 'Aadhar Back' :
             document.document_type === 'dl_front' ? 'DL Front' :
             document.document_type === 'dl_back' ? 'DL Back' :
             'Document'} Viewer
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
          ) : document.document_type.startsWith('image/') || 
             ['customer_photo', 'aadhar_front', 'aadhar_back', 'dl_front', 'dl_back'].includes(document.document_type) ? (
            <div className="relative">
              <img
                src={url}
                alt="Document preview"
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
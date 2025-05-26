'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DocumentViewerProps {
  document: {
    type: string;
    url: string;
    booking: {
      customer_name: string;
    };
  };
  onClose: () => void;
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocumentUrl = async () => {
      try {
        const { data } = await supabase.storage
          .from('customer-documents')
          .getPublicUrl(document.url);

        if (data) {
          setDocumentUrl(data.publicUrl);
        }
      } catch (error) {
        console.error('Error fetching document URL:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentUrl();
  }, [document.url]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {document.type} - {document.booking.customer_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-96">
              {document.type.toLowerCase().includes('pdf') ? (
                <iframe
                  src={documentUrl}
                  className="w-full h-full"
                  title={`${document.type} - ${document.booking.customer_name}`}
                />
              ) : (
                <img
                  src={documentUrl}
                  alt={`${document.type} - ${document.booking.customer_name}`}
                  className="max-w-full max-h-full mx-auto object-contain"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Upload, X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';

type DocumentType = 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';

interface CustomerDocuments {
  customer_photo?: string;
  aadhar_front?: string;
  aadhar_back?: string;
  dl_front?: string;
  dl_back?: string;
}

interface CustomerDocumentsProps {
  customerPhone: string;
  onDocumentsFound: (documents: CustomerDocuments) => void;
  onUploadComplete: (documents: CustomerDocuments) => void;
}

export default function CustomerDocuments({
  customerPhone,
  onDocumentsFound,
  onUploadComplete
}: CustomerDocumentsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<DocumentType, File | null>>({
    customer_photo: null,
    aadhar_front: null,
    aadhar_back: null,
    dl_front: null,
    dl_back: null
  });

  const documentLabels: Record<DocumentType, string> = {
    customer_photo: 'Customer Photo',
    aadhar_front: 'Aadhar Card - Front',
    aadhar_back: 'Aadhar Card - Back',
    dl_front: 'Driving License - Front',
    dl_back: 'Driving License - Back'
  };

  // Check for existing customer documents when phone number changes
  useEffect(() => {
    const checkExistingCustomer = async () => {
      if (customerPhone.length >= 10) {
        setLoading(true);
        const supabase = getSupabaseClient();
        
        try {
          // First find the customer
          const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', customerPhone)
            .limit(1);

          if (customerError) {
            console.error('Error checking customer:', customerError);
            return;
          }

          if (customers && customers.length > 0) {
            const customerId = customers[0].id;

            // Then get their documents
            const { data: documents, error: docsError } = await supabase
              .from('customer_documents')
              .select('type, url')
              .eq('customer_id', customerId);

            if (docsError) {
              console.error('Error checking documents:', docsError);
              return;
            }

            if (documents && documents.length > 0) {
              const docs: CustomerDocuments = {};
              documents.forEach(doc => {
                docs[doc.type as keyof CustomerDocuments] = doc.url;
              });
              onDocumentsFound(docs);
              toast.success('Found existing customer documents');
            }
          }
        } catch (error) {
          console.error('Error checking customer documents:', error);
          setError(error instanceof Error ? error.message : 'Failed to check customer documents');
        } finally {
          setLoading(false);
        }
      }
    };

    checkExistingCustomer();
  }, [customerPhone, onDocumentsFound]);

  const handleFileChange = (type: DocumentType) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError('No file selected');
      return;
    }
      
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
      
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }

    setDocuments(prev => ({
      ...prev,
      [type]: file
    }));
    setError(null);
  };

  const handleUpload = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClientComponentClient();

      // First get or create customer
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerPhone)
        .limit(1);

      if (customerError) throw customerError;

      if (!customers || customers.length === 0) {
        throw new Error('Customer not found. Please create customer first.');
      }

      const customerId = customers[0].id;
      const uploadedDocs: Record<string, string> = {};

      // Upload each document
      for (const [type, file] of Object.entries(documents)) {
        if (!file) continue;

        const fileExt = file.name.split('.').pop();
        const fileName = `${customerId}-${type}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(fileName);

        uploadedDocs[type] = publicUrl;
      }

      onUploadComplete?.(uploadedDocs);
      toast.success('Documents uploaded successfully');
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Required Documents</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(documentLabels).map(([type, label]) => (
          <div key={type} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative">
              <div className="space-y-1 text-center">
                {documents[type as DocumentType] ? (
                  <div className="relative">
                    <Image
                      src={URL.createObjectURL(documents[type as DocumentType]!)}
                      alt={label}
                      width={400}
                      height={160}
                      className="w-full h-40 object-cover rounded-lg"
                      style={{ width: 'auto', height: '160px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setDocuments(prev => ({ ...prev, [type]: null }))}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileChange(type as DocumentType)}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG or JPG up to 5MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading || !Object.values(documents).some(doc => doc !== null)}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload Documents'}
        </button>
      </div>
    </div>
  );
} 
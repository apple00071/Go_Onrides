'use client';

import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { uploadLogo } from '@/lib/uploadLogo';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export default function LogoUploader() {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch current logo
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('company_settings')
          .select('logo')
          .single();

        if (error) {
          console.error('Error fetching logo:', error);
          return;
        }

        if (data?.logo) {
          setPreviewUrl(`data:image/png;base64,${data.logo}`);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };

    fetchLogo();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size should be less than 5MB');
      return;
    }

    setLoading(true);
    try {
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      await uploadLogo(file);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Company Logo</h3>
      
      {/* Current Logo Preview */}
      {previewUrl && (
        <div className="mb-4 p-4 border rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Logo</h4>
          <div className="relative w-48 h-24">
            <img
              src={previewUrl}
              alt="Company Logo"
              className="object-contain w-full h-full"
            />
          </div>
        </div>
      )}
      
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />
          <div className="space-y-2">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="text-sm text-gray-600">
              {loading ? 'Uploading...' : 'Click to upload company logo'}
            </div>
            <div className="text-xs text-gray-500">
              PNG, JPG up to 5MB
            </div>
          </div>
        </label>
      </div>
    </div>
  );
} 
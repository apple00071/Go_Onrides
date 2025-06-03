'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomerForm from '@/components/customers/CustomerForm';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string | null;
  aadhar_number: string | null;
  dl_number: string | null;
  dl_expiry_date: string | null;
  temp_address_street: string | null;
  temp_address_city: string | null;
  temp_address_state: string | null;
  temp_address_pincode: string | null;
  perm_address_street: string | null;
  perm_address_city: string | null;
  perm_address_state: string | null;
  perm_address_pincode: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  documents: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!params?.id) {
        setError('No customer ID provided');
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        
        // Fetch customer details
        const { data, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', params.id)
          .single();

        if (customerError) {
          console.error('Error fetching customer:', customerError);
          throw new Error(customerError.message || 'Failed to fetch customer details');
        }

        if (!data) {
          throw new Error('Customer not found');
        }

        setCustomer(data as Customer);
        setError(null);
      } catch (error) {
        console.error('Error fetching customer:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [params?.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error || 'Customer not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customer
        </button>
      </div>
      <CustomerForm customer={customer} mode="edit" />
    </div>
  );
} 
'use client';

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CustomersTable from '@/components/customers/CustomersTable';
import CustomersControls from '@/components/customers/CustomersControls';
import CustomerModal from '@/components/customers/CustomerModal';
import { Search, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Address {
  permanent?: string;
  temporary?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: Address;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          phone,
          address,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        toast.error(`Failed to fetch customers: ${error.message}`);
        return;
      }

      // Transform the data to ensure all required fields are present
      const transformedCustomers: Customer[] = (data || []).map(customer => ({
        id: customer.id,
        name: customer.name || 'N/A',
        phone: customer.phone || 'N/A',
        address: customer.address || undefined,
        created_at: customer.created_at
      }));

      setCustomers(transformedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleRefresh = () => {
    fetchCustomers();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleNewCustomer = () => {
    setIsModalOpen(true);
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      searchQuery === '' ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);

    return matchesSearch;
  });

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="h-full bg-gray-50">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your customer information and view their booking history
            </p>
          </div>

          {/* Controls */}
          <CustomersControls
            onSearch={handleSearch}
            onRefresh={handleRefresh}
            onNewCustomer={handleNewCustomer}
          />

          {/* Content */}
          <div className="mt-6">
            {loading ? (
              <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-white">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                  <p className="text-sm text-gray-500">Loading customers...</p>
                </div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery ? "Try adjusting your search to find what you're looking for." : 'Get started by adding a new customer.'}
                </p>
                {!searchQuery && (
                  <div className="mt-6">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Customer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <CustomersTable customers={filteredCustomers} />
            )}
          </div>
        </div>
      </div>

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCustomerCreated={() => {
          setIsModalOpen(false);
          fetchCustomers();
          toast.success('Customer added successfully');
        }}
      />
    </main>
  );
} 
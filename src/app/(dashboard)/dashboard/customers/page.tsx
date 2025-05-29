'use client';

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CustomersTable from '@/components/customers/CustomersTable';
import CustomersControls from '@/components/customers/CustomersControls';
import CustomerModal from '@/components/customers/CustomerModal';
import { Search, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  total_bookings: number;
  status: 'active' | 'inactive';
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
          email,
          address,
          created_at,
          status,
          total_bookings
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
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

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
  };

  const handleNewCustomer = () => {
    setIsModalOpen(true);
  };

  // Filter customers based on search query and status
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      searchQuery === '' ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
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
            onStatusFilter={handleStatusFilter}
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
                  {searchQuery || statusFilter !== 'all'
                    ? "Try adjusting your search or filter to find what you're looking for."
                    : 'Get started by adding a new customer.'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
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
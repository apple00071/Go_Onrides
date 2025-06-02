'use client';

import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { notifyCustomerEvent } from '@/lib/notification';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  temp_address_street: string;
  perm_address_street: string;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    temp_address_street: '',
    perm_address_street: ''
  });
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      temp_address_street: '',
      perm_address_street: ''
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClientComponentClient();
      
      // Create the customer
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          temp_address_street: formData.temp_address_street,
          perm_address_street: formData.perm_address_street
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Get current user for notification
      const { data: { user } } = await supabase.auth.getUser();
      
      // Send notification to admin users
      if (data) {
        await notifyCustomerEvent(
          'CUSTOMER_CREATED',
          data.id,
          {
            customerName: formData.name,
            actionBy: user?.email || 'Unknown User'
          }
        );
      }

      onCustomerCreated();
      toast.success('Customer added successfully');
      handleClose();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-end p-2">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="sm:flex sm:items-start">
          <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Add New Customer
            </h3>
            <div className="mt-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="permanent-address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Permanent Address
                  </label>
                  <input
                    type="text"
                    id="permanent-address"
                    value={formData.perm_address_street || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        perm_address_street: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="temporary-address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Temporary Address
                  </label>
                  <input
                    type="text"
                    id="temporary-address"
                    value={formData.temp_address_street || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        temp_address_street: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {loading ? 'Adding...' : 'Add Customer'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal; 
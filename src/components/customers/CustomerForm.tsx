'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

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

interface CustomerFormProps {
  customer?: Customer
  mode: 'create' | 'edit'
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  dob: string;
  aadhar_number: string;
  dl_number: string;
  dl_expiry_date: string;
  temp_address_street: string;
  temp_address_city: string;
  temp_address_state: string;
  temp_address_pincode: string;
  perm_address_street: string;
  perm_address_city: string;
  perm_address_state: string;
  perm_address_pincode: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  documents: {
    customer_photo?: string;
    aadhar_front?: string;
    aadhar_back?: string;
    dl_front?: string;
    dl_back?: string;
  };
}

const CustomerForm = ({ customer, mode }: CustomerFormProps) => {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    dob: customer?.dob || '',
    aadhar_number: customer?.aadhar_number || '',
    dl_number: customer?.dl_number || '',
    dl_expiry_date: customer?.dl_expiry_date || '',
    temp_address_street: customer?.temp_address_street || '',
    temp_address_city: customer?.temp_address_city || '',
    temp_address_state: customer?.temp_address_state || '',
    temp_address_pincode: customer?.temp_address_pincode || '',
    perm_address_street: customer?.perm_address_street || '',
    perm_address_city: customer?.perm_address_city || '',
    perm_address_state: customer?.perm_address_state || '',
    perm_address_pincode: customer?.perm_address_pincode || '',
    emergency_contact_name: customer?.emergency_contact_name || '',
    emergency_contact_phone: customer?.emergency_contact_phone || '',
    emergency_contact_relationship: customer?.emergency_contact_relationship || '',
    documents: customer?.documents || {}
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (mode === 'create') {
        const { error } = await supabase
          .from('customers')
          .insert([formData])

        if (error) throw error
        toast.success('Customer created successfully')
      } else {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', customer?.id)

        if (error) throw error
        toast.success('Customer updated successfully')
      }

      router.push('/customers')
      router.refresh()
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error(`Failed to ${mode} customer`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700">
                Aadhar Number
              </label>
              <input
                type="text"
                id="aadhar_number"
                name="aadhar_number"
                value={formData.aadhar_number}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dl_number" className="block text-sm font-medium text-gray-700">
                Driving License Number
              </label>
              <input
                type="text"
                id="dl_number"
                name="dl_number"
                value={formData.dl_number}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dl_expiry_date" className="block text-sm font-medium text-gray-700">
                DL Expiry Date
              </label>
              <input
                type="date"
                id="dl_expiry_date"
                name="dl_expiry_date"
                value={formData.dl_expiry_date}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700">
                Emergency Contact Name
              </label>
              <input
                type="text"
                id="emergency_contact_name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                id="emergency_contact_phone"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="temp_address_street" className="block text-sm font-medium text-gray-700">
                Temporary Address
              </label>
              <textarea
                id="temp_address_street"
                name="temp_address_street"
                value={formData.temp_address_street}
                onChange={handleChange}
                required
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="perm_address_street" className="block text-sm font-medium text-gray-700">
                Permanent Address
              </label>
              <textarea
                id="perm_address_street"
                name="perm_address_street"
                value={formData.perm_address_street}
                onChange={handleChange}
                required
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Customer' : 'Update Customer'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CustomerForm 
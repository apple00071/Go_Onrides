'use client';

import Link from 'next/link'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: {
    temporary: string;
    permanent: string;
  }
  created_at: string
}

interface CustomerDetailProps {
  customer: Customer
}

const CustomerDetail = ({ customer }: CustomerDetailProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Details</h1>
        <div className="flex gap-4">
          <Link
            href={`/customers/${customer.id}/edit`}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
          >
            Edit Customer
          </Link>
          <Link
            href="/customers"
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Back to List
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Name</h3>
            <p className="mt-1 text-lg text-gray-900">{customer.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-lg text-gray-900">{customer.email}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p className="mt-1 text-lg text-gray-900">{customer.phone}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Address</h3>
            <div className="mt-1 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Temporary Address</p>
                <p className="text-lg text-gray-900">
                  {typeof customer.address === 'object' ? customer.address.temporary : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Permanent Address</p>
                <p className="text-lg text-gray-900">
                  {typeof customer.address === 'object' ? customer.address.permanent : 'N/A'}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Customer Since</h3>
            <p className="mt-1 text-lg text-gray-900">
              {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Orders section can be added here */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
          <p className="mt-2 text-gray-600">
            Order history functionality will be implemented here.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail 
import React from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  phone: string;
  temp_address_street: string | null;
  perm_address_street: string | null;
  created_at: string;
}

interface CustomersTableProps {
  customers: Customer[];
}

const CustomersTable: React.FC<CustomersTableProps> = ({ customers }) => {
  const router = useRouter();

  const handleRowClick = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Address
                </span>
              </th>
              <th scope="col" className="whitespace-nowrap px-6 py-3 text-left">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Joined
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {customers.map((customer) => (
              <tr 
                key={customer.id} 
                onClick={() => handleRowClick(customer.id)}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">
                    {customer.name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900">
                    {customer.phone}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {customer.perm_address_street && (
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Permanent:</span> {customer.perm_address_street}
                      </div>
                    )}
                    {customer.temp_address_street && (
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Temporary:</span> {customer.temp_address_street}
                      </div>
                    )}
                    {!customer.perm_address_street && !customer.temp_address_street && (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {format(new Date(customer.created_at), 'MMM d, yyyy')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersTable; 
import React from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { ResponsiveTable, ResponsiveCard, ResponsiveCardList } from '@/components/ui/responsive-table';

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

  // Format the address for display
  const formatAddress = (customer: Customer) => {
    if (customer.perm_address_street && customer.temp_address_street) {
      return (
        <div className="space-y-1">
          <div className="text-sm text-gray-500">
            <span className="font-medium">Permanent:</span> {customer.perm_address_street}
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium">Temporary:</span> {customer.temp_address_street}
          </div>
        </div>
      );
    } else if (customer.perm_address_street) {
      return customer.perm_address_street;
    } else if (customer.temp_address_street) {
      return customer.temp_address_street;
    } else {
      return 'N/A';
    }
  };

  return (
    <>
      {/* Desktop table view */}
      <div className="hidden md:block">
        <ResponsiveTable headers={['Name', 'Contact', 'Address', 'Joined']}>
          {customers.map((customer) => (
            <tr 
              key={customer.id} 
              onClick={() => handleRowClick(customer.id)}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              tabIndex={0}
              role="button"
              onKeyDown={(e) => e.key === 'Enter' && handleRowClick(customer.id)}
            >
              <td className="whitespace-nowrap px-6 py-4 min-h-[44px]">
                <span className="text-sm font-medium text-gray-900">
                  {customer.name}
                </span>
              </td>
              <td className="px-6 py-4 min-h-[44px]">
                <span className="text-sm font-medium text-gray-900">
                  {customer.phone}
                </span>
              </td>
              <td className="px-6 py-4 min-h-[44px]">
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
              <td className="whitespace-nowrap px-6 py-4 min-h-[44px]">
                <span className="text-sm text-gray-500">
                  {format(new Date(customer.created_at), 'MMM d, yyyy')}
                </span>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      </div>

      {/* Mobile card view */}
      <ResponsiveCardList>
        {customers.map((customer) => (
          <ResponsiveCard
            key={customer.id}
            data={[
              { label: 'Name', value: customer.name },
              { label: 'Contact', value: customer.phone },
              { label: 'Address', value: formatAddress(customer) },
              { label: 'Joined', value: format(new Date(customer.created_at), 'MMM d, yyyy') }
            ]}
            onClick={() => handleRowClick(customer.id)}
          />
        ))}
      </ResponsiveCardList>
    </>
  );
};

export default CustomersTable; 
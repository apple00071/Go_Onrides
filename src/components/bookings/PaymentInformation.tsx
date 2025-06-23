'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Plus } from 'lucide-react';
import CreatePaymentModal from '@/components/bookings/CreatePaymentModal';

interface PaymentInformationProps {
  bookingAmount: number;
  securityDeposit: number;
  paidAmount: number;
  damageCharges: number;
  lateFee: number;
  extensionFee: number;
  status: string;
  paymentStatus: string;
  onPaymentCreated: () => void;
}

export default function PaymentInformation({
  bookingAmount,
  securityDeposit,
  paidAmount,
  damageCharges,
  lateFee,
  extensionFee,
  status,
  paymentStatus,
  onPaymentCreated
}: PaymentInformationProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Calculate total amount based on booking status
  const totalAmount = status === 'completed'
    ? bookingAmount + securityDeposit + damageCharges + lateFee + extensionFee
    : bookingAmount + securityDeposit;

  // Calculate remaining amount
  const remainingAmount = totalAmount - paidAmount;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payment Information
        </h3>
        
        <div className="mt-5 border-t border-gray-200">
          <dl className="divide-y divide-gray-200">
            {/* Booking Amount */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Booking Amount</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatCurrency(bookingAmount)}
              </dd>
            </div>

            {/* Security Deposit */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Security Deposit</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatCurrency(securityDeposit)}
              </dd>
            </div>

            {/* Damage Charges */}
            {status === 'completed' && damageCharges > 0 && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Damage Charges</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatCurrency(damageCharges)}
                </dd>
              </div>
            )}

            {/* Late Fee */}
            {status === 'completed' && lateFee > 0 && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Late Return Fee</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatCurrency(lateFee)}
                </dd>
              </div>
            )}

            {/* Extension Fee */}
            {status === 'completed' && extensionFee > 0 && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Extension Fee</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatCurrency(extensionFee)}
                </dd>
              </div>
            )}

            {/* Total Amount */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatCurrency(totalAmount)}
              </dd>
            </div>

            {/* Paid Amount */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Paid Amount</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatCurrency(paidAmount)}
              </dd>
            </div>

            {/* Remaining Amount */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Remaining Amount</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatCurrency(remainingAmount)}
              </dd>
            </div>

            {/* Payment Status */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                  paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {paymentStatus}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Add Payment Button */}
        {remainingAmount > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <CreatePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          remainingAmount={remainingAmount}
          onPaymentCreated={onPaymentCreated}
        />
      )}
    </div>
  );
} 
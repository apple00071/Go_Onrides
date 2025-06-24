'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';
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
  bookingId: string;
  bookingNumber: string;
  customerName: string;
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
  onPaymentCreated,
  bookingId,
  bookingNumber,
  customerName
}: PaymentInformationProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Calculate base amount
  const baseAmount = bookingAmount + securityDeposit;

  // Calculate additional fees
  const additionalFees = (status === 'completed' || status === 'in_use')
    ? (damageCharges || 0) + (lateFee || 0) + (extensionFee || 0)
    : 0;

  // Calculate total amount including all fees
  const totalAmount = baseAmount + additionalFees;

  // Calculate remaining amount
  const remainingAmount = Math.max(0, totalAmount - (paidAmount || 0));

  // Helper function to render amount row with label
  interface AmountRowProps {
    label: string;
    amount: number;
    isHighlighted?: boolean;
    showIfZero?: boolean;
  }

  const AmountRow = ({ 
    label, 
    amount, 
    isHighlighted = false, 
    showIfZero = true 
  }: AmountRowProps) => {
    if (!showIfZero && amount <= 0) return null;
    
    return (
      <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className={`mt-1 text-sm ${isHighlighted ? 'font-semibold text-blue-600' : 'text-gray-900'} sm:mt-0 sm:col-span-2`}>
          {formatCurrency(amount)}
        </dd>
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payment Information
        </h3>
        
        <div className="mt-5 border-t border-gray-200">
          <dl className="divide-y divide-gray-200">
            {/* Base Amounts */}
            <AmountRow label="Booking Amount" amount={bookingAmount} />
            <AmountRow label="Security Deposit" amount={securityDeposit} />
            
            {/* Additional Fees - only show if they exist */}
            {(status === 'completed' || status === 'in_use') && (
              <>
                <AmountRow label="Damage Charges" amount={damageCharges} showIfZero={false} />
                <AmountRow label="Late Return Fee" amount={lateFee} showIfZero={false} />
                <AmountRow label="Extension Fee" amount={extensionFee} showIfZero={false} />
                
                {additionalFees > 0 && (
                  <div className="py-4 bg-gray-50">
                    <AmountRow label="Additional Fees Total" amount={additionalFees} />
                  </div>
                )}
              </>
            )}

            {/* Totals */}
            <div className="py-4 bg-gray-50">
              <AmountRow label="Total Amount" amount={totalAmount} isHighlighted={true} />
              <AmountRow label="Paid Amount" amount={paidAmount} />
              <AmountRow label="Remaining Amount" amount={remainingAmount} isHighlighted={true} />
            </div>

            {/* Payment Status */}
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  paymentStatus === 'full' ? 'bg-green-100 text-green-800' :
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
          bookingId={bookingId}
          bookingNumber={bookingNumber}
          customerName={customerName}
        />
      )}
    </div>
  );
} 
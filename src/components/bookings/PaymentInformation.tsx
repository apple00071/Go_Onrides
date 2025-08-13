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

  // Calculate base amounts
  const baseAmount = bookingAmount;

  // Calculate additional fees
  const additionalFees = (status === 'completed' || status === 'in_use')
    ? (damageCharges || 0) + (lateFee || 0) + (extensionFee || 0)
    : 0;

  // Calculate security deposit return
  const securityDepositToReturn = Math.max(0, securityDeposit - additionalFees);
  
  // Calculate total revenue (booking amount + all additional fees)
  const totalRevenue = bookingAmount + additionalFees;

  // Calculate total amount including all fees
  const totalAmount = bookingAmount + securityDeposit + additionalFees;
  
  // Calculate remaining amount
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  // Calculate payment status
  const actualPaymentStatus = remainingAmount === 0 ? 'full' : 
                             paidAmount > 0 ? 'partial' : 
                             'pending';

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
            {/* Basic Charges */}
            <div className="py-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Charges</h4>
              <AmountRow label="Booking Amount" amount={bookingAmount} />
              <AmountRow label="Security Deposit" amount={securityDeposit} />
            </div>

            {/* Additional Fees - only show if they exist */}
            {(status === 'completed' || status === 'in_use') && additionalFees > 0 && (
              <div className="py-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Charges</h4>
                {damageCharges > 0 && <AmountRow label="Damage Charges" amount={damageCharges} />}
                {lateFee > 0 && <AmountRow label="Late Return Fee" amount={lateFee} />}
                {extensionFee > 0 && <AmountRow label="Extension Fee" amount={extensionFee} />}
                <AmountRow label="Total Additional Charges" amount={additionalFees} isHighlighted={true} />
              </div>
            )}

            {/* Payment Summary */}
            <div className="py-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Summary</h4>
              <AmountRow label="Total Amount" amount={totalAmount} />
              <AmountRow label="Paid Amount" amount={paidAmount} />
              <AmountRow label="Remaining Amount" amount={remainingAmount} isHighlighted={true} />
            </div>

            {/* Final Settlement */}
            <div className="py-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Final Settlement</h4>
              <AmountRow 
                label="Security Deposit Return" 
                amount={securityDepositToReturn} 
                isHighlighted={true}
              />
              <AmountRow 
                label="Total Revenue" 
                amount={totalRevenue}
                isHighlighted={true}
              />
            </div>

            {/* Status */}
            <div className="py-4">
              <div className="sm:grid sm:grid-cols-3 sm:gap-4 mb-3">
                <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
                <dd className="mt-1 sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    actualPaymentStatus === 'full' ? 'bg-green-100 text-green-800' :
                    actualPaymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {actualPaymentStatus}
                  </span>
                </dd>
              </div>
              {status === 'completed' && (
                <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Security Deposit</dt>
                  <dd className="mt-1 sm:mt-0 sm:col-span-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      securityDepositToReturn > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {securityDepositToReturn > 0 ? `${formatCurrency(securityDepositToReturn)} Returned` : 'Used for Charges'}
                    </span>
                  </dd>
                </div>
              )}
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
'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Plus } from 'lucide-react';
import PaymentModal from '@/components/payments/PaymentModal';

interface PaymentInformationProps {
  booking: {
    id: string;
    booking_id: string;
    booking_amount: number;
    security_deposit_amount: number;
    paid_amount: number;
    payment_status: string;
    payment_mode: string;
    status: string;
    damage_charges?: number;
    refund_amount?: number;
  };
  onPaymentCreated?: () => void;
}

export default function PaymentInformation({ booking, onPaymentCreated }: PaymentInformationProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Calculate amounts
  const bookingAmount = booking.booking_amount;
  const securityDeposit = booking.security_deposit_amount;
  const damageCharges = booking.damage_charges || 0;
  const refundAmount = booking.refund_amount || securityDeposit;
  const paidAmount = booking.paid_amount || 0;

  let totalAmount;

  if (booking.status === 'completed') {
    // For completed bookings:
    // Total amount should include booking amount + damage charges
    totalAmount = bookingAmount + damageCharges;
  } else {
    // For ongoing bookings:
    // Total includes booking amount + security deposit
    totalAmount = bookingAmount + securityDeposit;
  }

  // Calculate remaining amount
  const remainingAmount = booking.status === 'completed' ? 0 : totalAmount - paidAmount;

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'full':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleNewPayment = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentCreated = () => {
    setShowPaymentModal(false);
    if (onPaymentCreated) {
      onPaymentCreated();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
          {booking.status !== 'completed' && booking.status !== 'cancelled' && remainingAmount > 0 && (
            <button
              onClick={handleNewPayment}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Payment
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Booking Amount</label>
            <p className="text-lg font-medium">{formatCurrency(bookingAmount)}</p>
          </div>
          {booking.status !== 'completed' && (
            <div>
              <label className="text-sm text-gray-500">Security Deposit</label>
              <p className="text-lg font-medium">{formatCurrency(securityDeposit)}</p>
            </div>
          )}
          {damageCharges > 0 && (
            <div>
              <label className="text-sm text-gray-500">Damage Charges</label>
              <p className="text-lg font-medium text-red-600">+{formatCurrency(damageCharges)}</p>
            </div>
          )}
          {booking.status === 'completed' && (
            <div>
              <label className="text-sm text-gray-500">Security Deposit Refund</label>
              <p className="text-lg font-medium text-green-600">{formatCurrency(refundAmount)}</p>
            </div>
          )}
          <div className="pt-2 border-t">
            <label className="text-sm text-gray-500">Total Amount</label>
            <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
            {booking.status === 'completed' && (
              <p className="text-sm text-gray-500 mt-1">
                (Booking Amount + Damage Charges)
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-gray-500">Paid Amount</label>
            <p className="text-lg font-medium text-green-600">{formatCurrency(paidAmount)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Remaining Amount</label>
            <p className="text-lg font-medium text-red-600">{formatCurrency(remainingAmount)}</p>
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm text-gray-500">Payment Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.payment_status)} mt-1`}>
                {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentCreated={handlePaymentCreated}
        />
      )}
    </div>
  );
} 
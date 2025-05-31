import { useState } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface RefundDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefundComplete: () => void;
  bookingId: string;
  securityDeposit: number;
  customerName: string;
}

export default function RefundDepositModal({
  isOpen,
  onClose,
  onRefundComplete,
  bookingId,
  securityDeposit,
  customerName
}: RefundDepositModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    refundAmount: securityDeposit.toString(),
    refundMode: 'cash',
    deductions: '0',
    deductionReason: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'deductions') {
      const deductions = parseFloat(value) || 0;
      if (deductions > securityDeposit) {
        setError('Deductions cannot exceed security deposit amount');
        return;
      }
      // Update refund amount when deductions change
      setFormData(prev => ({
        ...prev,
        [name]: value,
        refundAmount: (securityDeposit - deductions).toString()
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const refundAmount = parseFloat(formData.refundAmount);
      const deductions = parseFloat(formData.deductions);

      // Create refund record
      const { error: refundError } = await supabase
        .from('security_deposit_refunds')
        .insert({
          booking_id: bookingId,
          refund_amount: refundAmount,
          refund_mode: formData.refundMode,
          deductions: deductions,
          deduction_reason: formData.deductionReason || null,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      if (refundError) {
        throw refundError;
      }

      // Update booking status to include refund
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          security_deposit_refunded: true,
          security_deposit_refund_date: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (bookingError) {
        throw bookingError;
      }

      toast.success('Security deposit refunded successfully');
      onRefundComplete();
      onClose();
    } catch (error) {
      console.error('Error processing refund:', error);
      setError(error instanceof Error ? error.message : 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Refund Security Deposit</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm">
              <span className="text-gray-500">Customer:</span>
              <span className="ml-2 font-medium">{customerName}</span>
            </div>
            <div className="text-sm mt-1">
              <span className="text-gray-500">Security Deposit:</span>
              <span className="ml-2 font-medium">{formatCurrency(securityDeposit)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Deductions (if any)
            </label>
            <input
              type="number"
              name="deductions"
              value={formData.deductions}
              onChange={handleInputChange}
              min="0"
              max={securityDeposit}
              step="0.01"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {parseFloat(formData.deductions) > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reason for Deductions
              </label>
              <textarea
                name="deductionReason"
                value={formData.deductionReason}
                onChange={handleInputChange}
                required={parseFloat(formData.deductions) > 0}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Explain the reason for deductions..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refund Amount
            </label>
            <input
              type="number"
              name="refundAmount"
              value={formData.refundAmount}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refund Mode
            </label>
            <select
              name="refundMode"
              value={formData.refundMode}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
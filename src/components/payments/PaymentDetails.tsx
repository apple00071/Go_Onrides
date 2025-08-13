import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Plus, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentDetailsProps {
  bookingAmount: number;
  securityDeposit: number;
  damageCharges?: number;
  additionalFees?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "Paid" | "Partial" | "Pending";
  securityDepositReturned?: boolean;
  onAddPayment?: () => void;
  onDownloadInvoice?: () => void;
}

const PaymentDetails = ({
  bookingAmount,
  securityDeposit,
  damageCharges = 0,
  additionalFees = 0,
  totalAmount,
  paidAmount,
  remainingAmount,
  paymentStatus,
  securityDepositReturned = false,
  onAddPayment,
  onDownloadInvoice,
}: PaymentDetailsProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate actual revenue (excluding security deposit)
  const actualRevenue = bookingAmount + damageCharges + additionalFees;
  const actualPaid = Math.min(paidAmount, actualRevenue);
  const actualPaymentStatus = actualPaid >= actualRevenue ? "Paid" : actualPaid > 0 ? "Partial" : "Pending";

  const PaymentRow = ({ label, amount, highlight = false }: { label: string; amount: number; highlight?: boolean }) => (
    <div className={cn(
      "flex items-center justify-between py-3 border-b border-gray-100 last:border-0",
      highlight && "bg-gray-50"
    )}>
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <IndianRupee className="w-4 h-4 text-gray-500" />
        <span className="font-medium">{amount.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Payment Details</h2>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={onDownloadInvoice}
          >
            <Download className="w-4 h-4" />
            Download Invoice
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Payment Information
            </h3>
            <div className="space-y-1">
              <PaymentRow label="Booking Amount" amount={bookingAmount} />
              <PaymentRow label="Security Deposit" amount={securityDeposit} />
              {damageCharges > 0 && (
                <PaymentRow label="Damage Charges" amount={damageCharges} />
              )}
              {additionalFees > 0 && (
                <PaymentRow label="Additional Fees" amount={additionalFees} />
              )}
              <PaymentRow label="Total Amount" amount={totalAmount} highlight />
              <PaymentRow label="Paid Amount" amount={paidAmount} />
              <PaymentRow label="Remaining Amount" amount={remainingAmount} highlight />
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-gray-600">Charges Payment Status:</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    getStatusColor(actualPaymentStatus)
                  )}
                >
                  {actualPaymentStatus}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">Security Deposit:</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    securityDepositReturned ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  )}
                >
                  {securityDepositReturned ? "Returned" : "Pending Return"}
                </span>
              </div>
            </div>
            <Button
              onClick={onAddPayment}
              className="flex items-center gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PaymentDetails; 
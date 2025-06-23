import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Plus, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentDetailsProps {
  bookingAmount: number;
  securityDeposit: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "Paid" | "Partial" | "Pending";
  onAddPayment?: () => void;
  onDownloadInvoice?: () => void;
}

const PaymentDetails = ({
  bookingAmount,
  securityDeposit,
  totalAmount,
  paidAmount,
  remainingAmount,
  paymentStatus,
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

  const PaymentRow = ({ label, amount }: { label: string; amount: number }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
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
              <PaymentRow label="Total Amount" amount={totalAmount} />
              <PaymentRow label="Paid Amount" amount={paidAmount} />
              <PaymentRow label="Remaining Amount" amount={remainingAmount} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-600">Payment Status:</span>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  getStatusColor(paymentStatus)
                )}
              >
                {paymentStatus}
              </span>
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
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { format, parse } from 'date-fns';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';
import { generateInvoice } from '@/lib/generateInvoice';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FormEvent } from 'react';

interface InvoiceFormData {
  customerName: string;
  gstNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentMethod: string;
  vehicleDetails: {
    model: string;
    registration: string;
  };
  pickupDate: string;
  dropoffDate: string;
  items: Array<{
    description: string;
    quantity: number;
    pricePerUnit: number;
    tax: number;
  }>;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    customerName: '',
    gstNumber: '',
    invoiceNumber: `INV${Math.floor(Math.random() * 1000000)}`,
    invoiceDate: format(new Date(), 'dd-MM-yyyy'),
    paymentMethod: 'Bank Transfer',
    vehicleDetails: {
      model: '',
      registration: ''
    },
    pickupDate: format(new Date(), 'dd-MM-yyyy'),
    dropoffDate: format(new Date(), 'dd-MM-yyyy'),
    items: [
      {
        description: '',
        quantity: 1,
        pricePerUnit: 0,
        tax: 0
      }
    ]
  });

  // Helper function to convert date format for input
  const formatDateForInput = (dateStr: string) => {
    try {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // Helper function to convert date from input to display format
  const formatDateForState = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'dd-MM-yyyy');
    } catch {
      return '';
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate and download PDF
      const pdfBlob = await generateInvoice({
        customerName: formData.customerName,
        gstNumber: formData.gstNumber || '',
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        paymentMethod: formData.paymentMethod,
        vehicleDetails: {
          model: formData.vehicleDetails.model,
          registration: formData.vehicleDetails.registration
        },
        pickupDate: formData.pickupDate,
        dropoffDate: formData.dropoffDate,
        items: formData.items.map(item => ({
          ...item,
          pricePerUnit: Number(item.pricePerUnit),
          quantity: Number(item.quantity),
          tax: Number(item.tax)
        }))
      });
      
      // Create a download link
      const fileName = `${formData.invoiceNumber}_${formData.customerName.replace(/\s+/g, '_')}.pdf`;
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Invoice generated successfully');
      router.push('/dashboard/invoices');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/dashboard/invoices')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Generate New Invoice</h1>
            <p className="mt-1 text-sm text-gray-600">
              Create a new invoice for your customer
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div className="w-32 h-32 relative">
            <Image
              src="/logo.png"
              alt="Go Onriders"
              fill
              className="object-contain"
            />
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">INVOICE</h2>
            <p className="text-sm text-gray-500">Page 1 of 1</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              GST Number
            </label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Number *
            </label>
            <input
              type="text"
              required
              value={formData.invoiceNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Date *
            </label>
            <input
              type="date"
              required
              value={formatDateForInput(formData.invoiceDate)}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                invoiceDate: formatDateForState(e.target.value)
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vehicle Model *
            </label>
            <input
              type="text"
              required
              value={formData.vehicleDetails.model}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                vehicleDetails: { ...prev.vehicleDetails, model: e.target.value }
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vehicle Registration *
            </label>
            <input
              type="text"
              required
              value={formData.vehicleDetails.registration}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                vehicleDetails: { ...prev.vehicleDetails, registration: e.target.value.toUpperCase() }
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pickup Date *
            </label>
            <input
              type="date"
              required
              value={formatDateForInput(formData.pickupDate)}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                pickupDate: formatDateForState(e.target.value)
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dropoff Date *
            </label>
            <input
              type="date"
              required
              value={formatDateForInput(formData.dropoffDate)}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                dropoffDate: formatDateForState(e.target.value)
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Description
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price/Unit
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax %
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].description = e.target.value;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      className="block w-full border-0 p-0 focus:ring-0 sm:text-sm"
                      placeholder="Enter item description"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].quantity = parseInt(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      className="block w-full border-0 p-0 text-right focus:ring-0 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.pricePerUnit}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].pricePerUnit = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      className="block w-full border-0 p-0 text-right focus:ring-0 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.tax}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].tax = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      className="block w-full border-0 p-0 text-right focus:ring-0 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    ₹{((item.quantity * item.pricePerUnit) * (1 + item.tax / 100)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              items: [...prev.items, { description: '', quantity: 1, pricePerUnit: 0, tax: 0 }]
            }))}
            className="mt-4 text-sm text-blue-600 hover:text-blue-500"
          >
            + Add Another Item
          </button>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-1/3">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{formData.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>Tax</span>
                <span>₹{formData.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit * (item.tax / 100)), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-medium mt-4 border-t border-gray-200 pt-4">
                <span>Total</span>
                <span>₹{formData.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit * (1 + item.tax / 100)), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={() => router.push('/dashboard/invoices')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
} 
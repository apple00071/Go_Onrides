'use client';

import { useState, FormEvent } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import { getSupabaseClient } from '@/lib/supabase';
import { generateInvoice } from '@/lib/generateInvoice';
import { toast } from 'react-hot-toast';
import { formatDateForDisplay, formatDateForInput } from '@/lib/utils';

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

export default function InvoicesPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    customerName: '',
    gstNumber: '',
    invoiceNumber: `INV${Math.floor(Math.random() * 1000000)}`,
    invoiceDate: formatDateForDisplay(new Date()),
    paymentMethod: 'Bank Transfer',
    vehicleDetails: {
      model: '',
      registration: ''
    },
    pickupDate: formatDateForDisplay(new Date()),
    dropoffDate: formatDateForDisplay(new Date()),
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
  const handleDateChange = (field: string, value: string) => {
    try {
      const date = new Date(value);
      setFormData(prev => ({
        ...prev,
        [field]: formatDateForDisplay(date)
      }));
    } catch {
      setFormData(prev => ({
        ...prev,
        [field]: ''
      }));
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
      
      // Reset form
      setFormData({
        ...formData,
        customerName: '',
        gstNumber: '',
        invoiceNumber: `INV${Math.floor(Math.random() * 1000000)}`,
        vehicleDetails: {
          model: '',
          registration: ''
        },
        items: [
          {
            description: '',
            quantity: 1,
            pricePerUnit: 0,
            tax: 0
          }
        ]
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate and manage invoices
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="w-24 h-24 relative">
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

            <div className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                    onChange={(e) => handleDateChange('invoiceDate', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    {formData.invoiceDate ? formatDateForDisplay(formData.invoiceDate) : 'Not selected'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pickup Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formatDateForInput(formData.pickupDate)}
                    onChange={(e) => handleDateChange('pickupDate', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    {formData.pickupDate ? formatDateForDisplay(formData.pickupDate) : 'Not selected'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dropoff Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formatDateForInput(formData.dropoffDate)}
                    onChange={(e) => handleDateChange('dropoffDate', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="mt-1 text-sm text-gray-500">
                    {formData.dropoffDate ? formatDateForDisplay(formData.dropoffDate) : 'Not selected'}
                  </div>
                </div>
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

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].description = e.target.value;
                          setFormData(prev => ({ ...prev, items: newItems }));
                        }}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].quantity = parseInt(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, items: newItems }));
                        }}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="col-span-2">
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
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Price"
                      />
                    </div>
                    <div className="col-span-2">
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
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Tax %"
                      />
                    </div>
                  </div>
                ))}
        </div>
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

            <div className="mt-6">
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

            <div className="flex justify-end">
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

        {/* Invoice List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h2>
          <div className="space-y-4">
            {/* Invoice list will be implemented here */}
            <p className="text-sm text-gray-500">No invoices generated yet</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
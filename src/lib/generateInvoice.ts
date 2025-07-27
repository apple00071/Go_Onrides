import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    previousAutoTable: {
      finalY: number;
    };
  }
}

interface InvoiceItem {
  description: string;
  quantity: number;
  pricePerUnit: number;
  tax: number;
}

interface InvoiceData {
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
  items: InvoiceItem[];
  signature?: string; // Optional signature field
}

export const generateInvoice = async (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(24);
  doc.text('INVOICE', pageWidth - 15, 25, { align: 'right' });
  doc.setFontSize(10);
  doc.text('Page 1 of 1', pageWidth - 15, 32, { align: 'right' });

  // Company Info
  doc.setFontSize(10);
  const companyAddress = [
    'Go Onriders',
    'BDF1, ground floor, New Police Station, Street Number 4, 5th line, nearby S R Nagar opp sri ganesh ladies hostel,',
    'East Srinivas Nagar Colony, Srinivasa Nagar, Sanjeeva Reddy Nagar, Hyderabad, Telangana 500038, 500072'
  ];
  doc.text(companyAddress, 15, 25);

  // Customer Info
  doc.setFontSize(12);
  doc.text(data.customerName, 15, 60);
  if (data.gstNumber) {
    doc.setFontSize(10);
    doc.text(`GST NUM = ${data.gstNumber}`, 15, 67);
  }

  // Invoice Details
  doc.setFontSize(10);
  const invoiceDetails = [
    ['Invoice Number', data.invoiceNumber],
    ['Invoice Date', data.invoiceDate],
    ['Payment Method', data.paymentMethod]
  ];
  doc.autoTable({
    startY: 75,
    head: [],
    body: invoiceDetails,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 }
    }
  });

  // Vehicle and Rental Details
  const rentalDetails = [
    ['Vehicle Model', data.vehicleDetails.model],
    ['Registration', data.vehicleDetails.registration],
    ['Pickup Date', data.pickupDate],
    ['Dropoff Date', data.dropoffDate]
  ];
  doc.autoTable({
    startY: doc.previousAutoTable.finalY + 10,
    head: [],
    body: rentalDetails,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 }
    }
  });

  // Items Table
  const tableHeaders = [['Item Description', 'Quantity', 'Price/Unit', 'Tax %', 'Total']];
  const tableBody = data.items.map(item => [
    item.description,
    item.quantity.toString(),
    `₹${item.pricePerUnit.toFixed(2)}`,
    `${item.tax}%`,
    `₹${(item.quantity * item.pricePerUnit * (1 + item.tax / 100)).toFixed(2)}`
  ]);

  doc.autoTable({
    startY: doc.previousAutoTable.finalY + 15,
    head: tableHeaders,
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 10 }
  });

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
  const tax = data.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit * (item.tax / 100)), 0);
  const total = subtotal + tax;

  // Add totals
  const totalsData = [
    ['Subtotal', `₹${subtotal.toFixed(2)}`],
    ['Tax', `₹${tax.toFixed(2)}`],
    ['Total', `₹${total.toFixed(2)}`]
  ];

  doc.autoTable({
    startY: doc.previousAutoTable.finalY + 10,
    head: [],
    body: totalsData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: pageWidth - 95 }
  });

  // Add "Thanks visit again" message
  doc.setFontSize(10);
  doc.text('Thanks visit again', 15, doc.previousAutoTable.finalY + 20);

  // Add signature if provided
  if (data.signature) {
    const signatureY = doc.previousAutoTable.finalY + 40;
    doc.addImage(data.signature, 'PNG', 15, signatureY, 50, 20);
    doc.text('Customer Signature', 15, signatureY + 25);
  }

  return doc.output('blob');
}; 
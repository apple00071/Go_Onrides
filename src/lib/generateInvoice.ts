import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSupabaseClient } from '@/lib/supabase';

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
  items: Array<{
    description: string;
    quantity: number;
    pricePerUnit: number;
    tax: number;
  }>;
}

export const generateInvoice = async (data: InvoiceData): Promise<Blob> => {
  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add logo
  try {
    const supabase = getSupabaseClient();
    const { data: settings, error } = await supabase
      .from('company_settings')
      .select('logo')
      .single();

    if (error) {
      console.error('Error fetching logo:', error);
    } else if (settings?.logo) {
      // Add logo to top right
      const imageData = `data:image/png;base64,${settings.logo}`;
      doc.addImage(imageData, 'PNG', pageWidth - 50, 15, 35, 35);
    }
  } catch (error) {
    console.error('Error adding logo:', error);
  }

  // Header
  doc.setFontSize(20);
  doc.setTextColor(88, 28, 255); // Purple color for INVOICE
  doc.text('INVOICE', 15, 25);
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128); // Gray color
  doc.text('Page 1 of 1', 15, 32);

  // Company Info
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const companyAddress = 'Go Onriders | BDF1, ground floor, New Police Station, Street Number 4, 5th line, nearby S R Nagar opp sri ganesh ladies hostel, East Srinivas Nagar Colony, Srinivasa Nagar, Sanjeeva Reddy Nagar, Hyderabad, Telangana 500038, 500072 | India';
  doc.text(companyAddress, 15, 45, { maxWidth: pageWidth - 30 });

  // Customer Info
  doc.setFontSize(14);
  doc.text(data.customerName, 15, 65);
  if (data.gstNumber) {
    doc.setFontSize(10);
    doc.text(`GST NUM = ${data.gstNumber}`, 15, 72);
  }

  // Invoice Details
  doc.setFontSize(10);
  const detailsY = 85;
  doc.text('Invoice Number', 15, detailsY);
  doc.text('Invoice Date', 80, detailsY);
  doc.text('Due in', 145, detailsY);
  doc.text('Payment Method', 210, detailsY);

  doc.setFont('helvetica', 'bold');
  doc.text(data.invoiceNumber, 15, detailsY + 7);
  doc.text(data.invoiceDate, 80, detailsY + 7);
  doc.text('0 days', 145, detailsY + 7);
  doc.text(data.paymentMethod, 210, detailsY + 7);
  doc.setFont('helvetica', 'normal');

  // Items Table
  const tableHeaders = [
    ['ITEM DESCRIPTION', 'QUANTITY', 'PRICE/UNIT', 'TOTAL']
  ];

  // Set font for currency
  doc.setFont('times', 'normal');

  const tableBody = data.items.map(item => [
    item.description,
    `${item.quantity} Per day`,
    `Rs. ${item.pricePerUnit.toFixed(2)}`,
    `Rs. ${(item.quantity * item.pricePerUnit).toFixed(2)}${item.tax > 0 ? `\n+${item.tax}% tax` : ''}`
  ]);

  let finalY = 110;
  autoTable(doc, {
    startY: finalY,
    head: tableHeaders,
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: false,
      textColor: [128, 128, 128],
      fontSize: 10,
      fontStyle: 'bold',
      font: 'times'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40, halign: 'left' },
      2: { cellWidth: 40, halign: 'left' },
      3: { cellWidth: 40, halign: 'left' }
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
      font: 'times'
    },
    didDrawPage: function(tableData) {
      if (tableData.cursor) {
        finalY = tableData.cursor.y;
      }
    }
  });

  // Add some spacing after the table
  finalY += 10;

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
  const tax = data.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit * (item.tax / 100)), 0);
  const total = subtotal + tax;

  // Add totals
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', 15, finalY);
  doc.setFont('times', 'normal');
  doc.text(`Rs. ${subtotal.toFixed(2)}`, 50, finalY);

  doc.setFont('helvetica', 'normal');
  doc.text('Tax (0%)', 15, finalY + 7);
  doc.setFont('times', 'normal');
  doc.text(`Rs. ${tax.toFixed(2)}`, 50, finalY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Total INR', 15, finalY + 20);
  doc.setFont('times', 'bold');
  doc.text(`Rs. ${total.toFixed(2)}`, 50, finalY + 20);
  doc.setFont('helvetica', 'normal');

  // Payment Method
  doc.text('Payment Method', 15, finalY + 35);
  doc.text(data.paymentMethod, 15, finalY + 42);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('BDF1, ground floor, New Police Station, Street Number 4, 5th line, nearby S R Nagar opp sri ganesh ladies hostel, East Srinivas Nagar Colony, Srinivasa Nagar, Sanjeeva Reddy Nagar, Hyderabad, Telangana 500038, 500072 | India', 15, doc.internal.pageSize.height - 15, { maxWidth: pageWidth - 30 });

  // Convert to blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}; 
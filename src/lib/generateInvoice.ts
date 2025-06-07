import jsPDF from 'jspdf';
import { formatCurrency, formatDate } from './utils';

interface BookingForInvoice {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  customer_email?: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time: string;
  booking_amount: number;
  security_deposit_amount: number;
  paid_amount: number;
  payment_status: string;
  payment_mode: string;
  status: string;
  damage_charges?: number;
  refund_amount?: number;
  created_at: string;
  signature?: string;
}

const TERMS_AND_CONDITIONS = [
  "1. This invoice is a computer-generated document and does not require a physical signature.",
  "2. All disputes are subject to legal jurisdiction of Hyderabad courts only.",
  "3. The customer agrees to be bound by the terms and conditions of the rental agreement.",
  "4. Damage charges, if any, are non-negotiable and final.",
  "5. Security deposit refund will be processed as per the terms in the rental agreement.",
  "6. The company reserves the right to take legal action in case of payment defaults or vehicle damage.",
  "7. By accepting this invoice, the customer acknowledges and agrees to all terms and conditions."
];

const drawHorizontalLine = (doc: jsPDF, y: number, width: number = 170) => {
  const startX = 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(startX, y, startX + width, y);
};

const drawTableHeader = (doc: jsPDF, y: number) => {
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y - 5, 170, 10, 'F');
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
};

// Helper function to format currency with ₹ symbol
const formatIndianCurrency = (amount: number) => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return formatter.format(amount);
};

export const generateInvoice = async (booking: BookingForInvoice) => {
  // Create a new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add company header
  doc.setFillColor(51, 51, 51);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('GOON RIDERS', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', pageWidth / 2, 32, { align: 'center' });
  
  // Reset text color for rest of the document
  doc.setTextColor(0, 0, 0);
  
  // Add invoice details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${booking.booking_id}`, 20, 55);
  doc.text(`Date: ${formatDate(booking.created_at)}`, pageWidth - 60, 55);
  
  drawHorizontalLine(doc, 60);
  
  // Add customer details section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 20, 70);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${booking.customer_name}`, 20, 80);
  doc.text(`Contact: ${booking.customer_contact}`, 20, 87);
  if (booking.customer_email) {
    doc.text(`Email: ${booking.customer_email}`, 20, 94);
  }
  
  drawHorizontalLine(doc, 100);
  
  // Add vehicle and booking details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RENTAL DETAILS', 20, 110);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vehicle: ${booking.vehicle_details.model}`, 20, 120);
  doc.text(`Registration: ${booking.vehicle_details.registration}`, 20, 127);
  doc.text(`Period: ${formatDate(booking.start_date)} to ${formatDate(booking.end_date)}`, 20, 134);
  doc.text(`Pickup Time: ${booking.pickup_time}`, 20, 141);
  doc.text(`Dropoff Time: ${booking.dropoff_time}`, 20, 148);
  
  drawHorizontalLine(doc, 154);
  
  // Add charges table
  drawTableHeader(doc, 169);
  doc.text('CHARGES BREAKDOWN', 20, 169);
  
  let yPos = 184;
  doc.setFont('helvetica', 'normal');
  
  // Booking amount
  doc.text('Booking Amount:', 20, yPos);
  doc.text(formatIndianCurrency(booking.booking_amount), 160, yPos, { align: 'right' });
  yPos += 10;
  
  // Security deposit
  if (booking.status !== 'completed') {
    doc.text('Security Deposit:', 20, yPos);
    doc.text(formatIndianCurrency(booking.security_deposit_amount), 160, yPos, { align: 'right' });
    yPos += 10;
  }
  
  // Damage charges if any
  if (booking.damage_charges && booking.damage_charges > 0) {
    doc.text('Damage Charges:', 20, yPos);
    doc.text(formatIndianCurrency(booking.damage_charges), 160, yPos, { align: 'right' });
    yPos += 10;
  }
  
  // Security deposit refund for completed bookings
  if (booking.status === 'completed' && booking.refund_amount) {
    doc.text('Security Deposit Refund:', 20, yPos);
    doc.text(`(${formatIndianCurrency(booking.refund_amount)})`, 160, yPos, { align: 'right' });
    yPos += 10;
  }
  
  drawHorizontalLine(doc, yPos);
  yPos += 10;
  
  // Total section
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 20, yPos);
  doc.text(formatIndianCurrency(booking.booking_amount + (booking.damage_charges || 0)), 160, yPos, { align: 'right' });
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid:', 20, yPos);
  doc.text(formatIndianCurrency(booking.paid_amount), 160, yPos, { align: 'right' });
  yPos += 10;
  
  if (booking.paid_amount < (booking.booking_amount + (booking.damage_charges || 0))) {
    doc.setTextColor(255, 0, 0);
    doc.text('Balance Due:', 20, yPos);
    doc.text(formatIndianCurrency((booking.booking_amount + (booking.damage_charges || 0)) - booking.paid_amount), 160, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }
  
  // Payment information
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT INFORMATION', 20, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${booking.payment_status.toUpperCase()}`, 20, yPos);
  doc.text(`Mode: ${booking.payment_mode.replace('_', ' ').toUpperCase()}`, 100, yPos);
  
  // Customer Signature
  if (booking.signature) {
    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER SIGNATURE', 20, yPos);
    yPos += 10;
    
    // Add the signature image
    try {
      doc.addImage(booking.signature, 'PNG', 20, yPos, 50, 20);
      yPos += 25;
    } catch (error) {
      console.error('Error adding signature to invoice:', error);
    }
  }
  
  // Terms and conditions
  yPos += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS AND CONDITIONS', 20, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  TERMS_AND_CONDITIONS.forEach(term => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(term, 20, yPos, { maxWidth: 170 });
    yPos += 7;
  });
  
  // Add footer
  const footerText = 'This is a computer-generated invoice and does not require a signature.';
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(footerText, pageWidth / 2, 285, { align: 'center' });
  
  // Return the PDF as a blob
  return doc.output('blob');
}; 
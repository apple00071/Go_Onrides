import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure email transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'goonriders6@gmail.com',
    pass: 'xzqu ujms cmak scfw'
  }
});

export async function GET() {
  try {
    // Send test email
    await transporter.sendMail({
      from: 'goonriders6@gmail.com',
      to: 'goonriders6@gmail.com',
      subject: 'Test Email - Go-On Rides Daily Report',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email to verify the email configuration for Go-On Rides daily reports.</p>
        <p>If you receive this email, it means your email configuration is working correctly!</p>
        <p>Time sent: ${new Date().toLocaleString()}</p>
      `
    });

    return NextResponse.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
} 
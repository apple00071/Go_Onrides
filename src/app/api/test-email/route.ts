import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    console.log('Testing email configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
    console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
    console.log('CRON_SECRET exists:', !!process.env.CRON_SECRET);

    // Configure email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'goonriders6@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'xzqu ujms cmak scfw'
      }
    });

    // Test email content
    const testHtml = `
      <h2>Email Test - Go-On Rides</h2>
      <p>This is a test email to verify the email configuration is working.</p>
      <p>Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      <p>If you receive this email, the daily report system should be working.</p>
    `;

    // Send test email
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'goonriders6@gmail.com',
      to: process.env.ADMIN_EMAIL || 'goonriders6@gmail.com',
      subject: `Email Test - ${new Date().toLocaleDateString('en-IN')}`,
      html: testHtml
    });

    console.log('Email sent successfully:', result.messageId);

    return NextResponse.json({ 
      success: true, 
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Email test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send test email',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

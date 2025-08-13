import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Metadata } from 'next';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Go-On Rides',
  description: 'Vehicle rental service',
  viewport: 'width=device-width, initial-scale=1.0',
  other: {
    'fast2sms': 'oENCCqLZoTtQA9F64d0qxNVpBVsPSesI'
  }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn('min-h-screen bg-gray-50', inter.className)}>
        {children}
      </body>
    </html>
  );
}

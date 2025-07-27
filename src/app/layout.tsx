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
      <head>
        <meta name="fast2sms" content="oENCCqLZoTtQA9F64d0qxNVpBVsPSesI" />
      </head>
      <body className={cn('h-full antialiased', inter.className)}>
        <div className="min-h-screen w-full">
        {children}
        </div>
      </body>
    </html>
  );
}

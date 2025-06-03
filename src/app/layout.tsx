import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Goon Riders',
  description: 'Vehicle rental management system',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={cn('h-full antialiased', inter.className)}>
        <div className="min-h-screen">
        {children}
        </div>
      </body>
    </html>
  );
}

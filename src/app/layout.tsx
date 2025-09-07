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
  description: 'Complete vehicle rental management system for bookings, customers, and payments',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Go-On Rides',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  other: {
    'fast2sms': 'oENCCqLZoTtQA9F64d0qxNVpBVsPSesI',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Go-On Rides',
    'application-name': 'Go-On Rides',
    'msapplication-TileColor': '#2563eb',
    'msapplication-config': '/browserconfig.xml',
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  viewportFit: 'cover',
  themeColor: '#2563eb',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={cn('min-h-screen bg-gray-50', inter.className)}>
        {children}
      </body>
    </html>
  );
}

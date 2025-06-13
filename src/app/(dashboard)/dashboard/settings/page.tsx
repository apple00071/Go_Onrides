import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import with no SSR to avoid hydration mismatch
const SettingsClient = dynamic(() => import('@/components/settings/SettingsClient'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function SettingsPage() {
  return <SettingsClient />;
} 
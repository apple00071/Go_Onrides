import { Wifi, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <Wifi className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Offline</h1>
          <p className="text-gray-600">
            It looks like you've lost your internet connection. Don't worry, you can still view some content that was previously loaded.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>

          <div className="text-sm text-gray-500">
            <p>When you're back online, the app will automatically sync your data.</p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-white rounded-lg shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">Available Offline:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Previously viewed bookings</li>
            <li>• Customer information</li>
            <li>• Cached dashboard data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

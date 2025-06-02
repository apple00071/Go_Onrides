'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
            aria-label="Go Back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          
          <div className="px-6 py-5">
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Information Collection and Use</h2>
              
              <p className="mb-4">
                GO-ON RIDERS is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our vehicle rental services.
              </p>
              
              <p className="mb-4">
                We may collect personal information such as:
              </p>
              
              <ul className="list-disc pl-5 space-y-2 mb-6">
                <li>Name, contact information, and email address</li>
                <li>Identification documents (Driving License, Aadhar Card)</li>
                <li>Payment details and transaction history</li>
                <li>Rental history and preferences</li>
                <li>Emergency contact information</li>
              </ul>
              
              <p className="mb-4">
                We use this information to:
              </p>
              
              <ul className="list-disc pl-5 space-y-2 mb-6">
                <li>Process and manage your vehicle rentals</li>
                <li>Contact you regarding your bookings, payments, and services</li>
                <li>Verify your identity and eligibility to rent vehicles</li>
                <li>Improve our services and customer experience</li>
                <li>Comply with legal obligations</li>
              </ul>
              
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Security</h2>
              
              <p className="mb-4">
                We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, so we cannot guarantee absolute security.
              </p>
              
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Sharing</h2>
              
              <p className="mb-4">
                We may share your information with:
              </p>
              
              <ul className="list-disc pl-5 space-y-2 mb-6">
                <li>Service providers who assist us in operating our business</li>
                <li>Law enforcement or government officials, when required by law</li>
                <li>Insurance providers in case of accidents or claims</li>
              </ul>
              
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Rights</h2>
              
              <p className="mb-4">
                You have the right to:
              </p>
              
              <ul className="list-disc pl-5 space-y-2 mb-6">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information (subject to legal requirements)</li>
                <li>Object to certain processing of your information</li>
              </ul>
              
              <p className="text-sm text-gray-600 mt-8">
                Last updated: {new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
              </p>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              For any questions about your privacy, please contact GO-ON RIDERS directly.
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 
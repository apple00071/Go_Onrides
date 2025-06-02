'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TermsPage() {
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
            <h1 className="text-2xl font-bold text-gray-900">Terms and Conditions</h1>
          </div>
          
          <div className="px-6 py-5">
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Vehicle Rental Terms</h2>
              
              <p className="mb-4">The following terms and conditions apply to all vehicle rentals from GO-ON RIDERS:</p>
              
              <ul className="list-disc pl-5 space-y-4 mb-6">
                <li>Day implies 24 hours. A maximum of a 1-hour grace period is accepted on 1 day prior intimation.</li>
                <li>The vehicle should be given back with the same amount of fuel available while taking the vehicle, and if in case fuel is not topped up fuel charges + 10% fuel charges are levied.</li>
                <li>The vehicle shall be collected and dropped off at our garage. Vehicle pickup/drop-off charges shall be Rs.300 each way in case pickup/drop-off of the vehicle at your location is required. (Subject to the availability of drivers.)</li>
                <li>Any accident/damages shall be the client cost and shall be charged at actuals. The decision of GO-ON RIDERS.</li>
                <li>Any maintenance charges accrued due to misuse of the vehicle shall be to the client's account.</li>
                <li>Routine maintenance is to GO-ON RIDERS account.</li>
                <li>The vehicle shall not be used for motor sports or any such activity that may impair the long term performance and condition of the vehicle.</li>
                <li>The minimum age of the renter shall be 21 years, and he/she shall possess a minimum driving experience of 1 years.</li>
                <li>The vehicle shall not be used for any other purpose other than the given purpose in the agreement form.</li>
                <li>Any extension of the Vehicle should be informed in advance and is possible with the acceptance of GO-ON RIDERS.</li>
                <li>Any violation of the terms will lead to termination of the deposit.</li>
                <li>Without prior intimation of extension of vehicle lead to penalty of Rs. 1000 per day.</li>
              </ul>
              
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Terms</h2>
              
              <ul className="list-disc pl-5 space-y-4 mb-6">
                <li>During the ride, only damage / accident / theft / penalty shall be bared by client & shall be charged at actual cost. The decision of GO-ON RIDERS is final in this regard.</li>
                <li>No other person is allowed to drive the vehicle. If somebody else drives, the customer (mentioned) will be responsible for any wrong happening and will bear all the expenses.</li>
                <li>The vehicle shall not be used for any other purpose other than the given purpose in agreement form.</li>
                <li>Vehicle will not be used for any illegal activities.</li>
                <li>Vehicle will not be driven outside the ORR(Outer Ring Road) without giving proper intimation to GO-ON RIDERS.</li>
                <li>In such case without Intimation a penalty upto 10,000/- shall be charged, the decision of GO-ON RIDERS.</li>
                <li>Vehicle will be collected & dropped at the warehouse only.</li>
                <li>Checking the vehicle condition before starting the ride and anything after the start of the trip will be customer's responsibility.</li>
                <li>No further discussion on the fuel left over during the time of the vehicle returned.</li>
                <li>If any damage occurs the client should be ready to pay:- The Total damage charge that is:
                  <ul className="list-disc pl-5 mt-2 mb-2">
                    <li>Showroom price of the bike part + down time equivalent charges (Rent per day -&- labour charges).</li>
                  </ul>
                </li>
                <li>If there is any challan levied during the trip, all the charges and fine will be paid by the customer only. We will not be responsible.</li>
                <li>If any of the above mentioned points are not maintained by the client then the GO-ON RIDERS have to complete rights to fine the client.</li>
              </ul>
              
              <p className="text-sm text-gray-600 mt-8">
                Last updated: {new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
              </p>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              For any questions about these terms, please contact GO-ON RIDERS directly.
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
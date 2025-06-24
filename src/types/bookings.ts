export type BookingStatus = 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';

export interface OutstationDetails {
  destination: string;
  estimated_kilometers: number;
  odd_meter_reading: number;
}

export interface UploadedDocuments {
  customer_photo?: string;
  aadhar_front?: string;
  aadhar_back?: string;
  dl_front?: string;
  dl_back?: string;
  [key: string]: string | undefined;
}

export interface SubmittedDocuments {
  original_aadhar: boolean;
  original_dl: boolean;
  passport: boolean;
  voter_id: boolean;
  other_document: string;
  [key: string]: boolean | string;
}

export interface BookingDetails {
  id: string;
  booking_id: string;
  customer_id: string;
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  alternative_phone: string;
  emergency_contact_phone: string;
  emergency_contact_phone1: string;
  aadhar_number: string;
  date_of_birth: string;
  dl_number: string;
  dl_expiry_date: string;
  temp_address: string;
  perm_address: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time: string;
  booking_amount: number;
  security_deposit_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_mode: string;
  payment_status: string;
  status: string;
  rental_purpose?: 'local' | 'outstation';
  outstation_details?: OutstationDetails;
  uploaded_documents?: UploadedDocuments;
  submitted_documents?: SubmittedDocuments;
  signature?: string;
  terms_accepted: boolean;
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
}

export interface BookingDetailsData extends Omit<BookingDetails, 'payment_status' | 'payment_mode' | 'status'> {
  payment_status: 'full' | 'partial' | 'pending';
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  status: BookingStatus;
  completed_at?: string;
  completed_by?: string;
  completed_by_user?: {
    email: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  created_by_user?: {
    email: string;
    username: string;
  };
  updated_by_user?: {
    email: string;
    username: string;
  };
  vehicle_remarks?: string;
  damage_charges: number;
  refund_amount: number;
  late_fee: number;
  extension_fee: number;
  signatures?: {
    bookingSignature?: string;
    completionSignature?: string;
  };
} 
export type BookingStatus = 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';

export interface OutstationDetails {
  destination: string;
  estimated_kms: number;
  start_odo: number;
  end_odo: number;
}

export interface UploadedDocuments {
  customer_photo?: string | undefined;
  aadhar_front?: string | undefined;
  aadhar_back?: string | undefined;
  dl_front?: string | undefined;
  dl_back?: string | undefined;
  [key: string]: string | undefined;
}

export interface SubmittedDocuments {
  original_aadhar: boolean;
  original_dl: boolean;
  passport: boolean;
  voter_id: boolean;
  other_document: boolean;
  [key: string]: boolean;
}

export interface BookingDetails {
  id: string;
  booking_id: string;
  customer_id: string;
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  alternative_phone?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_phone1?: string | null;
  colleague_phone?: string | null;
  aadhar_number: string;
  date_of_birth?: string | null;
  dl_number?: string | null;
  dl_expiry_date?: string | null;
  temp_address?: string | null;
  perm_address?: string | null;
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
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  completed_at?: string;
  completed_by?: string;
  created_by_user?: {
    email: string;
    username: string;
  };
  updated_by_user?: {
    email: string;
    username: string;
  };
  completed_by_user?: {
    email: string;
    username: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    documents: Record<string, string>;
  };
  submitted_documents?: SubmittedDocuments;
  signatures?: {
    bookingSignature: string | null;
    completionSignature: string | null;
  };
  damage_charges: number;
  late_fee: number;
  extension_fee: number;
  refund_amount: number;
  vehicle_remarks: string;
}

export type BookingDetailsData = BookingDetails; 
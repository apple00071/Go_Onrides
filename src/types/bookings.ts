export type BookingStatus = 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'full';
export type PaymentMode = 'cash' | 'upi' | 'card' | 'bank_transfer';
export type RentalPurpose = 'local' | 'outstation';

export interface VehicleDetails {
  model: string;
  registration: string;
}

export interface BookingRecord {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_contact: string;
  vehicle_details: VehicleDetails;
  booking_amount: number;
  security_deposit_amount: number;
  paid_amount: number;
  payment_status: PaymentStatus;
  status: BookingStatus;
  created_at: string;
  damage_charges: number;
  late_fee: number;
  extension_fee: number;
  completed_at: string | null;
  completed_by: string | null;
  start_date: string;
  end_date: string;
  dropoff_time: string;
  payments: PaymentRecord[];
  refund_amount: number;
  total_amount: number;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  payment_mode: PaymentMode;
  created_at: string;
  booking: {
    id: string;
    customer_name: string;
    vehicle_details: VehicleDetails;
  } | null;
}

export interface OutstationDetails {
  purpose: string;
  destination: string;
  colleague_name?: string;
  colleague_phone?: string;
  estimated_kms: number;
  start_odo: number;
  end_odo: number;
}

export interface BookingExtension {
  id: string;
  booking_id: string;
  additional_amount: number;
  created_at: string;
  previous_end_date?: string;
  previous_dropoff_time?: string;
}

export interface SubmittedDocuments {
  passport: boolean;
  voter_id: boolean;
  original_dl: boolean;
  original_aadhar: boolean;
  other_document: boolean;
}

export interface UploadedDocuments {
  customer_photo?: string;
  aadhar_front?: string;
  aadhar_back?: string;
  dl_front?: string;
  dl_back?: string;
  passport?: string;
  voter_id?: string;
  original_dl?: string;
  original_aadhar?: string;
  other_document?: string;
}

export interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  documents: Record<string, string>;
}

export interface BookingDetailsData extends BookingRecord {
  outstation_details?: OutstationDetails;
  booking_extensions?: BookingExtension[];
  customer_email?: string;
  customer_address?: string;
  customer_documents?: Record<string, string>;
  submitted_documents?: SubmittedDocuments;
  signatures?: {
    bookingSignature?: string;
    completionSignature?: string;
  };
  payment_mode?: PaymentMode;
  rental_purpose?: RentalPurpose;
  pickup_time?: string;
  extensions?: BookingExtension[];
  alternative_phone?: string;
  emergency_contact_phone?: string;
  emergency_contact_phone1?: string;
  colleague_phone?: string;
  aadhar_number?: string;
  date_of_birth?: string;
  dl_number?: string;
  dl_expiry_date?: string;
  temp_address?: string;
  perm_address?: string;
  customer?: CustomerDetails;
  vehicle_remarks?: string;
  created_by_user?: {
    id: string;
    email: string;
    role: string;
    username: string;
  };
  completed_by_user?: {
    id: string;
    email: string;
    role: string;
    username: string;
  };
  updated_by_user?: {
    id: string;
    email: string;
    role: string;
    username: string;
  };
  updated_at?: string;
}

export interface BookingDetails extends BookingDetailsData {
  payments: PaymentRecord[];
}

// Update Database interface
import { Database as BaseDatabase } from './database';

export interface Database extends BaseDatabase {
  public: {
    Tables: {
      bookings: {
        Row: BookingRecord;
        Insert: Omit<BookingRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<BookingRecord, 'id'>>;
      };
      payments: {
        Row: PaymentRecord;
        Insert: Omit<PaymentRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<PaymentRecord, 'id'>>;
      };
    } & BaseDatabase['public']['Tables'];
  };
} 
export type UserRole = 'admin' | 'worker';

export interface Permission {
  createBooking: boolean;
  viewBookings: boolean;
  uploadDocuments: boolean;
  viewDocuments: boolean;
  managePayments: boolean;
  accessReports: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_name: string;
  customer_contact: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  aadhar_number: string | null;
  date_of_birth: string | null;
  dl_number: string | null;
  dl_expiry_date: string | null;
  start_date: string;
  end_date: string;
  pickup_time: string;
  dropoff_time: string;
  temp_address: string;
  perm_address: string;
  vehicle_details: {
    model: string;
    registration: string;
  };
  booking_amount: number;
  security_deposit_amount: number;
  total_amount: number;
  payment_status: 'full' | 'partial' | 'pending';
  paid_amount: number;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer';
  status: 'pending' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
  documents: Document[];
  signature_url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  booking_id: string | null;
  type: string;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed';
  created_by: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
  dob: string;
  identification: {
    aadhar_number: string;
    dl_number: string;
    dl_expiry: string;
  };
  address: {
    temporary: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
    permanent: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  documents: {
    type: string;
    url: string;
    uploaded_at: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'created_at' | 'updated_at'>>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Booking, 'created_at' | 'updated_at'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'created_at'>;
        Update: Partial<Omit<Payment, 'created_at'>>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
} 
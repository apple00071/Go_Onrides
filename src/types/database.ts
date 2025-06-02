export interface Permission {
  createBooking?: boolean;
  viewBookings?: boolean;
  editBookings?: boolean;
  uploadDocuments?: boolean;
  viewDocuments?: boolean;
  editDocuments?: boolean;
  managePayments?: boolean;
  accessReports?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  permissions?: Permission;
  created_at?: string;
}

export interface UserLog {
  id: string;
  user_id: string;
  action_type: 'login' | 'logout' | 'create' | 'update' | 'delete';
  entity_type: 'user' | 'booking' | 'customer' | 'payment' | 'document' | 'vehicle';
  entity_id: string;
  details: any;
  created_at: string;
  user_email?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at'>;
        Update: Partial<Omit<UserProfile, 'created_at'>>;
      };
    };
  };
}


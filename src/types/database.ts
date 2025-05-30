export interface Permission {
  viewBookings: boolean;
  createBooking: boolean;
  viewDocuments: boolean;
  uploadDocuments: boolean;
  accessReports: boolean;
  managePayments: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'worker';
  permissions: Permission;
  created_at: string;
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


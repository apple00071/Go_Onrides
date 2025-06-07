export type Permission = {
  createBooking: boolean;
  viewBookings: boolean;
  managePayments: boolean;
  accessReports: boolean;
  viewCustomers: boolean;
};

export type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'worker';
  permissions: Permission;
  created_at?: string;
  updated_at?: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  temp_address_street: string | null;
  perm_address_street: string | null;
  created_at: string;
};

export type UserLog = {
  id: string;
  user_id: string;
  user_email?: string;
  action_type: 'login' | 'logout' | 'create' | 'update' | 'delete';
  entity_type: 'user' | 'booking' | 'customer' | 'payment' | 'document' | 'vehicle';
  entity_id: string;
  details: any;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at'>;
        Update: Partial<Omit<Customer, 'id'>>;
      };
      user_logs: {
        Row: UserLog;
        Insert: Omit<UserLog, 'id' | 'created_at'>;
        Update: Partial<Omit<UserLog, 'id'>>;
      };
    };
  };
}

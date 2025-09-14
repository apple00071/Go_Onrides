// User roles
export type Role = 'admin' | 'manager' | 'worker';

export interface Permission {
  // Booking Permissions
  createBooking: boolean;
  viewBookings: boolean;
  editBookings: boolean;
  deleteBookings: boolean;
  
  // Customer Permissions
  createCustomer: boolean;
  viewCustomers: boolean;
  editCustomers: boolean;
  deleteCustomers: boolean;
  
  // Vehicle Permissions
  createVehicle: boolean;
  viewVehicles: boolean;
  editVehicles: boolean;
  deleteVehicles: boolean;
  
  // Maintenance Permissions
  createMaintenance: boolean;
  viewMaintenance: boolean;
  editMaintenance: boolean;
  deleteMaintenance: boolean;
  
  // Invoice & Payment Permissions
  createInvoice: boolean;
  viewInvoices: boolean;
  editInvoices: boolean;
  managePayments: boolean;
  
  // Report Permissions
  viewReports: boolean;
  exportReports: boolean;
  
  // System Permissions
  manageUsers: boolean;
  manageSettings: boolean;
  viewAuditLogs: boolean;
  
  // Backward compatibility
  manageBookings?: boolean;
  manageCustomers?: boolean;
  manageVehicles?: boolean;
  manageMaintenance?: boolean;
  accessReports?: boolean;
  can_create_bookings?: boolean;
  can_view_bookings?: boolean;
  can_edit_bookings?: boolean;
  can_delete_bookings?: boolean;
  can_manage_users?: boolean;
  can_view_reports?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  phone?: string;
  role: Role;
  permissions: Permission;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  last_login_at?: string;
  is_active?: boolean;
}

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

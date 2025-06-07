export type Permission = {
  createBooking: boolean;
  viewBookings: boolean;
  managePayments: boolean;
  accessReports: boolean;
};

export type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'worker';
  permissions: Permission;
  created_at?: string;
  updated_at?: string;
};

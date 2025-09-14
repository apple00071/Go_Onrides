import type { Permission } from '@/types/database';

export const defaultPermissions: Permission = {
  // Booking Permissions
  createBooking: false,
  viewBookings: true,
  manageBookings: false,
  
  // Customer Permissions
  createCustomer: false,
  viewCustomers: true,
  manageCustomers: false,
  
  // Vehicle Permissions
  createVehicle: false,
  viewVehicles: true,
  manageVehicles: false,
  
  // Maintenance Permissions
  createMaintenance: false,
  viewMaintenance: true,
  manageMaintenance: false,
  
  // Invoice & Payment Permissions
  createInvoice: false,
  viewInvoices: true,
  managePayments: false,
  
  // Report Permissions
  accessReports: false,
  exportReports: false,
  
  // Return Permissions
  manageReturns: false,
  viewReturns: true,
  
  // Notification Permissions
  manageNotifications: false,
  viewNotifications: true,
  
  // Settings Permission
  manageSettings: false
};

export const permissionGroups = {
  'Booking Permissions': [
    { key: 'createBooking', label: 'Create Bookings' },
    { key: 'viewBookings', label: 'View Bookings' },
    { key: 'manageBookings', label: 'Manage Bookings' }
  ],
  'Customer Management': [
    { key: 'createCustomer', label: 'Create Customers' },
    { key: 'viewCustomers', label: 'View Customers' },
    { key: 'manageCustomers', label: 'Manage Customers' }
  ],
  'Vehicle Management': [
    { key: 'createVehicle', label: 'Add Vehicles' },
    { key: 'viewVehicles', label: 'View Vehicles' },
    { key: 'manageVehicles', label: 'Manage Vehicles' }
  ],
  'Maintenance': [
    { key: 'createMaintenance', label: 'Create Maintenance' },
    { key: 'viewMaintenance', label: 'View Maintenance' },
    { key: 'manageMaintenance', label: 'Manage Maintenance' }
  ],
  'Invoicing & Payments': [
    { key: 'createInvoice', label: 'Create Invoices' },
    { key: 'viewInvoices', label: 'View Invoices' },
    { key: 'managePayments', label: 'Manage Payments' }
  ],
  'Reports': [
    { key: 'accessReports', label: 'Access Reports' },
    { key: 'exportReports', label: 'Export Reports' }
  ],
  'Returns': [
    { key: 'manageReturns', label: 'Manage Returns' },
    { key: 'viewReturns', label: 'View Returns' }
  ],
  'Notifications': [
    { key: 'manageNotifications', label: 'Manage Notifications' },
    { key: 'viewNotifications', label: 'View Notifications' }
  ],
  'Settings': [
    { key: 'manageSettings', label: 'Manage Settings' }
  ]
} as const;

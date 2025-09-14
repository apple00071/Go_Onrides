import type { Permission } from '@/types/database';

export const defaultPermissions: Permission = {
  // Booking Permissions
  createBooking: false,
  viewBookings: true,
  editBookings: false,
  deleteBookings: false,
  
  // Customer Permissions
  createCustomer: false,
  viewCustomers: true,
  editCustomers: false,
  deleteCustomers: false,
  
  // Vehicle Permissions
  createVehicle: false,
  viewVehicles: true,
  editVehicles: false,
  deleteVehicles: false,
  
  // Maintenance Permissions
  createMaintenance: false,
  viewMaintenance: true,
  editMaintenance: false,
  deleteMaintenance: false,
  
  // Invoice & Payments
  createInvoice: false,
  viewInvoices: true,
  editInvoices: false,
  managePayments: false,
  
  // Reports
  viewReports: false,
  exportReports: false,
  
  // System
  manageUsers: false,
  manageSettings: false,
  viewAuditLogs: false
};

// Helper type to ensure all permission keys are included
type PermissionGroups = {
  [key: string]: {
    key: keyof Permission;
    label: string;
    description?: string;
  }[];
};

export const permissionGroups = {
  'Bookings': [
    { key: 'createBooking', label: 'Create Bookings', description: 'Can create new bookings' },
    { key: 'viewBookings', label: 'View Bookings', description: 'Can view all bookings' },
    { key: 'editBookings', label: 'Edit Bookings', description: 'Can modify existing bookings' },
    { key: 'deleteBookings', label: 'Delete Bookings', description: 'Can remove bookings' }
  ],
  'Customers': [
    { key: 'createCustomer', label: 'Create Customers', description: 'Can add new customers' },
    { key: 'viewCustomers', label: 'View Customers', description: 'Can view customer details' },
    { key: 'editCustomers', label: 'Edit Customers', description: 'Can update customer information' },
    { key: 'deleteCustomers', label: 'Delete Customers', description: 'Can remove customers' }
  ],
  'Vehicles': [
    { key: 'createVehicle', label: 'Add Vehicles', description: 'Can add new vehicles' },
    { key: 'viewVehicles', label: 'View Vehicles', description: 'Can view vehicle details' },
    { key: 'editVehicles', label: 'Edit Vehicles', description: 'Can update vehicle information' },
    { key: 'deleteVehicles', label: 'Delete Vehicles', description: 'Can remove vehicles' }
  ],
  'Maintenance': [
    { key: 'createMaintenance', label: 'Create Maintenance', description: 'Can create maintenance records' },
    { key: 'viewMaintenance', label: 'View Maintenance', description: 'Can view maintenance history' },
    { key: 'editMaintenance', label: 'Edit Maintenance', description: 'Can update maintenance records' },
    { key: 'deleteMaintenance', label: 'Delete Maintenance', description: 'Can remove maintenance records' }
  ],
  'Invoicing & Payments': [
    { key: 'createInvoice', label: 'Create Invoices', description: 'Can generate new invoices' },
    { key: 'viewInvoices', label: 'View Invoices', description: 'Can view all invoices' },
    { key: 'editInvoices', label: 'Edit Invoices', description: 'Can modify existing invoices' },
    { key: 'managePayments', label: 'Manage Payments', description: 'Can record and process payments' }
  ],
  'Reports': [
    { key: 'viewReports', label: 'View Reports', description: 'Can access all reports' },
    { key: 'exportReports', label: 'Export Reports', description: 'Can export report data' }
  ],
  'System Administration': [
    { key: 'manageUsers', label: 'Manage Users', description: 'Can create and manage user accounts' },
    { key: 'manageSettings', label: 'Manage Settings', description: 'Can modify system settings' },
    { key: 'viewAuditLogs', label: 'View Audit Logs', description: 'Can access system audit logs' }
  ]
} as const;

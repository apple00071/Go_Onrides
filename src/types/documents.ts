// Document types for the application
export interface Document {
  id: string;
  booking_id?: string;
  customer_id?: string;
  document_type: string;
  document_url: string;
  created_at: string;
  updated_at?: string;
}

// Document types that can be uploaded
export type DocumentType = 
  | 'customer_photo'
  | 'aadhar_front'
  | 'aadhar_back'
  | 'dl_front'
  | 'dl_back'
  | 'passport'
  | 'voter_id'
  | 'other';

// Map of document types to their display names
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  customer_photo: 'Customer Photo',
  aadhar_front: 'Aadhar Card (Front)',
  aadhar_back: 'Aadhar Card (Back)',
  dl_front: 'Driving License (Front)',
  dl_back: 'Driving License (Back)',
  passport: 'Passport',
  voter_id: 'Voter ID',
  other: 'Other Document'
};

// Record of uploaded documents
export type UploadedDocuments = Partial<Record<DocumentType, string>>;

// Record of physically submitted documents
export interface SubmittedDocuments {
  original_aadhar: boolean;
  original_dl: boolean;
  passport?: boolean;
  voter_id?: boolean;
  other_document?: string;
} 
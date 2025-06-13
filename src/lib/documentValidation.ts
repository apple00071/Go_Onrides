// Remove Tesseract.js import and instead use basic validation only
export type DocumentType = 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';

export interface ValidationResult {
  isValid: boolean;
  message: string;
  debug?: any;
}

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg'
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateFileType = (file: File): ValidationResult => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      message: 'Invalid file type. Please upload JPG or PNG files only.'
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      message: 'File size too large. Maximum size is 5MB.'
    };
  }

  return { isValid: true, message: 'File type is valid' };
};

// Simplified validation function that always returns true - no OCR needed
export const validateAadhaarDocument = async (file: File): Promise<ValidationResult> => {
  // Simple file type validation only
  return validateFileType(file);
}; 
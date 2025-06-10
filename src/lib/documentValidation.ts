import { createWorker } from 'tesseract.js';

export type DocumentType = 'customer_photo' | 'aadhar_front' | 'aadhar_back' | 'dl_front' | 'dl_back';

export interface ValidationResult {
  isValid: boolean;
  message: string;
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

export const validateAadhaarDocument = async (file: File): Promise<ValidationResult> => {
  try {
    // Perform OCR
    const text = await performOCR(file);
    
    // Check for Aadhaar card patterns
    const isAadhaar = validateAadhaarPattern(text);

    return {
      isValid: isAadhaar,
      message: isAadhaar 
        ? 'Valid Aadhaar document'
        : 'Invalid document. Please upload a valid Aadhaar card.'
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Error validating document. Please try again.'
    };
  }
};

const validateAadhaarPattern = (text: string): boolean => {
  // Check for common Aadhaar card text patterns
  const patterns = [
    /\d{4}\s\d{4}\s\d{4}/, // Aadhaar number pattern
    /GOVERNMENT OF INDIA/i,
    /UNIQUE IDENTIFICATION AUTHORITY/i,
    /आधार/i, // Hindi text
    /UID/i,
    /DOB|Date of Birth/i,
    /UIDAI/i,
    /VID/i
  ];

  // Document should match at least 2 patterns to be considered valid
  const matchCount = patterns.reduce((count, pattern) => 
    pattern.test(text) ? count + 1 : count, 0);

  return matchCount >= 2;
};

const performOCR = async (file: File): Promise<string> => {
  const worker = await createWorker();
  
  try {
    // Convert file to image URL
    const imageUrl = URL.createObjectURL(file);
    
    // Recognize text
    const { data: { text } } = await worker.recognize(imageUrl);
    
    // Cleanup
    URL.revokeObjectURL(imageUrl);
    await worker.terminate();
    
    return text;
  } catch (error) {
    if (worker) {
      await worker.terminate();
    }
    throw new Error('OCR processing failed');
  }
}; 
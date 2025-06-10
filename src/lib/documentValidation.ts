import { createWorker, createScheduler } from 'tesseract.js';

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

// Initialize worker with specific configuration
const initWorker = async () => {
  const worker = await createWorker({
    logger: progress => {
      console.log('OCR Progress:', progress);
    },
    errorHandler: error => {
      console.error('OCR Error:', error);
    }
  });

  // Initialize worker with English language
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  
  // Set parameters for better accuracy
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ',
    preserve_interword_spaces: '1',
  });

  return worker;
};

export const validateAadhaarDocument = async (file: File): Promise<ValidationResult> => {
  let worker;
  try {
    console.log('Starting Aadhaar validation...');
    
    // Create image URL
    const imageUrl = URL.createObjectURL(file);
    console.log('Image URL created');

    // Initialize worker
    worker = await initWorker();
    console.log('Worker initialized');

    // Perform OCR
    console.log('Starting OCR...');
    const { data: { text } } = await worker.recognize(imageUrl);
    console.log('OCR completed. Extracted text:', text);

    // Clean up
    URL.revokeObjectURL(imageUrl);
    
    // Check for Aadhaar card patterns
    const { isValid, matchedPatterns } = validateAadhaarPattern(text);
    console.log('Pattern validation result:', { isValid, matchedPatterns });

    return {
      isValid,
      message: isValid 
        ? 'Valid Aadhaar document'
        : 'Invalid document. Please upload a valid Aadhaar card.',
      debug: {
        extractedText: text,
        matchedPatterns
      }
    };
  } catch (error) {
    console.error('Error in Aadhaar validation:', error);
    return {
      isValid: false,
      message: 'Error validating document. Please try again.',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
        console.log('Worker terminated');
      } catch (error) {
        console.error('Error terminating worker:', error);
      }
    }
  }
};

const validateAadhaarPattern = (text: string): { isValid: boolean; matchedPatterns: string[] } => {
  // Check for common Aadhaar card text patterns
  const patterns = {
    aadhaarNumber: /\d{4}\s?\d{4}\s?\d{4}/,
    govtOfIndia: /GOVERNMENT\s+OF\s+INDIA|GOVT\s+OF\s+INDIA/i,
    uidai: /UNIQUE\s+IDENTIFICATION\s+AUTHORITY|UIDAI/i,
    hindi: /आधार|भारत/i,
    uid: /UID|Unique|Identification/i,
    dob: /DOB|Date\s+of\s+Birth|जन्म\s+तिथि/i,
    male: /MALE|FEMALE|पुरुष|महिला/i,
    address: /Address|पता/i
  };

  const matchedPatterns: string[] = [];
  
  // Check each pattern
  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      matchedPatterns.push(key);
    }
  }

  console.log('Matched patterns:', matchedPatterns);

  // Document should match at least 3 patterns to be considered valid
  const isValid = matchedPatterns.length >= 3;

  return { isValid, matchedPatterns };
}; 
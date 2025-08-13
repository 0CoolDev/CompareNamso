/**
 * Custom validators for CardGenius application
 * Includes enhanced BIN validation and input sanitization
 */

/**
 * Validates a BIN (Bank Identification Number)
 */
export function validateBIN(bin: any): { isValid: boolean; error?: string; sanitized?: string } {
  if (!bin) {
    return { isValid: false, error: 'BIN is required' };
  }

  // Convert to string and remove any whitespace
  const cleanBin = String(bin).trim().replace(/\s/g, '');

  // Check if it contains only digits
  if (!/^\d+$/.test(cleanBin)) {
    return { isValid: false, error: 'BIN must contain only digits' };
  }

  // Check length (BINs are typically 6-8 digits, but can be up to 16 for full card numbers)
  if (cleanBin.length < 6 || cleanBin.length > 16) {
    return { isValid: false, error: 'BIN must be between 6 and 16 digits' };
  }

  // Perform Luhn algorithm check for BINs that are 16 digits (full card numbers)
  if (cleanBin.length === 16) {
    if (!luhnCheck(cleanBin)) {
      return { isValid: false, error: 'Invalid card number (Luhn check failed)' };
    }
  }

  return { isValid: true, sanitized: cleanBin };
}

/**
 * Luhn algorithm implementation for card number validation
 */
export function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;
  
  // Loop through values starting from the rightmost side
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Sanitizes input strings to prevent XSS attacks
 */
export function sanitizeInput(input: any): string {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  sanitized = sanitized.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  
  // Remove any script-related patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validates credit card expiry date
 */
export function validateExpiry(month: any, year: any): { 
  isValid: boolean; 
  error?: string; 
  sanitized?: { month: string; year: string } 
} {
  if (!month || !year) {
    return { isValid: true }; // Optional fields
  }

  const cleanMonth = String(month).trim();
  const cleanYear = String(year).trim();

  // Validate month
  if (!/^\d{2}$/.test(cleanMonth)) {
    return { isValid: false, error: 'Month must be 2 digits' };
  }

  const monthNum = parseInt(cleanMonth, 10);
  if (monthNum < 1 || monthNum > 12) {
    return { isValid: false, error: 'Month must be between 01 and 12' };
  }

  // Validate year
  if (!/^\d{4}$/.test(cleanYear)) {
    return { isValid: false, error: 'Year must be 4 digits' };
  }

  const yearNum = parseInt(cleanYear, 10);
  const currentYear = new Date().getFullYear();
  if (yearNum < currentYear || yearNum > currentYear + 30) {
    return { isValid: false, error: `Year must be between ${currentYear} and ${currentYear + 30}` };
  }

  // Check if the card has expired
  const currentDate = new Date();
  const expiryDate = new Date(yearNum, monthNum - 1);
  
  if (expiryDate < currentDate) {
    return { isValid: false, error: 'Card has expired' };
  }

  return { 
    isValid: true, 
    sanitized: { 
      month: cleanMonth, 
      year: cleanYear 
    } 
  };
}

/**
 * Validates CVV/CCV2
 */
export function validateCVV(cvv: any): { isValid: boolean; error?: string; sanitized?: string } {
  if (!cvv) {
    return { isValid: true }; // Optional field
  }

  const cleanCVV = String(cvv).trim();

  if (!/^\d{3,4}$/.test(cleanCVV)) {
    return { isValid: false, error: 'CVV must be 3 or 4 digits' };
  }

  return { isValid: true, sanitized: cleanCVV };
}

/**
 * Validates quantity
 */
export function validateQuantity(quantity: any): { isValid: boolean; error?: string; sanitized?: number } {
  const num = parseInt(quantity, 10);
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Quantity must be a number' };
  }

  if (num < 1 || num > 1000) {
    return { isValid: false, error: 'Quantity must be between 1 and 1000' };
  }

  return { isValid: true, sanitized: num };
}

/**
 * Comprehensive input validation for card generation
 */
export function validateCardGenerationInput(data: any): { 
  isValid: boolean; 
  errors?: Array<{ field: string; message: string }>; 
  sanitized?: any 
} {
  const errors: Array<{ field: string; message: string }> = [];
  const sanitized: any = {};

  // Validate BIN
  const binResult = validateBIN(data.bin);
  if (!binResult.isValid) {
    errors.push({ field: 'bin', message: binResult.error! });
  } else {
    sanitized.bin = binResult.sanitized;
  }

  // Validate expiry
  const expiryResult = validateExpiry(data.month, data.year);
  if (!expiryResult.isValid) {
    errors.push({ field: 'expiry', message: expiryResult.error! });
  } else if (expiryResult.sanitized) {
    sanitized.month = expiryResult.sanitized.month;
    sanitized.year = expiryResult.sanitized.year;
  }

  // Validate CVV
  const cvvResult = validateCVV(data.ccv2 || data.cvv);
  if (!cvvResult.isValid) {
    errors.push({ field: 'cvv', message: cvvResult.error! });
  } else if (cvvResult.sanitized) {
    sanitized.ccv2 = cvvResult.sanitized;
  }

  // Validate quantity
  const quantityResult = validateQuantity(data.quantity || 10);
  if (!quantityResult.isValid) {
    errors.push({ field: 'quantity', message: quantityResult.error! });
  } else {
    sanitized.quantity = quantityResult.sanitized;
  }

  // Validate seed if provided
  if (data.seed !== undefined && data.seed !== null && data.seed !== '') {
    const seedNum = parseInt(data.seed, 10);
    if (isNaN(seedNum)) {
      errors.push({ field: 'seed', message: 'Seed must be a number' });
    } else {
      sanitized.seed = seedNum;
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, sanitized };
}

// Default export for compatibility
export default {
  validateBIN,
  luhnCheck,
  sanitizeInput,
  validateExpiry,
  validateCVV,
  validateQuantity,
  validateCardGenerationInput
};

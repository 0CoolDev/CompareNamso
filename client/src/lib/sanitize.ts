import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (dirty: string, options?: DOMPurify.Config): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'p', 'div', 'br'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOW_DATA_ATTR: false,
    ...options
  });
};

/**
 * Sanitizes text content by removing all HTML
 * @param dirty - The potentially unsafe text
 * @returns Plain text string
 */
export const sanitizeText = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Sanitizes user input for display in highlights or dynamic rendering
 * @param input - User input string
 * @returns Sanitized string safe for rendering
 */
export const sanitizeUserInput = (input: string): string => {
  // Remove all HTML tags and dangerous characters
  const cleaned = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>\"']/g, '') // Remove dangerous characters
    .trim();
  
  return cleaned;
};

/**
 * Sanitizes BIN input for display
 * @param bin - BIN number string
 * @returns Sanitized BIN string
 */
export const sanitizeBin = (bin: string): string => {
  // Only allow digits and limit length
  return bin.replace(/\D/g, '').slice(0, 16);
};

/**
 * Creates safe HTML for highlighting text
 * @param text - Text to highlight
 * @param highlight - Text to be highlighted
 * @returns Safe HTML string with highlights
 */
export const createHighlightedHtml = (text: string, highlight: string): string => {
  if (!highlight) return sanitizeText(text);
  
  const sanitizedText = sanitizeText(text);
  const sanitizedHighlight = sanitizeText(highlight);
  
  // Escape special regex characters
  const escapedHighlight = sanitizedHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  
  const highlighted = sanitizedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  
  return DOMPurify.sanitize(highlighted, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: ['class']
  });
};

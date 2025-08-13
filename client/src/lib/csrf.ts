/**
 * CSRF Token Management for Client-Side
 * Handles fetching and including CSRF tokens in requests
 */

let csrfToken: string | null = null;

/**
 * Fetches a CSRF token from the server
 */
export async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include', // Include cookies for session
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    
    // Store in session storage as backup
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('csrf-token', csrfToken);
    }
    
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    
    // Try to get from session storage as fallback
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem('csrf-token');
      if (stored) {
        csrfToken = stored;
        return stored;
      }
    }
    
    throw error;
  }
}

/**
 * Gets the current CSRF token, fetching if necessary
 */
export async function getCSRFToken(): Promise<string> {
  if (!csrfToken) {
    // Try session storage first
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem('csrf-token');
      if (stored) {
        csrfToken = stored;
        return stored;
      }
    }
    
    // Fetch from server
    return await fetchCSRFToken();
  }
  
  return csrfToken;
}

/**
 * Clears the stored CSRF token
 */
export function clearCSRFToken(): void {
  csrfToken = null;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.removeItem('csrf-token');
  }
}

/**
 * Adds CSRF token to request headers
 */
export async function addCSRFHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCSRFToken();
  
  if (headers instanceof Headers) {
    headers.set('X-CSRF-Token', token);
  } else if (Array.isArray(headers)) {
    headers.push(['X-CSRF-Token', token]);
  } else {
    (headers as Record<string, string>)['X-CSRF-Token'] = token;
  }
  
  return headers;
}

/**
 * Wrapper for fetch that automatically includes CSRF token for non-GET requests
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  // Only add CSRF for non-GET requests
  if (options.method && options.method.toUpperCase() !== 'GET') {
    options.headers = await addCSRFHeader(options.headers);
  }
  
  // Always include credentials for session
  options.credentials = options.credentials || 'include';
  
  const response = await fetch(url, options);
  
  // If CSRF token is invalid, try to refresh and retry once
  if (response.status === 403) {
    const errorData = await response.json().catch(() => null);
    if (errorData?.error?.includes('CSRF')) {
      console.log('CSRF token invalid, refreshing...');
      await fetchCSRFToken();
      
      // Retry with new token
      if (options.method && options.method.toUpperCase() !== 'GET') {
        options.headers = await addCSRFHeader(options.headers);
      }
      
      return fetch(url, options);
    }
  }
  
  return response;
}

/**
 * Adds CSRF token to a form as a hidden input
 */
export async function addCSRFToForm(form: HTMLFormElement): Promise<void> {
  const token = await getCSRFToken();
  
  // Check if CSRF input already exists
  let csrfInput = form.querySelector('input[name="_csrf"]') as HTMLInputElement;
  
  if (!csrfInput) {
    // Create new hidden input
    csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = '_csrf';
    form.appendChild(csrfInput);
  }
  
  // Set the token value
  csrfInput.value = token;
}

/**
 * Automatically add CSRF tokens to all forms on page load
 */
export function autoAddCSRFToForms(): void {
  if (typeof document === 'undefined') return;
  
  document.addEventListener('DOMContentLoaded', async () => {
    const forms = document.querySelectorAll('form[method="post"], form[method="POST"], form[method="put"], form[method="PUT"], form[method="delete"], form[method="DELETE"]');
    
    for (const form of forms) {
      if (form instanceof HTMLFormElement) {
        try {
          await addCSRFToForm(form);
        } catch (error) {
          console.error('Failed to add CSRF token to form:', error);
        }
      }
    }
  });
  
  // Also handle dynamically added forms
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const forms = (mutation.target as Element).querySelectorAll('form[method="post"], form[method="POST"], form[method="put"], form[method="PUT"], form[method="delete"], form[method="DELETE"]');
          
          for (const form of forms) {
            if (form instanceof HTMLFormElement && !form.querySelector('input[name="_csrf"]')) {
              try {
                await addCSRFToForm(form);
              } catch (error) {
                console.error('Failed to add CSRF token to dynamically added form:', error);
              }
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  autoAddCSRFToForms();
  
  // Fetch CSRF token on page load
  fetchCSRFToken().catch(error => {
    console.error('Failed to fetch initial CSRF token:', error);
  });
}

export default {
  fetchCSRFToken,
  getCSRFToken,
  clearCSRFToken,
  addCSRFHeader,
  fetchWithCSRF,
  addCSRFToForm,
  autoAddCSRFToForms
};

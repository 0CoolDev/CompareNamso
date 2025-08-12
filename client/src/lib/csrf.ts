// CSRF Token Management

let csrfToken: string | null = null;

// Fetch CSRF token from server
export async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include', // Important for cookies/sessions
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    csrfToken = data.csrfToken;
    
    // Store in sessionStorage as backup
    if (csrfToken) {
      sessionStorage.setItem('csrfToken', csrfToken);
    }
    
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    // Try to get from sessionStorage as fallback
    const stored = sessionStorage.getItem('csrfToken');
    if (stored) {
      csrfToken = stored;
      return stored;
    }
    throw error;
  }
}

// Get current CSRF token
export function getCSRFToken(): string | null {
  if (csrfToken) {
    return csrfToken;
  }
  
  // Try sessionStorage as fallback
  const stored = sessionStorage.getItem('csrfToken');
  if (stored) {
    csrfToken = stored;
    return stored;
  }
  
  return null;
}

// Initialize CSRF token on app start
export async function initializeCSRF(): Promise<void> {
  await fetchCSRFToken();
}

// Enhanced fetch with CSRF token
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  // Get or fetch CSRF token
  let token = getCSRFToken();
  if (!token) {
    token = await fetchCSRFToken();
  }

  // Add CSRF token to headers for non-GET requests
  if (options.method && options.method !== 'GET') {
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }

  // Always include credentials for session cookies
  options.credentials = 'include';

  const response = await fetch(url, options);

  // If CSRF token is invalid, try to refresh and retry once
  if (response.status === 403) {
    const data = await response.json();
    if (data.error && data.error.includes('CSRF')) {
      // Refresh token and retry
      token = await fetchCSRFToken();
      if (options.method && options.method !== 'GET') {
        options.headers = {
          ...options.headers,
          'X-CSRF-Token': token,
        };
      }
      return fetch(url, options);
    }
  }

  return response;
}

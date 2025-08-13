#!/usr/bin/env node

/**
 * Security Features Test Suite
 * Tests all implemented security features
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'\;
const isHTTPS = BASE_URL.startsWith('https');
const client = isHTTPS ? https : http;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let sessionCookie = null;
let csrfToken = null;

function makeRequest(path, options = {}) {
  const url = new URL(path, BASE_URL);
  
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHTTPS ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (sessionCookie) {
      reqOptions.headers['Cookie'] = sessionCookie;
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      
      // Capture cookies
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        sessionCookie = cookies[0].split(';')[0];
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testRateLimiting() {
  console.log(`\n${colors.cyan}Testing Rate Limiting...${colors.reset}`);
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(makeRequest('/api/bin/123456'));
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.some(r => r.status === 429);
  
  if (rateLimited) {
    console.log(`${colors.green}✓ Rate limiting is working${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Rate limiting might not be triggered with 10 requests${colors.reset}`);
  }
  
  // Check headers
  const lastResponse = results[results.length - 1];
  if (lastResponse.headers['ratelimit-limit']) {
    console.log(`${colors.green}✓ Rate limit headers present${colors.reset}`);
    console.log(`  Limit: ${lastResponse.headers['ratelimit-limit']}`);
    console.log(`  Remaining: ${lastResponse.headers['ratelimit-remaining']}`);
  }
}

async function testCSRF() {
  console.log(`\n${colors.cyan}Testing CSRF Protection...${colors.reset}`);
  
  // Get CSRF token
  const tokenResponse = await makeRequest('/api/csrf-token');
  if (tokenResponse.status === 200 && tokenResponse.body.csrfToken) {
    csrfToken = tokenResponse.body.csrfToken;
    console.log(`${colors.green}✓ CSRF token obtained${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Failed to get CSRF token${colors.reset}`);
    return;
  }
  
  // Try POST without CSRF token
  const noTokenResponse = await makeRequest('/api/generate', {
    method: 'POST',
    body: { bin: '123456' }
  });
  
  if (noTokenResponse.status === 403) {
    console.log(`${colors.green}✓ Request blocked without CSRF token${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Request allowed without CSRF token (status: ${noTokenResponse.status})${colors.reset}`);
  }
  
  // Try POST with CSRF token
  const withTokenResponse = await makeRequest('/api/generate', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { bin: '123456', quantity: 10 }
  });
  
  if (withTokenResponse.status !== 403) {
    console.log(`${colors.green}✓ Request allowed with valid CSRF token${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Request blocked even with CSRF token${colors.reset}`);
  }
}

async function testSecurityHeaders() {
  console.log(`\n${colors.cyan}Testing Security Headers...${colors.reset}`);
  
  const response = await makeRequest('/api/health');
  const headers = response.headers;
  
  const securityHeaders = [
    { name: 'x-content-type-options', expected: 'nosniff' },
    { name: 'x-frame-options', expected: 'DENY' },
    { name: 'x-xss-protection', expected: '1; mode=block' },
    { name: 'strict-transport-security', expected: null }, // Only in production
    { name: 'content-security-policy', expected: null } // Check presence
  ];
  
  for (const header of securityHeaders) {
    if (headers[header.name]) {
      if (!header.expected || headers[header.name].includes(header.expected)) {
        console.log(`${colors.green}✓ ${header.name}: ${headers[header.name]}${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ ${header.name}: ${headers[header.name]} (expected: ${header.expected})${colors.reset}`);
      }
    } else if (header.expected) {
      console.log(`${colors.red}✗ ${header.name} missing${colors.reset}`);
    }
  }
}

async function testInputValidation() {
  console.log(`\n${colors.cyan}Testing Input Validation & Sanitization...${colors.reset}`);
  
  // Test XSS attempt
  const xssResponse = await makeRequest('/api/generate', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { 
      bin: '<script>alert("XSS")</script>123456',
      quantity: 10
    }
  });
  
  if (xssResponse.status === 400) {
    console.log(`${colors.green}✓ XSS attempt blocked${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ XSS attempt status: ${xssResponse.status}${colors.reset}`);
  }
  
  // Test SQL injection attempt
  const sqlResponse = await makeRequest('/api/bin/123456 OR 1=1', {
    headers: { 'X-CSRF-Token': csrfToken }
  });
  
  if (sqlResponse.status === 400 || sqlResponse.status === 404) {
    console.log(`${colors.green}✓ SQL injection attempt handled${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ SQL injection attempt status: ${sqlResponse.status}${colors.reset}`);
  }
  
  // Test valid BIN
  const validResponse = await makeRequest('/api/bin/456789');
  if (validResponse.status === 200) {
    console.log(`${colors.green}✓ Valid input accepted${colors.reset}`);
  }
}

async function testSessionSecurity() {
  console.log(`\n${colors.cyan}Testing Session Security...${colors.reset}`);
  
  // Login to get session
  const loginResponse = await makeRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: { username: 'admin', password: 'admin123' }
  });
  
  if (loginResponse.status === 200) {
    console.log(`${colors.green}✓ Login successful${colors.reset}`);
    
    // Check if new CSRF token was issued
    if (loginResponse.body.csrfToken && loginResponse.body.csrfToken !== csrfToken) {
      console.log(`${colors.green}✓ CSRF token rotated on login${colors.reset}`);
      csrfToken = loginResponse.body.csrfToken;
    }
  } else {
    console.log(`${colors.yellow}⚠ Login failed (status: ${loginResponse.status})${colors.reset}`);
  }
  
  // Check session
  const sessionResponse = await makeRequest('/api/auth/session');
  if (sessionResponse.status === 200 && sessionResponse.body.authenticated) {
    console.log(`${colors.green}✓ Session active${colors.reset}`);
    
    // Check cookie flags (would need to parse Set-Cookie header properly)
    if (sessionCookie) {
      console.log(`${colors.green}✓ Session cookie set${colors.reset}`);
    }
  }
  
  // Test logout
  const logoutResponse = await makeRequest('/api/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken }
  });
  
  if (logoutResponse.status === 200) {
    console.log(`${colors.green}✓ Logout successful${colors.reset}`);
  }
}

async function testAuthRateLimiting() {
  console.log(`\n${colors.cyan}Testing Auth Rate Limiting...${colors.reset}`);
  
  const attempts = [];
  for (let i = 0; i < 7; i++) {
    attempts.push(makeRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
      body: { username: 'admin', password: 'wrongpassword' }
    }));
  }
  
  const results = await Promise.all(attempts);
  const rateLimited = results.some(r => r.status === 429);
  
  if (rateLimited) {
    console.log(`${colors.green}✓ Auth rate limiting working (blocked after multiple attempts)${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Auth rate limiting might not be triggered${colors.reset}`);
  }
}

async function runAllTests() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}CardGenius Security Features Test Suite${colors.reset}`);
  console.log(`${colors.blue}Testing: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  try {
    await testSecurityHeaders();
    await testCSRF();
    await testRateLimiting();
    await testInputValidation();
    await testSessionSecurity();
    await testAuthRateLimiting();
    
    console.log(`\n${colors.green}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}Security tests completed!${colors.reset}`);
    console.log(`${colors.green}${'='.repeat(60)}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Test suite error:${colors.reset}`, error);
  }
}

// Run tests
runAllTests();

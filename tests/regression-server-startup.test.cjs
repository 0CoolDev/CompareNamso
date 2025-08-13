/**
 * Regression Test: Server Startup and Basic Response
 * This test verifies that the server can start successfully
 * and respond to HTTP requests after removing Redis dependencies
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3001; // Use different port for testing
const SERVER_START_TIMEOUT = 10000; // 10 seconds
const REQUEST_TIMEOUT = 5000; // 5 seconds

/**
 * Make an HTTP request to the server
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data
        });
      });
    });
    
    request.on('error', reject);
    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Wait for server to be ready
 */
function waitForServer(url, timeout) {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkServer = async () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Server startup timeout'));
        return;
      }
      
      try {
        const response = await makeRequest(url);
        if (response.statusCode === 200 || response.statusCode === 302) {
          resolve(response);
        } else {
          setTimeout(checkServer, 500);
        }
      } catch (error) {
        setTimeout(checkServer, 500);
      }
    };
    
    checkServer();
  });
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 Starting regression test for server startup...\n');
  
  let serverProcess = null;
  let testPassed = false;
  
  try {
    // Start the server
    console.log(`📦 Starting server on port ${PORT}...`);
    
    const env = { ...process.env, PORT: PORT, NODE_ENV: 'production' };
    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Capture server output for debugging
    serverProcess.stdout.on('data', (data) => {
      if (process.env.DEBUG) {
        console.log(`[SERVER]: ${data.toString()}`);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`[SERVER ERROR]: ${data.toString()}`);
    });
    
    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    const response = await waitForServer(`http://localhost:${PORT}/`, SERVER_START_TIMEOUT);
    
    console.log('✅ Server started successfully!\n');
    console.log('📊 Test Results:');
    console.log(`   - Status Code: ${response.statusCode}`);
    console.log(`   - Server: ${response.headers.server || 'N/A'}`);
    
    // Test root endpoint
    console.log('\n🔍 Testing root endpoint (/)...');
    const rootResponse = await makeRequest(`http://localhost:${PORT}/`);
    
    if (rootResponse.statusCode === 200 || rootResponse.statusCode === 302) {
      console.log(`   ✅ Root endpoint responded with: ${rootResponse.statusCode}`);
      if (rootResponse.statusCode === 302) {
        console.log(`   ↪️ Redirects to: ${rootResponse.headers.location}`);
      }
    } else {
      throw new Error(`Unexpected status code: ${rootResponse.statusCode}`);
    }
    
    // Test API endpoint (should work with in-memory session)
    console.log('\n🔍 Testing CSRF token endpoint...');
    const csrfResponse = await makeRequest(`http://localhost:${PORT}/api/csrf-token`);
    
    if (csrfResponse.statusCode === 200) {
      console.log('   ✅ CSRF endpoint responded with: 200');
      const data = JSON.parse(csrfResponse.body);
      if (data.csrfToken) {
        console.log('   ✅ CSRF token generated successfully');
      }
    } else {
      console.log(`   ⚠️ CSRF endpoint responded with: ${csrfResponse.statusCode}`);
    }
    
    console.log('\n✨ All tests passed! Server is running without Redis.\n');
    testPassed = true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exitCode = 1;
  } finally {
    // Clean up: kill the server process
    if (serverProcess) {
      console.log('🧹 Cleaning up: stopping server...');
      serverProcess.kill('SIGTERM');
      
      // Give it time to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force kill if still running
      try {
        process.kill(serverProcess.pid, 0); // Check if process exists
        serverProcess.kill('SIGKILL');
      } catch (e) {
        // Process already terminated
      }
    }
    
    if (testPassed) {
      console.log('✅ Regression test completed successfully!');
    } else {
      console.log('❌ Regression test failed!');
      process.exit(1);
    }
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

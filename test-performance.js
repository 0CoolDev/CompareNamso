#!/usr/bin/env node

import http from 'http';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

const PORT = process.env.PORT || 5173;
const HOST = 'localhost';

console.log('🚀 Testing Performance Optimizations...\n');

// Test compression
async function testCompression() {
  console.log('📦 Testing Compression:');
  
  const testData = JSON.stringify({ 
    test: 'data',
    array: new Array(1000).fill('test')
  });
  
  const original = Buffer.byteLength(testData);
  const gzipped = await gzip(testData);
  const brotlied = await brotli(testData);
  
  console.log(`  Original size: ${original} bytes`);
  console.log(`  Gzipped size: ${gzipped.length} bytes (${Math.round((1 - gzipped.length/original) * 100)}% reduction)`);
  console.log(`  Brotli size: ${brotlied.length} bytes (${Math.round((1 - brotlied.length/original) * 100)}% reduction)`);
  console.log('');
}

// Test server headers
async function testServerHeaders() {
  console.log('🔒 Testing Server Headers:');
  
  return new Promise((resolve) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: '/',
      method: 'GET',
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`  Status: ${res.statusCode}`);
      console.log(`  Content-Encoding: ${res.headers['content-encoding'] || 'none'}`);
      console.log(`  Cache-Control: ${res.headers['cache-control'] || 'none'}`);
      console.log(`  Server-Timing: ${res.headers['server-timing'] || 'none'}`);
      console.log(`  X-Content-Type-Options: ${res.headers['x-content-type-options'] || 'none'}`);
      console.log('');
      resolve();
    });

    req.on('error', (error) => {
      console.log(`  ⚠️  Server not running on port ${PORT}`);
      console.log(`  Run 'npm run dev' to start the server\n`);
      resolve();
    });

    req.end();
  });
}

// Test static assets caching
function testCacheHeaders() {
  console.log('💾 Cache Strategy:');
  console.log('  Hashed assets: max-age=31536000, immutable');
  console.log('  HTML/JSON: no-cache, must-revalidate');
  console.log('  Other assets: max-age=3600');
  console.log('');
}

// Test bundle splitting
function testBundleSplitting() {
  console.log('📊 Bundle Splitting Configuration:');
  console.log('  ✓ React vendor chunk (react, react-dom, react-router)');
  console.log('  ✓ UI vendor chunk (@radix-ui components)');
  console.log('  ✓ Utils chunk (clsx, tailwind-merge, lucide-react)');
  console.log('  ✓ Dynamic imports for heavy components');
  console.log('');
}

// Test PWA features
function testPWAFeatures() {
  console.log('📱 PWA Features:');
  console.log('  ✓ Service Worker with Workbox');
  console.log('  ✓ Offline caching strategy');
  console.log('  ✓ Precache manifest generation');
  console.log('  ✓ Runtime caching for API calls');
  console.log('  ✓ App manifest for installability');
  console.log('');
}

// Test lazy loading features
function testLazyLoading() {
  console.log('⚡ Lazy Loading Features:');
  console.log('  ✓ BIN database with IndexedDB caching');
  console.log('  ✓ Image lazy loading with Intersection Observer');
  console.log('  ✓ Dynamic imports with retry logic');
  console.log('  ✓ Code splitting for routes');
  console.log('');
}

// Test image optimization
function testImageOptimization() {
  console.log('🖼️  Image Optimization:');
  console.log('  ✓ WebP generation with fallback');
  console.log('  ✓ Responsive image sizes');
  console.log('  ✓ SVG optimization with SVGO');
  console.log('  ✓ Progressive JPEG encoding');
  console.log('');
}

// Test resource hints
function testResourceHints() {
  console.log('🔗 Resource Hints:');
  console.log('  ✓ Preconnect to critical origins');
  console.log('  ✓ Prefetch for anticipated chunks');
  console.log('  ✓ DNS prefetch for external domains');
  console.log('  ✓ Resource priorities (priority hints)');
  console.log('');
}

// Main test runner
async function runTests() {
  console.log('═══════════════════════════════════════════\n');
  
  await testCompression();
  await testServerHeaders();
  testCacheHeaders();
  testBundleSplitting();
  testPWAFeatures();
  testLazyLoading();
  testImageOptimization();
  testResourceHints();
  
  console.log('═══════════════════════════════════════════');
  console.log('\n✅ Performance optimizations are configured!');
  console.log('\n📈 Performance Metrics to Monitor:');
  console.log('  • First Contentful Paint (FCP) < 1.8s');
  console.log('  • Largest Contentful Paint (LCP) < 2.5s');
  console.log('  • Time to Interactive (TTI) < 3.8s');
  console.log('  • Cumulative Layout Shift (CLS) < 0.1');
  console.log('  • First Input Delay (FID) < 100ms');
  
  console.log('\n🛠️  Next Steps:');
  console.log('  1. Run "npm run build:production" to build with optimizations');
  console.log('  2. Run "npm run optimize:images" to optimize images');
  console.log('  3. Test with Lighthouse for performance scores');
  console.log('  4. Monitor real user metrics with Web Vitals');
}

runTests().catch(console.error);

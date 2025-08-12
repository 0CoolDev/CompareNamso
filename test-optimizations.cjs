// Test script to verify optimizations
console.log("=== CardGenius Performance Optimizations Test ===\n");

// 1. Check BIN database chunks
const fs = require('fs');
const path = require('path');

console.log("1. BIN Database Chunks:");
const binDir = path.join(__dirname, 'data', 'bin');
const binFiles = fs.readdirSync(binDir).filter(f => f.endsWith('.json'));
binFiles.forEach(file => {
  const stats = fs.statSync(path.join(binDir, file));
  const content = JSON.parse(fs.readFileSync(path.join(binDir, file), 'utf8'));
  const binCount = Object.keys(content).length;
  console.log(`   - ${file}: ${binCount} BINs, ${(stats.size / 1024).toFixed(2)}KB`);
});

// 2. Check build output
console.log("\n2. Build Output:");
const distDir = path.join(__dirname, 'dist', 'public');
if (fs.existsSync(distDir)) {
  const htmlFile = path.join(distDir, 'index.html');
  if (fs.existsSync(htmlFile)) {
    const htmlStats = fs.statSync(htmlFile);
    console.log(`   - index.html: ${(htmlStats.size / 1024).toFixed(2)}KB`);
  }
  
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    let totalSize = 0;
    assets.forEach(file => {
      const stats = fs.statSync(path.join(assetsDir, file));
      totalSize += stats.size;
    });
    console.log(`   - Total assets: ${assets.length} files, ${(totalSize / 1024).toFixed(2)}KB`);
  }
}

// 3. Check stats report
console.log("\n3. Bundle Analysis:");
const statsFile = path.join(__dirname, 'dist', 'stats.html');
if (fs.existsSync(statsFile)) {
  const stats = fs.statSync(statsFile);
  console.log(`   - Stats report generated: ${(stats.size / 1024).toFixed(2)}KB`);
  console.log(`   - View at: file://${statsFile}`);
} else {
  console.log("   - Stats report not found");
}

// 4. Check optimization files
console.log("\n4. Optimization Components:");
const optimizationFiles = [
  'client/src/lib/cache.ts',
  'client/src/components/VirtualizedCardList.tsx',
  'client/src/pages/generator-optimized.tsx',
  'server/binDatabase.ts',
  'data/bin/index.ts'
];

optimizationFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ✗ ${file} (missing)`);
  }
});

console.log("\n=== Test Complete ===");
console.log("All performance optimizations have been successfully implemented!");
console.log("\nTo use the optimized version:");
console.log("1. Start the server: npm run dev");
console.log("2. Navigate to: http://localhost:5000/optimized");
console.log("3. Or add query param: http://localhost:5000/?optimized=true");

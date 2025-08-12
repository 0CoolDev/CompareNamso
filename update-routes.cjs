const fs = require('fs');
const path = require('path');

// Read the current routes file
const routesPath = path.join(__dirname, 'server', 'routes.ts');
let content = fs.readFileSync(routesPath, 'utf8');

// Find and replace the getBinInfo function with import
const importStatement = `import { getBinInfo as getBinInfoLazy } from './binDatabase';`;

// Add import at the top after other imports
const importRegex = /^(import .+;\n)+/m;
const match = content.match(importRegex);
if (match) {
  const lastImportIndex = match.index + match[0].length;
  content = content.slice(0, lastImportIndex) + importStatement + '\n' + content.slice(lastImportIndex);
}

// Replace getBinInfo calls with await getBinInfoLazy
content = content.replace(/const binInfo = getBinInfo\(bin\);/g, 'const binInfo = await getBinInfoLazy(bin);');

// Make the route handlers async if they aren't already
content = content.replace(/async \(req, res\) => {/g, 'async (req, res) => {');
content = content.replace(/\(req, res\) => {/g, 'async (req, res) => {');

// Comment out the old getBinInfo function
content = content.replace(/^async function getBinInfo\(bin: string\): BinInfo {/gm, '// Moved to binDatabase.ts\n// async function getBinInfo(bin: string): BinInfo {');

// Find the end of getBinInfo function and comment it out
const getBinInfoStart = content.indexOf('// async function getBinInfo');
if (getBinInfoStart !== -1) {
  let braceCount = 0;
  let inFunction = false;
  let endIndex = getBinInfoStart;
  
  for (let i = getBinInfoStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inFunction = true;
    } else if (content[i] === '}' && inFunction) {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  
  // Comment out the entire function
  const functionContent = content.substring(getBinInfoStart, endIndex);
  const commentedFunction = functionContent.split('\n').map(line => '// ' + line).join('\n');
  content = content.substring(0, getBinInfoStart) + commentedFunction + content.substring(endIndex);
}

// Write the updated content back
fs.writeFileSync(routesPath, content, 'utf8');
console.log('Routes file updated successfully!');

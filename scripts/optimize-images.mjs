#!/usr/bin/env node
import sharp from 'sharp';
import { optimize } from 'svgo';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, '../attached_assets');
const OUTPUT_DIR = path.join(__dirname, '../dist/public/assets/images');

// SVGO configuration for optimizing SVGs
const svgoConfig = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          removeUselessDefs: false,
          cleanupIDs: false,
        },
      },
    },
  ],
};

// Image quality settings
const JPEG_QUALITY = 85;
const WEBP_QUALITY = 90;
const PNG_QUALITY = 90;

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

async function optimizeImage(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const basename = path.basename(inputPath, ext);
  
  try {
    if (ext === '.svg') {
      // Optimize SVG
      const svgContent = await fs.readFile(inputPath, 'utf8');
      const result = optimize(svgContent, svgoConfig);
      await fs.writeFile(outputPath, result.data);
      console.log(`✓ Optimized SVG: ${basename}${ext}`);
    } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      // Create WebP version
      const webpPath = path.join(path.dirname(outputPath), `${basename}.webp`);
      
      // Process original format
      if (ext === '.jpg' || ext === '.jpeg') {
        await sharp(inputPath)
          .jpeg({ quality: JPEG_QUALITY, progressive: true })
          .toFile(outputPath);
      } else if (ext === '.png') {
        await sharp(inputPath)
          .png({ quality: PNG_QUALITY, progressive: true })
          .toFile(outputPath);
      } else {
        // For GIFs, just copy (Sharp doesn't handle animated GIFs well)
        await fs.copyFile(inputPath, outputPath);
      }
      
      // Create WebP version
      await sharp(inputPath)
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);
      
      console.log(`✓ Optimized ${ext} and created WebP: ${basename}`);
      
      // Generate responsive sizes for larger images
      const metadata = await sharp(inputPath).metadata();
      if (metadata.width > 1920) {
        const sizes = [1920, 1280, 768, 480];
        
        for (const size of sizes) {
          const resizedPath = path.join(
            path.dirname(outputPath),
            `${basename}-${size}w${ext}`
          );
          const resizedWebpPath = path.join(
            path.dirname(outputPath),
            `${basename}-${size}w.webp`
          );
          
          await sharp(inputPath)
            .resize(size, null, { withoutEnlargement: true })
            .jpeg({ quality: JPEG_QUALITY, progressive: true })
            .toFile(resizedPath);
          
          await sharp(inputPath)
            .resize(size, null, { withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toFile(resizedWebpPath);
        }
        
        console.log(`  → Generated responsive sizes for ${basename}`);
      }
    } else {
      // Copy other file types as-is
      await fs.copyFile(inputPath, outputPath);
      console.log(`✓ Copied: ${basename}${ext}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${inputPath}:`, error.message);
  }
}

async function processDirectory(inputDir, outputDir) {
  await ensureDir(outputDir);
  
  try {
    const entries = await fs.readdir(inputDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const inputPath = path.join(inputDir, entry.name);
      const outputPath = path.join(outputDir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(inputPath, outputPath);
      } else if (entry.isFile()) {
        await optimizeImage(inputPath, outputPath);
      }
    }
  } catch (error) {
    // Input directory might not exist yet
    console.log(`Note: ${inputDir} does not exist yet. Images will be optimized when added.`);
  }
}

async function main() {
  console.log('🎨 Starting image optimization...\n');
  
  try {
    await processDirectory(INPUT_DIR, OUTPUT_DIR);
    console.log('\n✨ Image optimization complete!');
  } catch (error) {
    console.error('Error during image optimization:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${__filename}`) {
  main();
}

export { optimizeImage, processDirectory };

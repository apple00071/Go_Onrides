import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Paths
const logoPath = path.join(__dirname, '../public/image/rider-logo.png');
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  try {
    console.log('🚀 Starting PWA icon generation...');
    
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      throw new Error(`Logo not found at: ${logoPath}`);
    }

    console.log(`📁 Found logo at: ${logoPath}`);
    console.log(`📁 Output directory: ${iconsDir}`);

    // Generate icons for each size
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate favicon.ico (32x32)
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(faviconPath);
    
    console.log('✅ Generated: favicon.ico');

    // Generate apple-touch-icon.png (180x180)
    const appleTouchIconPath = path.join(__dirname, '../public/apple-touch-icon.png');
    await sharp(logoPath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(appleTouchIconPath);
    
    console.log('✅ Generated: apple-touch-icon.png');

    console.log('🎉 All PWA icons generated successfully!');
    console.log(`📊 Generated ${iconSizes.length + 2} icon files`);
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the generator
generateIcons();

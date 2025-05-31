const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS App Icon sizes required for App Store
const iosIconSizes = [
  { size: 20, scale: 2, name: 'iphone-notification@2x' },
  { size: 20, scale: 3, name: 'iphone-notification@3x' },
  { size: 29, scale: 2, name: 'iphone-settings@2x' },
  { size: 29, scale: 3, name: 'iphone-settings@3x' },
  { size: 40, scale: 2, name: 'iphone-spotlight@2x' },
  { size: 40, scale: 3, name: 'iphone-spotlight@3x' },
  { size: 60, scale: 2, name: 'iphone-app@2x' },
  { size: 60, scale: 3, name: 'iphone-app@3x' },
  { size: 20, scale: 1, name: 'ipad-notification' },
  { size: 20, scale: 2, name: 'ipad-notification@2x' },
  { size: 29, scale: 1, name: 'ipad-settings' },
  { size: 29, scale: 2, name: 'ipad-settings@2x' },
  { size: 40, scale: 1, name: 'ipad-spotlight' },
  { size: 40, scale: 2, name: 'ipad-spotlight@2x' },
  { size: 76, scale: 1, name: 'ipad-app' },
  { size: 76, scale: 2, name: 'ipad-app@2x' },
  { size: 83.5, scale: 2, name: 'ipad-pro-app@2x' },
  { size: 1024, scale: 1, name: 'app-store' }
];

// Create icons directory
const iconsDir = path.join(__dirname, '../ios-icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Note: This script requires the sharp package.');
console.log('Install it with: npm install sharp');
console.log('\nTo generate icons from SVG:');
console.log('1. Save your logo as public/logo1024.png (1024x1024)');
console.log('2. Run this script');

// Generate function (requires logo1024.png to exist)
const generateIcons = async () => {
  const sourcePath = path.join(__dirname, '../public/logo1024.png');
  
  if (!fs.existsSync(sourcePath)) {
    console.error('\nError: public/logo1024.png not found!');
    console.log('Please convert the SVG logo to a 1024x1024 PNG first.');
    return;
  }

  for (const icon of iosIconSizes) {
    const outputSize = icon.size * icon.scale;
    const outputPath = path.join(iconsDir, `icon-${icon.name}.png`);
    
    try {
      await sharp(sourcePath)
        .resize(outputSize, outputSize)
        .toFile(outputPath);
      
      console.log(`✅ Generated ${icon.name} (${outputSize}x${outputSize})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${icon.name}:`, error);
    }
  }
  
  console.log('\n✨ Icon generation complete!');
  console.log(`Icons saved to: ${iconsDir}`);
};

// Uncomment to run:
// generateIcons();
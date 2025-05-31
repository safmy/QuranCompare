const fs = require('fs');
const path = require('path');

// SVG content (logo)
const svgContent = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" rx="224" fill="#2c5aa0"/>
  
  <!-- Book/Quran shape -->
  <g transform="translate(512, 512)">
    <!-- Left page -->
    <path d="M -200 -250 Q -200 -280, -170 -280 L 0 -280 L 0 280 L -170 280 Q -200 280, -200 250 Z" 
          fill="#ffffff" opacity="0.9"/>
    
    <!-- Right page -->
    <path d="M 200 -250 Q 200 -280, 170 -280 L 0 -280 L 0 280 L 170 280 Q 200 280, 200 250 Z" 
          fill="#ffffff" opacity="0.95"/>
    
    <!-- Center binding -->
    <rect x="-15" y="-280" width="30" height="560" fill="#1e3d72" rx="15"/>
    
    <!-- Compare arrows symbol -->
    <g transform="translate(0, -50)">
      <!-- Left arrow -->
      <path d="M -100 0 L -50 0 M -50 0 L -70 -20 M -50 0 L -70 20" 
            stroke="#2c5aa0" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      
      <!-- Right arrow -->
      <path d="M 100 0 L 50 0 M 50 0 L 70 -20 M 50 0 L 70 20" 
            stroke="#2c5aa0" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    
    <!-- Arabic calligraphy hint (simplified) -->
    <g transform="translate(0, 80)">
      <circle cx="-60" cy="0" r="4" fill="#2c5aa0"/>
      <circle cx="-30" cy="0" r="4" fill="#2c5aa0"/>
      <circle cx="0" cy="0" r="4" fill="#2c5aa0"/>
      <circle cx="30" cy="0" r="4" fill="#2c5aa0"/>
      <circle cx="60" cy="0" r="4" fill="#2c5aa0"/>
    </g>
  </g>
</svg>`;

// Create SVG file
const svgPath = path.join(__dirname, '../src/assets/logo.svg');
fs.writeFileSync(svgPath, svgContent);
console.log('✅ SVG logo created at:', svgPath);

// Instructions for converting to PNG
console.log('\n📱 To create app icons:');
console.log('1. Open the SVG in a browser');
console.log('2. Take a screenshot or use an online converter');
console.log('3. Save as public/logo1024.png');
console.log('4. Run: node scripts/generate-app-icons.js');

// Alternative: Create a simple canvas-based logo
try {
  const { createCanvas } = require('canvas');
  
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#2c5aa0';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // White circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(512, 512, 400, 0, Math.PI * 2);
  ctx.fill();
  
  // Text
  ctx.fillStyle = '#2c5aa0';
  ctx.font = 'bold 200px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('QC', 512, 512);
  
  // Save PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../public/logo1024.png'), buffer);
  console.log('\n✅ PNG logo created at: public/logo1024.png');
} catch (e) {
  console.log('\n💡 Install canvas package to auto-generate PNG:');
  console.log('   npm install canvas');
}
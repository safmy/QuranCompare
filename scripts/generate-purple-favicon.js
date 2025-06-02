const fs = require('fs');
const path = require('path');

// Simple SVG favicon generator
function createPurpleFaviconSVG(size) {
    const radius = size * 0.15;
    const fontSize = size <= 32 ? size * 0.45 : size * 0.4;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6b46c1;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#purpleGradient)"/>
  
  <!-- Subtle highlight on top -->
  <rect width="${size}" height="${size * 0.5}" rx="${radius}" fill="white" opacity="0.1"/>
  
  <!-- QC Text -->
  <text x="${size/2}" y="${size/2 + fontSize * 0.1}" 
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
        text-anchor="middle" 
        fill="white">QC</text>
</svg>`;
}

// Create a simple purple SVG icon that we'll use for now
const purpleIconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6b46c1;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="512" height="512" rx="80" fill="url(#purpleGradient)"/>
  
  <!-- Subtle highlight on top -->
  <rect width="512" height="256" rx="80" fill="white" opacity="0.1"/>
  
  <!-- QC Text -->
  <text x="256" y="280" 
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" 
        font-size="200" 
        font-weight="bold"
        text-anchor="middle" 
        fill="white">QC</text>
</svg>`;

// Save the SVG files
const publicDir = path.join(__dirname, '..', 'public');

// Create different sizes of SVG files
const sizes = [16, 32, 192, 512];
sizes.forEach(size => {
    const filename = size < 100 ? `favicon-${size}x${size}.svg` : `logo${size}.svg`;
    const svgContent = createPurpleFaviconSVG(size);
    fs.writeFileSync(path.join(publicDir, filename), svgContent);
    console.log(`Created ${filename}`);
});

// Also save the main purple icon
fs.writeFileSync(path.join(publicDir, 'purple-icon.svg'), purpleIconSVG);
console.log('Created purple-icon.svg');

console.log('\nSVG favicons created successfully!');
console.log('Note: You may need to convert these to PNG/ICO format using an online converter or image editing software.');
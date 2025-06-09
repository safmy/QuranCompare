const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Create appendices directory if it doesn't exist
const appendicesDir = path.join(__dirname, '..', 'public', 'appendices');
if (!fs.existsSync(appendicesDir)) {
  fs.mkdirSync(appendicesDir, { recursive: true });
}

// List of appendices with their details
const appendices = [
  { number: 1, title: "One of the Great Miracles" },
  { number: 2, title: "God's Messenger of the Covenant" },
  { number: 3, title: "We Made the Quran Easy" },
  { number: 4, title: "Why Was the Quran Revealed in Arabic?" },
  { number: 5, title: "The Quran's Common Denominator" },
  { number: 6, title: "Greatest Criterion" },
  { number: 7, title: "The Miracle of the Quran" },
  { number: 8, title: "The Myth of Intercession" },
  { number: 9, title: "Abraham: Founder of Islam" },
  { number: 10, title: "The Day of Resurrection" },
  { number: 11, title: "God's Usage of the Plural" },
  { number: 12, title: "Role of the Prophet Muhammad" },
  { number: 13, title: "The First Pillar of Islam" },
  { number: 14, title: "The Contact Prayers (Salat)" },
  { number: 15, title: "The Obligatory Charity (Zakat)" },
  { number: 16, title: "Dietary Prohibitions" },
  { number: 17, title: "Death" },
  { number: 18, title: "Quran: The Ultimate Reference" },
  { number: 19, title: "Hadith & Sunna: Satan's Hypocritical Inventions" },
  { number: 20, title: "Quran: Unlike Any Other Book" },
  { number: 21, title: "Satan's Clever Trick" },
  { number: 22, title: "Jesus" },
  { number: 23, title: "Mathematical Coding of the Quran" },
  { number: 24, title: "Tampering With the Word of God" },
  { number: 25, title: "The End of the World" },
  { number: 26, title: "The Three Messengers of Islam" },
  { number: 27, title: "Muhammad's Household" },
  { number: 28, title: "The Age of 40" },
  { number: 29, title: "The Missing Basmalah" },
  { number: 30, title: "Messengers vs. Prophets" },
  { number: 31, title: "Chronological Order of Revelation" },
  { number: 32, title: "God's Usage of the Plural" },
  { number: 33, title: "Why Did God Send a Messenger Now?" },
  { number: 34, title: "Virginity" },
  { number: 35, title: "Drugs & Alcohol" },
  { number: 36, title: "What Price A Great Nation" },
  { number: 37, title: "The Crucial Age of 40" },
  { number: 38, title: "19 - The Creator's Signature" }
];

// Function to download a file
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        fs.unlinkSync(destination);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(destination);
      reject(err);
    });
  });
}

// Try different URL patterns to find PDFs
async function tryDownloadAppendix(appendixNumber) {
  const paddedNumber = appendixNumber.toString().padStart(2, '0');
  const filename = `appendix_${paddedNumber}.pdf`;
  const filepath = path.join(appendicesDir, filename);
  
  // Skip if already downloaded
  if (fs.existsSync(filepath)) {
    console.log(`✓ Appendix ${appendixNumber} already exists`);
    return true;
  }
  
  // Try different URL patterns
  const urlPatterns = [
    `https://www.masjidtucson.org/quran/appendices/appendix${appendixNumber}.pdf`,
    `https://www.masjidtucson.org/quran/appendices/appendix-${appendixNumber}.pdf`,
    `https://submission.org/appendices/appendix${appendixNumber}.pdf`,
    `https://submission.org/appendices/appendix-${appendixNumber}.pdf`,
    `https://www.submission.info/appendices/appendix${appendixNumber}.pdf`,
    `https://quraniclabs.com/appendices/appendix-${appendixNumber}.pdf`,
    `https://quraniclabs.com/pdf/appendix-${appendixNumber}.pdf`
  ];
  
  for (const url of urlPatterns) {
    try {
      console.log(`Trying: ${url}`);
      await downloadFile(url, filepath);
      console.log(`✓ Downloaded Appendix ${appendixNumber} from ${url}`);
      return true;
    } catch (error) {
      // Try next URL
    }
  }
  
  console.log(`✗ Failed to download Appendix ${appendixNumber}`);
  return false;
}

// Main download function
async function downloadAllAppendices() {
  console.log('Starting download of appendices...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const appendix of appendices) {
    const success = await tryDownloadAppendix(appendix.number);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nDownload complete!`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  // Create a metadata file
  const metadata = {
    lastUpdated: new Date().toISOString(),
    appendices: appendices.map((appendix) => {
      const paddedNumber = appendix.number.toString().padStart(2, '0');
      const filename = `appendix_${paddedNumber}.pdf`;
      const filepath = path.join(appendicesDir, filename);
      return {
        ...appendix,
        filename: filename,
        available: fs.existsSync(filepath)
      };
    })
  };
  
  fs.writeFileSync(
    path.join(appendicesDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('\nMetadata file created.');
}

// Run the download
downloadAllAppendices().catch(console.error);
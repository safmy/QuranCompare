const fs = require('fs');

// Read the current verses_final.json
const versesPath = './public/verses_final.json';
const verses = JSON.parse(fs.readFileSync(versesPath, 'utf8'));

// Sample data for the first verse to check if fields exist
const firstVerse = verses[0];

// Check if Lithuanian and Bengali already exist
if (firstVerse.lithuanian && firstVerse.bengali) {
  console.log('✅ Lithuanian and Bengali translations already exist in verses_final.json');
  console.log('First verse Lithuanian:', firstVerse.lithuanian);
  console.log('First verse Bengali:', firstVerse.bengali);
} else {
  console.log('❌ Lithuanian and Bengali translations are missing from verses_final.json');
  console.log('Available fields in first verse:', Object.keys(firstVerse));
  console.log('\nYou need to update the verses_final.json file with the Lithuanian and Bengali translations.');
  console.log('The language configuration expects these fields:');
  console.log('- lithuanian (for the translation)');
  console.log('- lithuanian_footnote (for footnotes)');
  console.log('- bengali (for the translation)');
  console.log('- bengali_footnote (for footnotes)');
}
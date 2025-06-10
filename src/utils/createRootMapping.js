// Script to create bidirectional root mapping from verses data
const fs = require('fs');
const path = require('path');

function createBidirectionalRootMapping() {
  // Read verses data
  const versesPath = path.join(__dirname, '../../public/verses_final.json');
  const verses = JSON.parse(fs.readFileSync(versesPath, 'utf8'));
  
  // Create mappings
  const arabicToEnglish = {}; // Arabic root -> English meanings
  const englishToArabic = {}; // English word -> Arabic roots
  const rootOccurrences = {}; // Root -> verse references
  
  verses.forEach(verse => {
    if (!verse.roots || !verse.meanings) return;
    
    const roots = verse.roots.split(',').map(r => r.trim());
    const meanings = verse.meanings.split(',').map(m => m.trim());
    
    // Process each root with its corresponding meaning
    roots.forEach((root, index) => {
      if (!root) return;
      
      // Initialize root data if not exists
      if (!arabicToEnglish[root]) {
        arabicToEnglish[root] = {
          meanings: new Set(),
          verses: []
        };
      }
      
      // Add verse reference
      arabicToEnglish[root].verses.push(verse.sura_verse);
      
      // Extract English words from the meaning
      if (meanings[index]) {
        const meaning = meanings[index]
          .replace(/[\[\]()]/g, '') // Remove brackets and parentheses
          .replace(/;/g, '') // Remove semicolons
          .toLowerCase()
          .trim();
        
        if (meaning) {
          // Add to Arabic->English mapping
          arabicToEnglish[root].meanings.add(meaning);
          
          // Process each English word for reverse mapping
          const words = meaning.split(/\s+/);
          words.forEach(word => {
            // Clean and normalize the word
            const cleanWord = word
              .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
              .trim();
            
            if (cleanWord && cleanWord.length > 2) { // Skip very short words
              if (!englishToArabic[cleanWord]) {
                englishToArabic[cleanWord] = new Set();
              }
              englishToArabic[cleanWord].add(root);
            }
          });
        }
      }
    });
  });
  
  // Convert Sets to Arrays for JSON serialization
  const finalArabicToEnglish = {};
  Object.keys(arabicToEnglish).forEach(root => {
    finalArabicToEnglish[root] = {
      meanings: Array.from(arabicToEnglish[root].meanings),
      verses: arabicToEnglish[root].verses,
      occurrenceCount: arabicToEnglish[root].verses.length
    };
  });
  
  const finalEnglishToArabic = {};
  Object.keys(englishToArabic).forEach(word => {
    finalEnglishToArabic[word] = Array.from(englishToArabic[word]);
  });
  
  // Create comprehensive root data
  const rootData = {
    arabicToEnglish: finalArabicToEnglish,
    englishToArabic: finalEnglishToArabic,
    metadata: {
      totalRoots: Object.keys(finalArabicToEnglish).length,
      totalEnglishWords: Object.keys(finalEnglishToArabic).length,
      generatedAt: new Date().toISOString()
    }
  };
  
  // Save the mapping
  const outputPath = path.join(__dirname, '../../public/rootMapping.json');
  fs.writeFileSync(outputPath, JSON.stringify(rootData, null, 2));
  
  console.log('Root mapping created successfully!');
  console.log(`Total Arabic roots: ${rootData.metadata.totalRoots}`);
  console.log(`Total English words mapped: ${rootData.metadata.totalEnglishWords}`);
  
  // Create a sample output for verification
  console.log('\nSample mappings:');
  console.log('Arabic to English:');
  Object.keys(finalArabicToEnglish).slice(0, 5).forEach(root => {
    console.log(`  ${root}: ${finalArabicToEnglish[root].meanings.join(', ')}`);
  });
  
  console.log('\nEnglish to Arabic:');
  Object.keys(finalEnglishToArabic).slice(0, 5).forEach(word => {
    console.log(`  ${word}: ${finalEnglishToArabic[word].join(', ')}`);
  });
}

// Run the script
createBidirectionalRootMapping();
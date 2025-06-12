const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// This script processes the root arabic english mapping.csv to create
// a mapping of English words to their Arabic equivalents with verse references

const inputFile = path.join(__dirname, '../../root arabic english mapping.csv');
const outputFile = path.join(__dirname, '../public/englishToArabicWords.json');

const englishToArabicWords = {};
const rootToWords = {};

// Helper function to clean and normalize English words
function normalizeEnglish(text) {
  if (!text) return '';
  
  // Remove common annotations
  return text
    .replace(/\[.*?\]/g, '') // Remove bracketed text
    .replace(/\(.*?\)/g, '') // Remove parenthetical text
    .replace(/[.,;:!?]/g, '') // Remove punctuation
    .replace(/^(the|a|an|to|in|of|from|for|with|by|on|at)\s+/i, '') // Remove common prepositions/articles
    .trim()
    .toLowerCase();
}

// Helper function to extract key words from English phrase
function extractKeyWords(englishText) {
  const normalized = normalizeEnglish(englishText);
  const words = normalized.split(/\s+/);
  
  // Filter out very short words and common words
  const meaningfulWords = words.filter(word => 
    word.length > 2 && 
    !['and', 'the', 'for', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'not'].includes(word)
  );
  
  return meaningfulWords;
}

let rowCount = 0;

fs.createReadStream(inputFile)
  .pipe(csv({
    skipLinesWithError: true,
    strict: false
  }))
  .on('data', (row) => {
    rowCount++;
    if (rowCount <= 5) {
      console.log('Row:', row);
    }
    // Handle BOM in first column name
    const sura = row['SuraNumberEnglish'] || row['﻿SuraNumberEnglish'];
    const verse = row['VerseNumberEnglish'];
    const wordNum = row['WordNumberEnglish'];
    const arabicWord = row['Uthmani'];
    const englishPhrase = row['EnglishWord'];
    const transliteration = row['TransliterationWord'];
    const root = row['Root Word 1'];
    
    if (!arabicWord || !englishPhrase || !sura || !verse) return;
    
    const verseRef = `${sura}:${verse}`;
    const keyWords = extractKeyWords(englishPhrase);
    
    // Add each meaningful English word
    keyWords.forEach(englishWord => {
      if (!englishToArabicWords[englishWord]) {
        englishToArabicWords[englishWord] = {};
      }
      
      if (!englishToArabicWords[englishWord][arabicWord]) {
        englishToArabicWords[englishWord][arabicWord] = {
          transliteration: transliteration,
          verses: [],
          root: root,
          meanings: []
        };
      }
      
      // Add verse reference
      englishToArabicWords[englishWord][arabicWord].verses.push({
        ref: verseRef,
        wordNum: wordNum,
        fullMeaning: englishPhrase
      });
      
      // Add the full meaning if not already there
      if (!englishToArabicWords[englishWord][arabicWord].meanings.includes(englishPhrase)) {
        englishToArabicWords[englishWord][arabicWord].meanings.push(englishPhrase);
      }
    });
    
    // Also build root to words mapping
    if (root && root !== '-') {
      if (!rootToWords[root]) {
        rootToWords[root] = {};
      }
      
      if (!rootToWords[root][arabicWord]) {
        rootToWords[root][arabicWord] = {
          english: englishPhrase,
          transliteration: transliteration,
          verses: []
        };
      }
      
      rootToWords[root][arabicWord].verses.push(verseRef);
    }
  })
  .on('end', () => {
    console.log(`Total rows processed: ${rowCount}`);
    // Sort and limit the data to most common occurrences
    const processedData = {};
    
    Object.keys(englishToArabicWords).forEach(englishWord => {
      // Sort Arabic words by frequency (number of verses)
      const arabicWords = Object.entries(englishToArabicWords[englishWord])
        .sort((a, b) => b[1].verses.length - a[1].verses.length)
        .slice(0, 10); // Keep top 10 most frequent Arabic words for each English word
      
      if (arabicWords.length > 0) {
        processedData[englishWord] = Object.fromEntries(arabicWords);
      }
    });
    
    // Save the processed data
    const output = {
      englishToArabic: processedData,
      rootToWords: rootToWords,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalEnglishWords: Object.keys(processedData).length,
        totalRoots: Object.keys(rootToWords).length
      }
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    
    console.log(`Processing complete!`);
    console.log(`Total English words mapped: ${Object.keys(processedData).length}`);
    console.log(`Total roots processed: ${Object.keys(rootToWords).length}`);
    console.log(`Output saved to: ${outputFile}`);
  })
  .on('error', (error) => {
    console.error('Error processing CSV:', error);
  });
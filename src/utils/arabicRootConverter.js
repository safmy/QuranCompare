// Arabic word to root conversion utility

// Load verses data to build word-to-root mapping
let wordToRootMap = null;

export const initializeWordToRootMap = async () => {
  if (wordToRootMap) return wordToRootMap;
  
  try {
    const response = await fetch('/verses_final.json');
    const versesData = await response.json();
    
    wordToRootMap = new Map();
    
    versesData.forEach(verse => {
      if (verse.arabic && verse.roots) {
        const arabicWords = verse.arabic.split(/\s+/);
        const roots = verse.roots.split(',').map(r => r.trim());
        
        arabicWords.forEach((word, index) => {
          if (roots[index] && roots[index] !== '-') {
            // Store multiple possible roots for the same word form
            if (!wordToRootMap.has(word)) {
              wordToRootMap.set(word, new Set());
            }
            wordToRootMap.get(word).add(roots[index]);
          }
        });
      }
    });
    
    console.log(`Word-to-root map initialized with ${wordToRootMap.size} unique word forms`);
    return wordToRootMap;
  } catch (error) {
    console.error('Failed to initialize word-to-root map:', error);
    return null;
  }
};

// Normalize Arabic text (remove diacritics for better matching)
export const normalizeArabic = (text) => {
  // Remove common diacritical marks
  return text.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
};

// Convert Arabic word to its root(s)
export const convertWordToRoot = async (arabicWord) => {
  if (!wordToRootMap) {
    await initializeWordToRootMap();
  }
  
  if (!wordToRootMap) {
    console.error('Word-to-root map not available');
    return null;
  }
  
  // Try exact match first
  if (wordToRootMap.has(arabicWord)) {
    const roots = Array.from(wordToRootMap.get(arabicWord));
    return roots.length === 1 ? roots[0] : roots;
  }
  
  // Try normalized version (without diacritics)
  const normalized = normalizeArabic(arabicWord);
  for (const [word, roots] of wordToRootMap) {
    if (normalizeArabic(word) === normalized) {
      const rootArray = Array.from(roots);
      return rootArray.length === 1 ? rootArray[0] : rootArray;
    }
  }
  
  // Try to find partial matches (for different word forms)
  const possibleRoots = new Set();
  const normalizedLength = normalized.length;
  
  for (const [word, roots] of wordToRootMap) {
    const wordNormalized = normalizeArabic(word);
    
    // Check if the normalized forms share significant overlap
    if (wordNormalized.length >= 3 && normalizedLength >= 3) {
      // Check for common substring of at least 3 characters
      for (let i = 0; i <= wordNormalized.length - 3; i++) {
        const substring = wordNormalized.substring(i, i + 3);
        if (normalized.includes(substring) || substring.includes(normalized.substring(0, 3))) {
          roots.forEach(root => possibleRoots.add(root));
        }
      }
    }
  }
  
  if (possibleRoots.size > 0) {
    const rootArray = Array.from(possibleRoots);
    console.log(`Found ${rootArray.length} possible roots for "${arabicWord}":`, rootArray);
    return rootArray.length === 1 ? rootArray[0] : rootArray;
  }
  
  console.log(`No root found for word: "${arabicWord}"`);
  return null;
};

// Process transcribed Arabic text and convert to root search query
export const processArabicTranscription = async (transcription) => {
  const arabicWords = transcription.trim().split(/\s+/);
  const roots = [];
  
  for (const word of arabicWords) {
    const root = await convertWordToRoot(word);
    if (root) {
      if (Array.isArray(root)) {
        roots.push(...root);
      } else {
        roots.push(root);
      }
    }
  }
  
  // Return unique roots
  const uniqueRoots = [...new Set(roots)];
  
  if (uniqueRoots.length === 0) {
    // If no roots found, return the original transcription
    return transcription;
  }
  
  // Return the first root for single word, or join multiple roots
  return uniqueRoots.length === 1 ? uniqueRoots[0] : uniqueRoots.join(' ');
};
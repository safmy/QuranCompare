import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import _ from 'lodash';

const QuranManuscriptAnalysis = () => {
  const [data, setData] = useState({
    suraStats: [],
    verseStats: [],
    manuscriptStats: [],
    letterStats: [],
    originalData: []
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedSura, setSelectedSura] = useState(1);
  const [selectedManuscript, setSelectedManuscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [referenceTexts, setReferenceTexts] = useState({});
  const [uthmaniText, setUthmaniText] = useState({});
  const [comparatorSource, setComparatorSource] = useState('uthmani'); // Default to Uthmani
  const [availableComparators, setAvailableComparators] = useState(['uthmani']);
  // New state for disjointed letters tab
  const [selectedDisjointedLetters, setSelectedDisjointedLetters] = useState('');
  const [highlightedLetterIndex, setHighlightedLetterIndex] = useState(-1);
  const [disjointedLetterCounts, setDisjointedLetterCounts] = useState({});
  // Add a toggle for letter counts source
  const [showManuscriptCounts, setShowManuscriptCounts] = useState(true);
  // Add a toggle for no highlighting
  const [showHighlighting, setShowHighlighting] = useState(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // Define the disjointed letters (Muqatta'at) by Sura
  const disjointedLettersBySura = {
    2: "الم", // Alif Lam Meem
    3: "الم",
    7: "المص", // Alif Lam Meem Saad
    10: "الر", // Alif Lam Ra
    11: "الر",
    12: "الر",
    13: "المر", // Alif Lam Meem Ra
    14: "الر",
    15: "الر",
    19: "كهيعص", // Kaf Ha Ya Ain Saad
    20: "طه", // Ta Ha
    26: "طسم", // Ta Seen Meem
    27: "طس", // Ta Seen
    28: "طسم",
    29: "الم",
    30: "الم",
    31: "الم",
    32: "الم",
    36: "يس", // Ya Seen
    38: "ص", // Saad
    40: "حم", // Ha Meem
    41: "حم",
    42: "حم عسق", // Ha Meem Ain Seen Qaf
    43: "حم",
    44: "حم",
    45: "حم",
    46: "حم",
    50: "ق", // Qaf
    68: "ن" // Noon
  };

  // Letters to use for coloring
  const letterColors = {
    'ا': '#FF5733', // Alif - Red
    'ل': '#33FF57', // Lam - Green
    'م': '#3357FF', // Meem - Blue
    'ص': '#FF33A1', // Saad - Pink
    'ر': '#A133FF', // Ra - Purple
    'ك': '#33FFF6', // Kaf - Cyan
    'ه': '#FFD433', // Ha - Yellow
    'ي': '#FF8333', // Ya - Orange
    'ع': '#33FFB7', // Ain - Teal
    'ط': '#7BFF33', // Ta - Lime
    'س': '#33B4FF', // Seen - Light Blue
    'ح': '#FF3357', // Ha - Light Red
    'ق': '#9A33FF', // Qaf - Violet
    'ن': '#FF5733'  // Noon - Same as Alif for now
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // When comparator source changes, we need to recalculate statistics
    if (data.originalData.length > 0) {
      // Even without Uthmani text, we can still use other comparators
      const processedData = processQuranData(data.originalData);
      setData(processedData);
    }
  }, [comparatorSource]);

  useEffect(() => {
    // When selectedSura changes, update the selected disjointed letters
    if (disjointedLettersBySura[selectedSura]) {
      setSelectedDisjointedLetters(disjointedLettersBySura[selectedSura]);
      // Reset highlighted letter index
      setHighlightedLetterIndex(-1);
      // Count the occurrences of each disjointed letter in the selected sura
      countDisjointedLetters(selectedSura);
    } else {
      setSelectedDisjointedLetters('');
      setDisjointedLetterCounts({});
    }
  }, [selectedSura, data.letterStats, referenceTexts]);

  // Function to count occurrences of disjointed letters in a sura
  const countDisjointedLetters = (sura) => {
    if (!disjointedLettersBySura[sura]) return;
    
    const letters = disjointedLettersBySura[sura].split('');
    const letterCounts = {};
    
    // Initialize the count for each letter
    letters.forEach(letter => {
      letterCounts[letter] = 0;
    });
    
    // Get all verses for this sura
    const suraVerses = Object.keys(referenceTexts)
      .filter(key => key.startsWith(`${sura}:`))
      .map(key => referenceTexts[key]);
    
    // Count each letter in all verses of the sura
    suraVerses.forEach(verse => {
      if (!verse) return;
      
      letters.forEach(letter => {
        // Count occurrences of this letter in the verse (excluding diacritics)
        const regex = new RegExp(letter, 'g');
        const matches = verse.match(regex);
        letterCounts[letter] += matches ? matches.length : 0;
      });
    });
    
    setDisjointedLetterCounts(letterCounts);
  };

  // Function to highlight a specific disjointed letter
  const highlightLetter = (letterIndex) => {
    setHighlightedLetterIndex(letterIndex);
  };

  // Function to count disjointed letters across all manuscripts
  const countDisjointedLettersAcrossManuscripts = (sura) => {
    if (!disjointedLettersBySura[sura]) return { chartData: [], manuscripts: [] };
    
    const letters = disjointedLettersBySura[sura].split('');
    const manuscriptLetterCounts = {};
    
    // Get all manuscripts that have verses from this sura
    const manuscriptsWithSura = data.letterStats
      .filter(entry => entry.Sura === sura)
      .map(entry => entry.Manuscript);
    
    const uniqueManuscripts = [...new Set(manuscriptsWithSura)];
    
    // Initialize counts for each manuscript
    uniqueManuscripts.forEach(manuscript => {
      manuscriptLetterCounts[manuscript] = {};
      letters.forEach(letter => {
        manuscriptLetterCounts[manuscript][letter] = 0;
      });
    });
    
    // Count each letter in each manuscript's verses for this sura
    data.letterStats
      .filter(entry => entry.Sura === sura)
      .forEach(entry => {
        if (!entry.Text) return;
        
        letters.forEach(letter => {
          const regex = new RegExp(letter, 'g');
          const matches = entry.Text.match(regex);
          if (manuscriptLetterCounts[entry.Manuscript]) {
            manuscriptLetterCounts[entry.Manuscript][letter] += matches ? matches.length : 0;
          }
        });
      });
    
    // Format the data for the chart
    const chartData = [];
    letters.forEach(letter => {
      const letterData = {
        letter,
      };
      
      uniqueManuscripts.forEach(manuscript => {
        if (manuscriptLetterCounts[manuscript]) {
          letterData[manuscript] = manuscriptLetterCounts[manuscript][letter];
        } else {
          letterData[manuscript] = 0;
        }
      });
      
      chartData.push(letterData);
    });
    
    return {
      chartData,
      manuscripts: uniqueManuscripts
    };
  };

  // Function to get the text with highlighted disjointed letters
  const getHighlightedText = (text, letters) => {
    if (!text || !letters || !showHighlighting) return text;
    
    // Convert text to array for easier manipulation
    const textArray = text.split('');
    
    // Create a new array with spans for highlighted letters
    const highlightedText = [];
    
    textArray.forEach((char, index) => {
      if (letters.includes(char)) {
        // Find the position of this letter in the disjointed letters string
        const letterIndex = letters.indexOf(char);
        const isHighlighted = highlightedLetterIndex === letterIndex || highlightedLetterIndex === -1;
        
        // Add with appropriate styling
        highlightedText.push(
          <span 
            key={index} 
            style={{ 
              color: letterColors[char] || 'inherit',
              backgroundColor: isHighlighted ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
              padding: '0 2px',
              borderRadius: '2px',
              fontWeight: isHighlighted ? 'bold' : 'normal'
            }}
          >
            {char}
          </span>
        );
      } else {
        // Regular character
        highlightedText.push(char);
      }
    });
    
    return highlightedText;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      // Define paths with public URL base for production
      const uthmaniPath = process.env.PUBLIC_URL + '/quran-uthmani.txt';
      const excelPath = process.env.PUBLIC_URL + '/quran_manuscript.xlsx';

      let uthmaniVerses = {};
      try {
        // Load Uthmani text file
        const uthmaniResponse = await fetch(uthmaniPath);
        if (uthmaniResponse.ok) {
          const uthmaniContent = await uthmaniResponse.text();
          uthmaniVerses = parseUthmaniText(uthmaniContent);
          console.log("Uthmani text loaded successfully");
        } else {
          console.warn(`Could not load the Uthmani text file (${uthmaniPath}). Will proceed without it.`);
          // If Uthmani text is not available, remove it from available comparators
          setAvailableComparators(prev => prev.filter(c => c !== 'uthmani'));
          // Switch to another comparator if Uthmani was selected
          if (comparatorSource === 'uthmani') {
            setComparatorSource('');  // Will be set to first manuscript later
          }
        }
      } catch (error) {
        console.error("Error loading Uthmani text:", error);
        // Handle gracefully - continue without Uthmani text
      }
      
      setUthmaniText(uthmaniVerses);
      
      // Load Excel file with manuscripts - this is required
      const excelResponse = await fetch(excelPath);
      if (!excelResponse.ok) {
        throw new Error(`Could not load the Excel file (${excelPath}). Please ensure "quran_manuscript.xlsx" is placed in the public directory.`);
      }
      
      const arrayBuffer = await excelResponse.arrayBuffer();
      
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });

      if (!workbook.Sheets["manuscript_data"]) {
        throw new Error('The Excel file does not contain a worksheet named "manuscript_data".');
      }

      const sheet = workbook.Sheets["manuscript_data"];
      const rawData = XLSX.utils.sheet_to_json(sheet);
      
      if (rawData.length === 0) {
        throw new Error('No data found in the worksheet. Please check the Excel file format.');
      }
      
      // Get list of manuscripts for comparator selection
      const manuscripts = [...new Set(rawData.map(row => row.Manuscript))];
      setAvailableComparators(['uthmani', ...manuscripts]);
      
      // Process the data and prepare for visualization
      const processedData = processQuranData(rawData);
      setData(processedData);
      
      if (processedData.manuscriptStats.length > 0) {
        setSelectedManuscript(processedData.manuscriptStats[0].Manuscript);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadError(error.message || 'Failed to load manuscript data');
      setLoading(false);
    }
  };

  const parseUthmaniText = (text) => {
    try {
      // Simple parser for the Uthmani text format
      // This assumes each line is a verse, and we need to track sura/verse numbers
      const verses = {};
      let currentSura = 1;
      let verseInSura = 1;
      
      // Split by lines
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length === 0) {
        console.error("Uthmani text file appears to be empty or contains no valid lines");
        return {}; // Return empty object instead of failing
      }
      
      for (let i = 0; i < lines.length; i++) {
        // Handle bismillah markers for new suras
        if (i > 0 && lines[i].includes('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ') && lines[i].length < 50) {
          currentSura++;
          verseInSura = 1;
          // Skip bismillah line in counting except for Sura 1 (Al-Fatiha) and Sura 9 (At-Tawba)
          if (currentSura !== 1 && currentSura !== 9) {
            continue;
          }
        }
        
        const key = `${currentSura}:${verseInSura}`;
        verses[key] = lines[i];
        verseInSura++;
      }
      
      console.log(`Successfully parsed Uthmani text with ${Object.keys(verses).length} verses`);
      return verses;
    } catch (error) {
      console.error("Error parsing Uthmani text:", error);
      return {}; // Return empty object instead of failing
    }
  };

  // Function to count Arabic letters (excluding spaces, diacritics, etc.)
  const countArabicLetters = (text) => {
    if (!text || typeof text !== 'string') return 0;
    
    // Remove asterisks, spaces, and common diacritics
    const cleanText = text.replace(/[\*\s\u064B-\u0652]/g, '');
    return cleanText.length;
  };

  const processQuranData = (rawData) => {
    // 1. Group by Sura and Verse to create reference texts
    const groupedBySuraVerse = _.groupBy(rawData, row => `${row.Sura}:${row.Verse}`);
    
    // 2. For each Sura:Verse, determine the reference text based on selected comparator
    const refTexts = {};
    
    if (comparatorSource === 'uthmani' && Object.keys(uthmaniText).length > 0) {
      // Use Uthmani text as reference
      Object.assign(refTexts, uthmaniText);
    } else {
      // Use selected manuscript from the Excel data as reference
      // If comparatorSource is empty or invalid, find the most complete manuscript
      let effectiveComparator = comparatorSource;
      
      if (!effectiveComparator || effectiveComparator === 'uthmani') {
        // Find the manuscript with the most entries
        const manuscriptCounts = _.countBy(rawData, 'Manuscript');
        const mostCompleteManuscript = Object.entries(manuscriptCounts)
          .sort((a, b) => b[1] - a[1])[0][0];
        effectiveComparator = mostCompleteManuscript;
        
        // Update the state with the new comparator if needed
        if (comparatorSource !== effectiveComparator) {
          console.log(`Switching to ${effectiveComparator} as fallback comparator`);
          setTimeout(() => setComparatorSource(effectiveComparator), 0);
        }
      }
      
      for (const row of rawData) {
        if (row.Manuscript === effectiveComparator) {
          const key = `${row.Sura}:${row.Verse}`;
          refTexts[key] = row.Text || '';
        }
      }
      
      // If using a manuscript as comparator, but some verses are missing, 
      // fill in gaps with most common text from other manuscripts
      for (const [key, group] of Object.entries(groupedBySuraVerse)) {
        if (!refTexts[key]) {
          // Filter out texts with too many asterisks (incomplete texts)
          const validTexts = group
            .map(item => item.Text)
            .filter(text => text && typeof text === 'string')
            .filter(text => {
              const asteriskCount = (text.match(/\*/g) || []).length;
              const textLength = text.length;
              return asteriskCount < textLength * 0.3; // Less than 30% asterisks
            });
          
          if (validTexts.length > 0) {
            // Find the most common text
            const textCounts = _.countBy(validTexts);
            const mostCommonText = Object.entries(textCounts)
              .sort((a, b) => b[1] - a[1])[0][0];
            
            refTexts[key] = mostCommonText;
          }
        }
      }
    }
    
    setReferenceTexts(refTexts);
    
    // 3. Calculate letter counts and deviations for each manuscript
    const letterStats = [];
    
    for (const row of rawData) {
      const key = `${row.Sura}:${row.Verse}`;
      const manuscriptText = row.Text || '';
      const referenceVerseText = refTexts[key] || '';
      
      const manuscriptLetterCount = countArabicLetters(manuscriptText);
      const referenceLetterCount = countArabicLetters(referenceVerseText);
      
      // Count specific differences
      const asteriskCount = (manuscriptText.match(/\*/g) || []).length;
      
      // Only calculate meaningful deviation when we have both texts
      let deviation = null;
      if (referenceLetterCount > 0 && manuscriptLetterCount > 0) {
        deviation = manuscriptLetterCount - referenceLetterCount;
      }
      
      letterStats.push({
        Sura: row.Sura,
        Verse: row.Verse,
        Manuscript: row.Manuscript,
        Text: manuscriptText,
        ReferenceText: referenceVerseText,
        ManuscriptLetterCount: manuscriptLetterCount,
        ReferenceLetterCount: referenceLetterCount,
        Deviation: deviation,
        AbsDeviation: deviation !== null ? Math.abs(deviation) : null,
        AsteriskCount: asteriskCount,
        IsComplete: asteriskCount === 0
      });
    }
    
    // 4. Calculate sura-level statistics
    const uniqueSuras = new Set(rawData.map(row => row.Sura));
    const suraList = Array.from(uniqueSuras).sort((a, b) => a - b);
    const suraStats = [];
    
    for (const sura of suraList) {
      const suraEntries = letterStats.filter(entry => entry.Sura === sura);
      const completeSuraEntries = suraEntries.filter(entry => entry.IsComplete);
      
      // Calculate average letter counts and deviations
      let avgManuscriptLetters = 0;
      let avgReferenceLetters = 0;
      let totalDeviations = 0;
      let countWithBothTexts = 0;
      
      for (const entry of suraEntries) {
        if (entry.ManuscriptLetterCount > 0) {
          avgManuscriptLetters += entry.ManuscriptLetterCount;
        }
        
        if (entry.ReferenceLetterCount > 0) {
          avgReferenceLetters += entry.ReferenceLetterCount;
        }
        
        if (entry.Deviation !== null) {
          totalDeviations += Math.abs(entry.Deviation);
          countWithBothTexts++;
        }
      }
      
      const entryCount = suraEntries.length;
      
      if (entryCount > 0) {
        avgManuscriptLetters /= entryCount;
        avgReferenceLetters /= entryCount;
      }
      
      let avgAbsDeviation = 0;
      let stdDeviation = 0;
      
      if (countWithBothTexts > 0) {
        avgAbsDeviation = totalDeviations / countWithBothTexts;
        
        // Calculate standard deviation
        const deviations = suraEntries
          .filter(entry => entry.Deviation !== null)
          .map(entry => entry.Deviation);
        
        const mean = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
        const squaredDiffs = deviations.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / deviations.length;
        stdDeviation = Math.sqrt(variance);
      }
      
      suraStats.push({
        Sura: sura,
        TotalEntries: entryCount,
        CompleteEntries: completeSuraEntries.length,
        AvgManuscriptLetters: parseFloat(avgManuscriptLetters.toFixed(2)),
        AvgReferenceLetters: parseFloat(avgReferenceLetters.toFixed(2)),
        AvgAbsDeviation: parseFloat(avgAbsDeviation.toFixed(2)),
        StdDeviation: parseFloat(stdDeviation.toFixed(2))
      });
    }
    
    // 5. Calculate verse-specific statistics
    const verseStats = [];
    
    const uniqueVerseKeys = Object.keys(groupedBySuraVerse);
    for (const key of uniqueVerseKeys) {
      const [sura, verse] = key.split(':').map(Number);
      const verseEntries = letterStats.filter(entry => entry.Sura === sura && entry.Verse === verse);
      
      // Calculate statistics for this verse
      const letterCounts = verseEntries.map(entry => entry.ManuscriptLetterCount).filter(count => count > 0);
      
      if (letterCounts.length > 0) {
        const avgLetterCount = letterCounts.reduce((sum, count) => sum + count, 0) / letterCounts.length;
        const referenceLetterCount = countArabicLetters(refTexts[key] || '');
        
        // Calculate standard deviation
        const squaredDiffs = letterCounts.map(count => Math.pow(count - avgLetterCount, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / letterCounts.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate mean absolute deviation from reference
        const deviations = verseEntries
          .filter(entry => entry.Deviation !== null)
          .map(entry => Math.abs(entry.Deviation));
        
        const meanAbsDeviation = deviations.length > 0
          ? deviations.reduce((sum, val) => sum + val, 0) / deviations.length
          : 0;
        
        verseStats.push({
          Sura: sura,
          Verse: verse,
          AvgLetterCount: parseFloat(avgLetterCount.toFixed(2)),
          ReferenceLetterCount: referenceLetterCount,
          StdDeviation: parseFloat(stdDev.toFixed(2)),
          MeanAbsDeviation: parseFloat(meanAbsDeviation.toFixed(2)),
          NumManuscripts: verseEntries.length,
          ReferenceText: refTexts[key] || ''
        });
      }
    }
    
    // 6. Calculate manuscript-specific statistics
    const uniqueManuscripts = new Set(rawData.map(row => row.Manuscript));
    const manuscriptList = Array.from(uniqueManuscripts);
    const manuscriptStats = [];
    
    for (const manuscript of manuscriptList) {
      const manuscriptEntries = letterStats.filter(entry => entry.Manuscript === manuscript);
      const completeEntries = manuscriptEntries.filter(entry => entry.IsComplete);
      
      // Calculate total letter counts and deviations
      let totalManuscriptLetters = 0;
      let totalReferenceLetters = 0;
      let totalAbsDeviation = 0;
      let countWithBothTexts = 0;
      
      for (const entry of manuscriptEntries) {
        totalManuscriptLetters += entry.ManuscriptLetterCount;
        totalReferenceLetters += entry.ReferenceLetterCount;
        
        if (entry.Deviation !== null) {
          totalAbsDeviation += Math.abs(entry.Deviation);
          countWithBothTexts++;
        }
      }
      
      let averageDeviation = 0;
      if (countWithBothTexts > 0) {
        averageDeviation = totalAbsDeviation / countWithBothTexts;
      }
      
      // Calculate standard deviation of deviations
      const deviations = manuscriptEntries
        .filter(entry => entry.Deviation !== null)
        .map(entry => entry.Deviation);
      
      let stdDeviation = 0;
      if (deviations.length > 0) {
        const mean = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
        const squaredDiffs = deviations.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / deviations.length;
        stdDeviation = Math.sqrt(variance);
      }
      
      manuscriptStats.push({
        Manuscript: manuscript,
        TotalEntries: manuscriptEntries.length,
        CompleteEntries: completeEntries.length,
        TotalManuscriptLetters: totalManuscriptLetters,
        TotalReferenceLetters: totalReferenceLetters,
        AverageAbsDeviation: parseFloat(averageDeviation.toFixed(2)),
        StdDeviation: parseFloat(stdDeviation.toFixed(2)),
        CompletionPercentage: parseFloat(((completeEntries.length / manuscriptEntries.length) * 100).toFixed(1))
      });
    }
    
    // Sort manuscripts by number of entries
    manuscriptStats.sort((a, b) => b.TotalEntries - a.TotalEntries);
    
    return {
      suraStats,
      verseStats,
      manuscriptStats,
      letterStats,
      originalData: rawData
    };
  };

  // Filtering functions
  const filteredSuraStats = data.suraStats.filter(sura => 
    sura.Sura.toString().includes(searchQuery)
  );

  const filteredVerseStats = data.verseStats.filter(verse => 
    verse.Sura === selectedSura
  ).sort((a, b) => a.Verse - b.Verse);

  const filteredManuscriptVerses = data.letterStats.filter(item => 
    item.Manuscript === selectedManuscript && item.Sura === selectedSura
  ).sort((a, b) => a.Verse - b.Verse);

  // Prepare data for specific visualizations
  const selectedSuraData = data.suraStats.find(s => s.Sura === selectedSura);
  
  const manuscriptLetterDeviation = data.manuscriptStats.map(ms => ({
    name: ms.Manuscript.length > 20 ? ms.Manuscript.substring(0, 20) + '...' : ms.Manuscript,
    deviation: ms.AverageAbsDeviation,
    stdDev: ms.StdDeviation
  })).sort((a, b) => b.deviation - a.deviation);

  const suraStandardDeviations = data.suraStats.map(sura => ({
    Sura: sura.Sura,
    StdDeviation: sura.StdDeviation,
    AvgDeviation: sura.AvgAbsDeviation
  }));

  // Distribution of deviations
  const deviationDistribution = {};
  data.letterStats.forEach(stat => {
    if (stat.Deviation !== null) {
      const roundedDeviation = Math.round(stat.Deviation);
      deviationDistribution[roundedDeviation] = (deviationDistribution[roundedDeviation] || 0) + 1;
    }
  });

  const deviationDistributionData = Object.entries(deviationDistribution)
    .map(([dev, count]) => ({ 
      deviation: parseInt(dev), 
      count 
    }))
    .sort((a, b) => a.deviation - b.deviation);

  // Statistical summary
  const calculateStatistics = (values) => {
    if (!values || values.length === 0) return { mean: 0, median: 0, stdDev: 0 };
    
    const sortedValues = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    
    // Median
    const mid = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
    
    // Standard Deviation
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      stdDev: parseFloat(stdDev.toFixed(2))
    };
  };
  
  // Calculate overall statistics for deviations
  const allDeviations = data.letterStats
    .filter(stat => stat.Deviation !== null)
    .map(stat => stat.Deviation);
  
  const allAbsDeviations = data.letterStats
    .filter(stat => stat.Deviation !== null)
    .map(stat => Math.abs(stat.Deviation));
  
  const deviationStats = calculateStatistics(allDeviations);
  const absDeviationStats = calculateStatistics(allAbsDeviations);

  // Function to count the occurrences of a specific letter in a text
  const countLetterInText = (text, letter) => {
    if (!text || !letter) return 0;
    const regex = new RegExp(letter, 'g');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  };

  // Function to calculate statistical measures for letter distributions
  const calculateLetterStats = (sura) => {
    if (!disjointedLettersBySura[sura]) return {};
    
    const letters = disjointedLettersBySura[sura].split('');
    const stats = {};
    
    // Initialize stats object for each letter
    letters.forEach(letter => {
      stats[letter] = {
        mean: 0,
        mode: 0,
        modeCount: 0,
        max: 0,
        maxManuscript: '',
        counts: []
      };
    });
    
    // Collect counts for each manuscript
    const manuscriptsWithSura = data.letterStats
      .filter(entry => entry.Sura === sura)
      .map(entry => entry.Manuscript);
    
    const uniqueManuscripts = [...new Set(manuscriptsWithSura)];
    
    // For each manuscript, calculate the total count of each letter
    uniqueManuscripts.forEach(manuscript => {
      const manuscriptVerses = data.letterStats
        .filter(entry => entry.Sura === sura && entry.Manuscript === manuscript);
      
      letters.forEach(letter => {
        let totalCount = 0;
        
        manuscriptVerses.forEach(verse => {
          if (!verse.Text) return;
          totalCount += countLetterInText(verse.Text, letter);
        });
        
        // Add this count to our collection for this letter
        stats[letter].counts.push(totalCount);
        
        // Check if this is the maximum count
        if (totalCount > stats[letter].max) {
          stats[letter].max = totalCount;
          stats[letter].maxManuscript = manuscript;
        }
      });
    });
    
    // Calculate mean and mode for each letter
    letters.forEach(letter => {
      const counts = stats[letter].counts;
      
      if (counts.length > 0) {
        // Calculate mean
        const sum = counts.reduce((acc, count) => acc + count, 0);
        stats[letter].mean = parseFloat((sum / counts.length).toFixed(2));
        
        // Calculate mode (most frequent value)
        const countFrequency = {};
        let maxFrequency = 0;
        let mode = 0;
        
        counts.forEach(count => {
          countFrequency[count] = (countFrequency[count] || 0) + 1;
          
          if (countFrequency[count] > maxFrequency) {
            maxFrequency = countFrequency[count];
            mode = count;
          }
        });
        
        stats[letter].mode = mode;
        stats[letter].modeCount = maxFrequency;
      }
    });
    
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl font-semibold">Loading Quranic manuscript data...</div>
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4 text-center text-red-700">Error Loading Data</h1>
        <div className="bg-white p-6 rounded shadow text-center">
          <p className="text-lg mb-4">{loadError}</p>
          <div className="mt-4 p-4 bg-gray-50 rounded text-left">
            <h2 className="font-semibold mb-2">Expected file format:</h2>
            <ul className="list-disc pl-6">
              <li>File should be named <code className="bg-gray-100 px-1 rounded">quran_manuscript.xlsx</code></li>
              <li>Must contain a worksheet named <code className="bg-gray-100 px-1 rounded">manuscript_data</code></li>
              <li>Worksheet should have columns: Sura, Verse, Manuscript, Text</li>
              <li>The <code className="bg-gray-100 px-1 rounded">quran-uthmani.txt</code> file should be in the public directory</li>
            </ul>
            <p className="mt-4">
              Place the files in the <code className="bg-gray-100 px-1 rounded">public</code> folder and refresh the page.
            </p>
          </div>
          <button 
            className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => { setLoading(true); loadData(); }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">Quranic Manuscript Letter Count Analysis</h1>
      
      {/* Comparator Selection */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Reference Text Selection</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium mb-1">Select Comparison Source:</label>
            <select 
              className="w-full p-2 border rounded"
              value={comparatorSource}
              onChange={(e) => setComparatorSource(e.target.value)}
            >
              {availableComparators.includes('uthmani') && (
                <option value="uthmani">Uthmani Text (Base)</option>
              )}
              {availableComparators.filter(c => c !== 'uthmani').map(comp => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-grow">
            <p className="text-sm font-medium mb-1">Current Reference:</p>
            <div className="p-2 bg-gray-100 rounded">
              {comparatorSource === 'uthmani' && availableComparators.includes('uthmani') ? 
                'Manuscript: Uthmani' : 
                `Manuscript: ${comparatorSource || 'None selected'}`}
            </div>
            {!availableComparators.includes('uthmani') && (
              <p className="mt-2 text-sm text-yellow-600">
                Note: Uthmani text file could not be loaded. Using manuscript text as reference.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="flex mb-4 border-b overflow-x-auto">
        <button 
          className={`px-4 py-2 mr-2 ${activeTab === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
          onClick={() => setActiveTab('summary')}
        >
          Statistical Summary
        </button>
        <button 
          className={`px-4 py-2 mr-2 ${activeTab === 'suras' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
          onClick={() => setActiveTab('suras')}
        >
          Sura Analysis
        </button>
        <button 
          className={`px-4 py-2 mr-2 ${activeTab === 'manuscripts' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
          onClick={() => setActiveTab('manuscripts')}
        >
          Manuscript Analysis
        </button>
        <button 
          className={`px-4 py-2 mr-2 ${activeTab === 'verses' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
          onClick={() => setActiveTab('verses')}
        >
          Verse Details
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'disjointedLetters' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
          onClick={() => setActiveTab('disjointedLetters')}
        >
          Disjointed Letters
        </button>
      </div>
      
      {/* Statistical Summary Tab */}
      {activeTab === 'summary' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Overall Statistics</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p><span className="font-medium">Total Suras:</span> {data.suraStats.length}</p>
                  <p><span className="font-medium">Total Verses:</span> {data.verseStats.length}</p>
                  <p><span className="font-medium">Total Manuscripts:</span> {data.manuscriptStats.length}</p>
                  <p><span className="font-medium">Total Entries:</span> {data.letterStats.length}</p>
                </div>
                <div>
                  <p><span className="font-medium">Mean Deviation:</span> {deviationStats.mean}</p>
                  <p><span className="font-medium">Median Deviation:</span> {deviationStats.median}</p>
                  <p><span className="font-medium">Mean Absolute Deviation:</span> {absDeviationStats.mean}</p>
                  <p><span className="font-medium">Standard Deviation:</span> {deviationStats.stdDev}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Deviation Distribution</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deviationDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="deviation" label={{ value: 'Letter Count Deviation', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value, name) => [value, 'Frequency']} />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">Top 10 Manuscripts by Deviation from {comparatorSource === 'uthmani' ? 'Uthmani Text' : comparatorSource}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={manuscriptLetterDeviation.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} interval={0} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Average Letter Deviation', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="deviation" name="Avg. Letter Deviation" fill="#8884d8" />
                <Bar dataKey="stdDev" name="Standard Deviation" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Standard Deviation by Sura</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={suraStandardDeviations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Sura" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="StdDeviation" name="Standard Deviation" stroke="#8884d8" />
                <Line type="monotone" dataKey="AvgDeviation" name="Average Deviation" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Verse Details Tab */}
      {activeTab === 'verses' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-medium">Select Sura</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedSura}
                onChange={(e) => setSelectedSura(parseInt(e.target.value))}
              >
                {data.suraStats.map(sura => (
                  <option key={sura.Sura} value={sura.Sura}>
                    Sura {sura.Sura}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Select Manuscript</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedManuscript}
                onChange={(e) => setSelectedManuscript(e.target.value)}
              >
                {data.manuscriptStats.map(ms => (
                  <option key={ms.Manuscript} value={ms.Manuscript}>
                    {ms.Manuscript}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">Verse Comparison in Sura {selectedSura} (compared to {comparatorSource === 'uthmani' ? 'Uthmani Text' : comparatorSource})</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredManuscriptVerses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Verse" />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  if (name === 'ManuscriptLetterCount') return [value, 'Manuscript Letters'];
                  if (name === 'ReferenceLetterCount') return [value, 'Reference Letters'];
                  return [value, name];
                }} />
                <Legend />
                <Bar dataKey="ManuscriptLetterCount" name="Manuscript Letters" fill="#8884d8" />
                <Bar dataKey="ReferenceLetterCount" name="Reference Letters" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Detailed Verse Comparison</h2>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b">Verse</th>
                    <th className="px-2 py-1 border-b">Manuscript Text</th>
                    <th className="px-2 py-1 border-b">Reference Text</th>
                    <th className="px-2 py-1 border-b">Manuscript Letters</th>
                    <th className="px-2 py-1 border-b">Reference Letters</th>
                    <th className="px-2 py-1 border-b">Deviation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManuscriptVerses.map(verse => {
                    const refKey = `${verse.Sura}:${verse.Verse}`;
                    const refText = referenceTexts[refKey] || '';
                    
                    return (
                      <tr key={`${verse.Sura}:${verse.Verse}`}>
                        <td className="px-2 py-1 text-center">{verse.Verse}</td>
                        <td className="px-2 py-1 text-right" style={{ direction: 'rtl' }}>{verse.Text}</td>
                        <td className="px-2 py-1 text-right" style={{ direction: 'rtl' }}>{refText}</td>
                        <td className="px-2 py-1 text-center">{verse.ManuscriptLetterCount}</td>
                        <td className="px-2 py-1 text-center">{verse.ReferenceLetterCount}</td>
                        <td className="px-2 py-1 text-center">{verse.Deviation !== null ? (verse.Deviation > 0 ? `+${verse.Deviation}` : verse.Deviation) : 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Sura Analysis Tab */}
      {activeTab === 'suras' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search suras by number..."
              className="w-full p-2 border rounded"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="col-span-1 bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Sura Selection</h2>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border-b">Sura</th>
                      <th className="px-2 py-1 border-b">Letters (Avg)</th>
                      <th className="px-2 py-1 border-b">Std Dev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuraStats.map(sura => (
                      <tr 
                        key={sura.Sura} 
                        className={`cursor-pointer hover:bg-blue-50 ${selectedSura === sura.Sura ? 'bg-blue-100' : ''}`}
                        onClick={() => setSelectedSura(sura.Sura)}
                      >
                        <td className="px-2 py-1 text-center">{sura.Sura}</td>
                        <td className="px-2 py-1 text-center">{sura.AvgManuscriptLetters}</td>
                        <td className="px-2 py-1 text-center">{sura.StdDeviation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="col-span-2 bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Sura {selectedSura} Statistics</h2>
              {selectedSuraData && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-medium">Total Entries:</span> {selectedSuraData.TotalEntries}</p>
                    <p><span className="font-medium">Complete Entries:</span> {selectedSuraData.CompleteEntries}</p>
                    <p><span className="font-medium">Avg. Manuscript Letters:</span> {selectedSuraData.AvgManuscriptLetters}</p>
                    <p><span className="font-medium">Avg. Reference Letters:</span> {selectedSuraData.AvgReferenceLetters}</p>
                    <p><span className="font-medium">Letter Difference:</span> {(selectedSuraData.AvgManuscriptLetters - selectedSuraData.AvgReferenceLetters).toFixed(2)}</p>
                    <p><span className="font-medium">Avg. Absolute Deviation:</span> {selectedSuraData.AvgAbsDeviation}</p>
                    <p><span className="font-medium">Standard Deviation:</span> {selectedSuraData.StdDeviation}</p>
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Manuscript', value: selectedSuraData.AvgManuscriptLetters },
                            { name: 'Reference', value: selectedSuraData.AvgReferenceLetters }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[0, 1].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value.toFixed(2), 'Letters']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">Verse Letter Counts in Sura {selectedSura}</h2>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b">Verse</th>
                    <th className="px-2 py-1 border-b">Avg Letters</th>
                    <th className="px-2 py-1 border-b">Reference Letters</th>
                    <th className="px-2 py-1 border-b">Difference</th>
                    <th className="px-2 py-1 border-b">Std Dev</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerseStats.map(verse => (
                    <tr key={`${verse.Sura}:${verse.Verse}`}>
                      <td className="px-2 py-1 text-center">{verse.Verse}</td>
                      <td className="px-2 py-1 text-center">{verse.AvgLetterCount}</td>
                      <td className="px-2 py-1 text-center">{verse.ReferenceLetterCount}</td>
                      <td className="px-2 py-1 text-center">{(verse.AvgLetterCount - verse.ReferenceLetterCount).toFixed(2)}</td>
                      <td className="px-2 py-1 text-center">{verse.StdDeviation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Verse Deviations in Sura {selectedSura}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredVerseStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Verse" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name === 'StdDeviation' ? 'Standard Deviation' : 'Mean Absolute Deviation']} />
                <Legend />
                <Bar dataKey="StdDeviation" name="Standard Deviation" fill="#8884d8" />
                <Bar dataKey="MeanAbsDeviation" name="Mean Absolute Deviation" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Manuscript Analysis Tab */}
      {activeTab === 'manuscripts' && (
        <div>
          <div className="mb-4">
            <select 
              className="w-full p-2 border rounded"
              value={selectedManuscript}
              onChange={(e) => setSelectedManuscript(e.target.value)}
            >
              {data.manuscriptStats.map(ms => (
                <option key={ms.Manuscript} value={ms.Manuscript}>
                  {ms.Manuscript}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">Manuscript Statistics</h2>
            {data.manuscriptStats.find(m => m.Manuscript === selectedManuscript) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-medium">Manuscript:</span> {selectedManuscript}</p>
                  <p><span className="font-medium">Total Entries:</span> {data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).TotalEntries}</p>
                  <p><span className="font-medium">Total Letters:</span> {data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).TotalManuscriptLetters}</p>
                  <p><span className="font-medium">Reference Letters:</span> {data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).TotalReferenceLetters}</p>
                  <p><span className="font-medium">Letter Difference:</span> {(data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).TotalManuscriptLetters - data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).TotalReferenceLetters)}</p>
                  <p><span className="font-medium">Avg. Absolute Deviation:</span> {data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).AverageAbsDeviation}</p>
                  <p><span className="font-medium">Standard Deviation:</span> {data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).StdDeviation}</p>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Manuscript', value: data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).TotalManuscriptLetters },
                          { name: 'Reference', value: data.manuscriptStats.find(m => m.Manuscript === selectedManuscript).TotalReferenceLetters }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[0, 1].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Letters']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Top 10 Deviations</h2>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border-b">Sura</th>
                      <th className="px-2 py-1 border-b">Verse</th>
                      <th className="px-2 py-1 border-b">Manuscript</th>
                      <th className="px-2 py-1 border-b">Reference</th>
                      <th className="px-2 py-1 border-b">Deviation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.letterStats
                      .filter(stat => stat.Manuscript === selectedManuscript && stat.AbsDeviation !== null)
                      .sort((a, b) => b.AbsDeviation - a.AbsDeviation)
                      .slice(0, 10)
                      .map(stat => (
                        <tr key={`${stat.Sura}:${stat.Verse}`}>
                          <td className="px-2 py-1 text-center">{stat.Sura}</td>
                          <td className="px-2 py-1 text-center">{stat.Verse}</td>
                          <td className="px-2 py-1 text-center">{stat.ManuscriptLetterCount}</td>
                          <td className="px-2 py-1 text-center">{stat.ReferenceLetterCount}</td>
                          <td className="px-2 py-1 text-center">{stat.Deviation > 0 ? `+${stat.Deviation}` : stat.Deviation}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold mb-2">Deviations by Sura</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={_.chain(data.letterStats)
                    .filter(item => item.Manuscript === selectedManuscript)
                    .groupBy('Sura')
                    .map((items, sura) => {
                      const deviations = items
                        .filter(i => i.Deviation !== null)
                        .map(i => Math.abs(i.Deviation));
                      
                      return {
                        Sura: parseInt(sura),
                        AverageDeviation: deviations.length > 0 
                          ? parseFloat((deviations.reduce((sum, d) => sum + d, 0) / deviations.length).toFixed(2))
                          : 0,
                        VerseCount: items.length
                      };
                    })
                    .sortBy('Sura')
                    .value()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Sura" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="AverageDeviation" name="Avg. Deviation" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      
      {/* New Disjointed Letters Tab */}
      {activeTab === 'disjointedLetters' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-medium">Select Sura</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedSura}
                onChange={(e) => setSelectedSura(parseInt(e.target.value))}
              >
                {Object.keys(disjointedLettersBySura).map(suraNumber => (
                  <option key={suraNumber} value={suraNumber}>
                    Sura {suraNumber} - {disjointedLettersBySura[suraNumber]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Select Manuscript</label>
              <select 
                className="w-full p-2 border rounded"
                value={selectedManuscript}
                onChange={(e) => setSelectedManuscript(e.target.value)}
              >
                {data.manuscriptStats.map(ms => (
                  <option key={ms.Manuscript} value={ms.Manuscript}>
                    {ms.Manuscript}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Disjointed Letters in Sura {selectedSura}: {selectedDisjointedLetters}
            </h2>
            
            <div className="flex flex-wrap gap-4 mb-4 justify-center">
              {selectedDisjointedLetters.split('').map((letter, index) => (
                <button
                  key={index}
                  className="px-6 py-3 text-2xl rounded border"
                  style={{
                    backgroundColor: highlightedLetterIndex === index ? 'rgba(255, 255, 0, 0.3)' : 'white',
                    color: letterColors[letter] || 'black',
                    borderColor: letterColors[letter] || 'black',
                    cursor: 'pointer'
                  }}
                  onClick={() => highlightLetter(index)}
                >
                  {letter}
                  <span className="block text-sm mt-1">
                    {disjointedLetterCounts[letter] || 0} occurrences
                  </span>
                </button>
              ))}
              {selectedDisjointedLetters && (
                <>
                  <button
                    className="px-6 py-3 text-lg rounded border"
                    style={{
                      backgroundColor: highlightedLetterIndex === -1 ? 'rgba(255, 255, 0, 0.3)' : 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() => highlightLetter(-1)}
                  >
                    Show All
                  </button>
                  <button
                    className="px-6 py-3 text-lg rounded border"
                    style={{
                      backgroundColor: !showHighlighting ? 'rgba(255, 255, 0, 0.3)' : 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowHighlighting(!showHighlighting)}
                  >
                    {showHighlighting ? 'Hide Highlighting' : 'Show Highlighting'}
                  </button>
                </>
              )}
            </div>
            
            <div className="bg-gray-100 p-3 rounded mb-4 text-center">
              <p className="text-sm">
                Click on a letter above to highlight its occurrences. Use "Show All" to highlight all letters, or "Hide Highlighting" to view text without highlighting.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Verse by Verse Comparison</h3>
              
              <div
                className="overflow-y-auto max-h-[30rem]"
                style={{ direction: 'rtl' }}
              >
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="px-2 py-1 text-center border-r" rowSpan="2">Verse</th>
                      <th className="px-2 py-1 text-center border-r" colSpan="2">Text</th>
                      {selectedDisjointedLetters.split('').map((letter, index) => (
                        <th 
                          key={`header-letter-${letter}`} 
                          className="px-2 py-1 text-center border-r"
                          style={{ color: letterColors[letter] || 'inherit' }}
                          colSpan="2"
                        >
                          {letter}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b bg-gray-100">
                      <th className="px-2 py-1 text-center border-r">Reference</th>
                      <th className="px-2 py-1 text-center border-r">Manuscript</th>
                      {selectedDisjointedLetters.split('').map((letter) => (
                        <React.Fragment key={`header-counts-${letter}`}>
                          <th 
                            className="px-2 py-1 text-center"
                            style={{ color: letterColors[letter] || 'inherit' }}
                          >
                            Ref
                          </th>
                          <th 
                            className="px-2 py-1 text-center border-r"
                            style={{ color: letterColors[letter] || 'inherit' }}
                          >
                            Ms
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVerseStats.map(verse => {
                      const refKey = `${verse.Sura}:${verse.Verse}`;
                      const refText = referenceTexts[refKey] || '';
                      
                      // Find the corresponding manuscript verse
                      const manuscriptVerse = filteredManuscriptVerses.find(
                        mv => mv.Verse === verse.Verse
                      );
                      const manuscriptText = manuscriptVerse ? manuscriptVerse.Text : '';
                      
                      return (
                        <tr key={`verse-${verse.Sura}:${verse.Verse}`} className="border-b">
                          <td className="px-2 py-3 text-center align-top border-r">
                            <div className="text-gray-600">{verse.Verse}</div>
                          </td>
                          <td className="px-2 py-3 text-right align-top border-r">
                            <div className="text-lg">
                              {getHighlightedText(refText, selectedDisjointedLetters)}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right align-top border-r">
                            <div className="text-lg">
                              {getHighlightedText(manuscriptText, selectedDisjointedLetters)}
                            </div>
                          </td>
                          {selectedDisjointedLetters.split('').map((letter) => {
                            // Count the occurrences of this letter
                            const refCount = countLetterInText(refText, letter);
                            const msCount = countLetterInText(manuscriptText, letter);
                            const hasDifference = refCount !== msCount;
                            
                            return (
                              <React.Fragment key={`letter-counts-${letter}-${verse.Verse}`}>
                                <td 
                                  className="px-2 py-3 text-center align-top"
                                  style={{ 
                                    color: letterColors[letter] || 'inherit',
                                    backgroundColor: hasDifference ? `${letterColors[letter]}20` : 'transparent',
                                    fontWeight: hasDifference ? 'bold' : 'normal'
                                  }}
                                >
                                  {refCount}
                                </td>
                                <td 
                                  className="px-2 py-3 text-center align-top border-r"
                                  style={{ 
                                    color: letterColors[letter] || 'inherit',
                                    backgroundColor: hasDifference ? `${letterColors[letter]}20` : 'transparent',
                                    fontWeight: hasDifference ? 'bold' : 'normal'
                                  }}
                                >
                                  {msCount}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Add sum row at the bottom */}
                    <tr className="border-b bg-gray-100 font-bold">
                      <td className="px-2 py-3 text-center align-top border-r">
                        Total
                      </td>
                      <td className="px-2 py-3 text-center align-top border-r" colSpan="2">
                        Letter Counts
                      </td>
                      {selectedDisjointedLetters.split('').map((letter) => {
                        // Calculate sum of all reference counts for this letter
                        const refSum = filteredVerseStats.reduce((sum, verse) => {
                          const refKey = `${verse.Sura}:${verse.Verse}`;
                          const refText = referenceTexts[refKey] || '';
                          return sum + countLetterInText(refText, letter);
                        }, 0);
                        
                        // Calculate sum of all manuscript counts for this letter
                        const msSum = filteredManuscriptVerses.reduce((sum, verse) => {
                          return sum + countLetterInText(verse.Text || '', letter);
                        }, 0);
                        
                        return (
                          <React.Fragment key={`letter-sums-${letter}`}>
                            <td 
                              className="px-2 py-3 text-center align-top"
                              style={{ color: letterColors[letter] || 'inherit' }}
                            >
                              {refSum}
                            </td>
                            <td 
                              className="px-2 py-3 text-center align-top border-r"
                              style={{ color: letterColors[letter] || 'inherit' }}
                            >
                              {msSum}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Color Legend</h3>
              <div className="flex flex-wrap gap-3">
                {selectedDisjointedLetters.split('').map((letter, index) => (
                  <div 
                    key={index}
                    className="px-3 py-1 rounded"
                    style={{ backgroundColor: letterColors[letter] + '30', color: letterColors[letter] }}
                  >
                    {letter} - {letterColors[letter]}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Statistics</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p><span className="font-medium">Total Disjointed Letters:</span> {selectedDisjointedLetters.length}</p>
                  <p><span className="font-medium">Total Occurrences in Reference Text:</span> {
                    Object.values(disjointedLetterCounts).reduce((total, count) => total + count, 0)
                  }</p>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <h4 className="font-medium p-3 bg-gray-100 border-b">Letter Distribution Statistics</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="px-6 py-3 text-center border-r">Letter</th>
                          <th className="px-6 py-3 text-center border-r">Mean</th>
                          <th className="px-6 py-3 text-center border-r">Mode</th>
                          <th className="px-6 py-3 text-center">Max Value (Manuscript)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const letterStats = calculateLetterStats(selectedSura);
                          return Object.entries(letterStats).map(([letter, stats]) => (
                            <tr key={`letter-stats-${letter}`} className="border-b">
                              <td 
                                className="px-6 py-3 text-center font-bold border-r"
                                style={{ color: letterColors[letter] || 'inherit' }}
                              >
                                {letter}
                              </td>
                              <td className="px-6 py-3 text-center border-r">{stats.mean}</td>
                              <td className="px-6 py-3 text-center border-r">
                                {stats.mode} <span className="text-gray-500 text-sm">(occurs {stats.modeCount} times)</span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className="font-bold">{stats.max}</span> 
                                <span className="text-gray-500 text-sm ml-2">
                                  ({stats.maxManuscript && stats.maxManuscript.length > 15 
                                    ? `${stats.maxManuscript.substring(0, 15)}...` 
                                    : stats.maxManuscript})
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <h4 className="font-medium p-3 bg-gray-100 border-b">Letter Distribution Across Manuscripts</h4>
                  {(() => {
                    // Calculate data only once
                    const manuscriptData = countDisjointedLettersAcrossManuscripts(selectedSura);
                    
                    return (
                      manuscriptData.chartData.length > 0 && manuscriptData.manuscripts.length > 0 ? (
                        <div className="p-3">
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart 
                              data={manuscriptData.chartData}
                              layout="vertical"
                              margin={{left: 50}}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="letter" width={50} />
                              <Tooltip />
                              <Legend />
                              {manuscriptData.manuscripts.map((manuscript, index) => (
                                <Bar 
                                  key={manuscript} 
                                  dataKey={manuscript} 
                                  name={manuscript.length > 20 ? manuscript.substring(0, 20) + '...' : manuscript}
                                  fill={COLORS[index % COLORS.length]} 
                                  stackId="stack" 
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="p-3">No manuscript data available for this sura.</p>
                      )
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuranManuscriptAnalysis; 

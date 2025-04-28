import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      console.log("Attempting to fetch Excel file...");
      const response = await fetch('/quran_manuscript.xlsx');
      console.log("Fetch response:", response);
      
      if (!response.ok) {
        console.error("Fetch failed with status:", response.status);
        throw new Error(`Could not load Excel file (${response.status})`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
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
      
      // Process the data and prepare for visualization
      const processedData = processQuranData(rawData);
      setData(processedData);
      
      if (processedData.manuscriptStats.length > 0) {
        setSelectedManuscript(processedData.manuscriptStats[0].Manuscript);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error details:", error);
      setLoadError(error.message || 'Failed to load manuscript data');
      setLoading(false);
    }
  };

  // Function to count Arabic letters (excluding spaces, diacritics, etc.)
  const countArabicLetters = (text) => {
    if (!text || typeof text !== 'string') return 0;
    
    // Remove asterisks, spaces, and common diacritics - fixed escape character
    const cleanText = text.replace(/[*\s\u064B-\u0652]/g, '');
    return cleanText.length;
  };

  // Rest of your component code remains the same
  // ...
  
  const processQuranData = (rawData) => {
    // 1. Group by Sura and Verse to create reference texts
    const groupedBySuraVerse = _.groupBy(rawData, row => `${row.Sura}:${row.Verse}`);
    
    // 2. For each Sura:Verse, find the most complete text version as reference
    const refTexts = {};
    
    for (const [key, group] of Object.entries(groupedBySuraVerse)) {
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
    
    setReferenceTexts(refTexts);
    
    // Rest of the processQuranData function...
    // Keep all the existing code here
    
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
        ManuscriptLetterCount: manuscriptLetterCount,
        ReferenceLetterCount: referenceLetterCount,
        Deviation: deviation,
        AbsDeviation: deviation !== null ? Math.abs(deviation) : null,
        AsteriskCount: asteriskCount,
        IsComplete: asteriskCount === 0
      });
    }
    
    // Continue with the rest of your existing processing code...
    // 4, 5, 6... sections should remain unchanged
    
    // Return the existing result object
    return {
      suraStats: /* your existing code */,
      verseStats: /* your existing code */,
      manuscriptStats: /* your existing code */,
      letterStats,
      originalData: rawData
    };
  };
  
  // Include all your UI rendering code as it is...
  
  // If loading, show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl font-semibold">Loading Quranic manuscript data...</div>
      </div>
    );
  }
  
  // If there's an error, show error state
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
            </ul>
            <p className="mt-4">
              Place the file in the <code className="bg-gray-100 px-1 rounded">public</code> folder and refresh the page.
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
  
  // Main UI rendering
  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4 text-center">Quranic Manuscript Letter Count Analysis</h1>
      
      {/* Tab navigation */}
      <div className="flex mb-4 border-b overflow-x-auto">
        <button 
          className={`px-4 py-2 mr-2 ${activeTab === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
          onClick={() => setActiveTab('summary')}
        >
          Statistical Summary
        </button>
        {/* Other tab buttons... */}
      </div>
      
      {/* Tab content sections... */}
    </div>
  );
};

export default QuranManuscriptAnalysis;

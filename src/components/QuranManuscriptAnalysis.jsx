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
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedSura, setSelectedSura] = useState(1);
  const [selectedManuscript, setSelectedManuscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [referenceTexts, setReferenceTexts] = useState({});

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("Attempting to fetch Excel file...");
      const response = await fetch('/quran_manuscript.xlsx');
      console.log("Fetch response:", response);
      
      if (!response.ok) {
        console.error("Fetch failed with status:", response.status);
        throw new Error(`Could not load Excel file (${response.status})`);
      }
      const excelData = await response.arrayBuffer();
      
      const workbook = XLSX.read(excelData, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });

      const sheet = workbook.Sheets["manuscript_data"];
      const rawData = XLSX.utils.sheet_to_json(sheet);
      
      // Process the data and prepare for visualization
      const processedData = processQuranData(rawData);
      setData(processedData);
      
      if (processedData.manuscriptStats.length > 0) {
        setSelectedManuscript(processedData.manuscriptStats[0].Manuscript);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error details:", error);
      setLoading(false);
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
        const referenceLetterCount = verseEntries[0].ReferenceLetterCount;
        
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl font-semibold">Loading Quranic manuscript data...</div>
      </div>
    );
  }

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
          className={`px-4 py-2 ${activeTab === 'verses' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
          onClick={() => setActiveTab('verses')}
        >
          Verse Details
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
            <h2 className="text-lg font-semibold mb-2">Top 10 Manuscripts by Deviation</h2>
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
            <h2 className="text-lg font-semibold mb-2">Verse Comparison in Sura {selectedSura}</h2>
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
    </div>
  );
};

export default QuranManuscriptAnalysis;
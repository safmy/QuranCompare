import React from 'react';
import './App.css';
import QuranManuscriptAnalysis from './components/QuranManuscriptAnalysis';

function App() {
  return (
    <div className="App">
      <header style={{backgroundColor: "#282c34", padding: "20px", color: "white"}}>
        <h1 style={{fontSize: "24px", fontWeight: "bold"}}>Quranic Manuscript Analysis</h1>
      </header>
      <main style={{padding: "20px"}}>
        <QuranManuscriptAnalysis />
      </main>
      <footer style={{padding: "20px", backgroundColor: "#282c34", color: "white", textAlign: "center"}}>
        <p>© 2025 Quranic Manuscript Analysis</p>
      </footer>
    </div>
  );
}

export default App;

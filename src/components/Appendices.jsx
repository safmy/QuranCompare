import React, { useState, useEffect } from 'react';
import './Appendices.css';

const Appendices = () => {
  const [localPDFs, setLocalPDFs] = useState({});
  
  const appendices = [
    { number: 1, title: "One of the Great Miracles", url: "https://www.masjidtucson.org/quran/appendices/appendix1.html" },
    { number: 2, title: "God's Messenger of the Covenant", url: "https://www.masjidtucson.org/quran/appendices/appendix2.html" },
    { number: 3, title: "We Made the Quran Easy", url: "https://www.masjidtucson.org/quran/appendices/appendix3.html" },
    { number: 4, title: "Why Was the Quran Revealed in Arabic?", url: "https://www.masjidtucson.org/quran/appendices/appendix4.html" },
    { number: 5, title: "The Quran's Common Denominator", url: "https://www.masjidtucson.org/quran/appendices/appendix5.html" },
    { number: 6, title: "Greatest Criterion", url: "https://www.masjidtucson.org/quran/appendices/appendix6.html" },
    { number: 7, title: "The Miracle of the Quran", url: "https://www.masjidtucson.org/quran/appendices/appendix7.html" },
    { number: 8, title: "The Myth of Intercession", url: "https://www.masjidtucson.org/quran/appendices/appendix8.html" },
    { number: 9, title: "Abraham: Founder of Islam", url: "https://www.masjidtucson.org/quran/appendices/appendix9.html" },
    { number: 10, title: "The Day of Resurrection", url: "https://www.masjidtucson.org/quran/appendices/appendix10.html" },
    { number: 11, title: "God's Usage of the Plural", url: "https://www.masjidtucson.org/quran/appendices/appendix11.html" },
    { number: 12, title: "Role of the Prophet Muhammad", url: "https://www.masjidtucson.org/quran/appendices/appendix12.html" },
    { number: 13, title: "The First Pillar of Islam", url: "https://www.masjidtucson.org/quran/appendices/appendix13.html" },
    { number: 14, title: "The Contact Prayers (Salat)", url: "https://www.masjidtucson.org/quran/appendices/appendix14.html" },
    { number: 15, title: "The Obligatory Charity (Zakat)", url: "https://www.masjidtucson.org/quran/appendices/appendix15.html" },
    { number: 16, title: "Dietary Prohibitions", url: "https://www.masjidtucson.org/quran/appendices/appendix16.html" },
    { number: 17, title: "Death", url: "https://www.masjidtucson.org/quran/appendices/appendix17.html" },
    { number: 18, title: "Quran: The Ultimate Reference", url: "https://www.masjidtucson.org/quran/appendices/appendix18.html" },
    { number: 19, title: "Hadith & Sunna: Satan's Hypocritical Inventions", url: "https://www.masjidtucson.org/quran/appendices/appendix19.html" },
    { number: 20, title: "Quran: Unlike Any Other Book", url: "https://www.masjidtucson.org/quran/appendices/appendix20.html" },
    { number: 21, title: "Satan's Clever Trick", url: "https://www.masjidtucson.org/quran/appendices/appendix21.html" },
    { number: 22, title: "Jesus", url: "https://www.masjidtucson.org/quran/appendices/appendix22.html" },
    { number: 23, title: "Mathematical Coding of the Quran", url: "https://www.masjidtucson.org/quran/appendices/appendix23.html" },
    { number: 24, title: "Tampering With the Word of God", url: "https://www.masjidtucson.org/quran/appendices/appendix24.html" },
    { number: 25, title: "The End of the World", url: "https://www.masjidtucson.org/quran/appendices/appendix25.html" },
    { number: 26, title: "The Three Messengers of Islam", url: "https://www.masjidtucson.org/quran/appendices/appendix26.html" },
    { number: 27, title: "Muhammad's Household", url: "https://www.masjidtucson.org/quran/appendices/appendix27.html" },
    { number: 28, title: "The Age of 40", url: "https://www.masjidtucson.org/quran/appendices/appendix28.html" },
    { number: 29, title: "The Missing Basmalah", url: "https://www.masjidtucson.org/quran/appendices/appendix29.html" },
    { number: 30, title: "Messengers vs. Prophets", url: "https://www.masjidtucson.org/quran/appendices/appendix30.html" },
    { number: 31, title: "Chronological Order of Revelation", url: "https://www.masjidtucson.org/quran/appendices/appendix31.html" },
    { number: 32, title: "God's Usage of the Plural", url: "https://www.masjidtucson.org/quran/appendices/appendix32.html" },
    { number: 33, title: "Why Did God Send a Messenger Now?", url: "https://www.masjidtucson.org/quran/appendices/appendix33.html" },
    { number: 34, title: "Virginity", url: "https://www.masjidtucson.org/quran/appendices/appendix34.html" },
    { number: 35, title: "Drugs & Alcohol", url: "https://www.masjidtucson.org/quran/appendices/appendix35.html" },
    { number: 36, title: "What Price A Great Nation", url: "https://www.masjidtucson.org/quran/appendices/appendix36.html" },
    { number: 37, title: "The Crucial Age of 40", url: "https://www.masjidtucson.org/quran/appendices/appendix37.html" },
    { number: 38, title: "19 - The Creator's Signature", url: "https://www.masjidtucson.org/quran/appendices/appendix38.html" }
  ];
  
  // Check for local PDFs on component mount
  useEffect(() => {
    const checkLocalPDFs = async () => {
      try {
        // Check for complete appendices PDF
        const completeResponse = await fetch('/appendices/appendices_complete.pdf', { method: 'HEAD' });
        if (completeResponse.ok) {
          setLocalPDFs(prev => ({ ...prev, complete: true }));
        }
        
        // Check for individual appendix PDFs
        for (const appendix of appendices) {
          const paddedNumber = appendix.number.toString().padStart(2, '0');
          const filename = `appendix_${paddedNumber}.pdf`;
          
          try {
            const response = await fetch(`/appendices/${filename}`, { method: 'HEAD' });
            if (response.ok) {
              setLocalPDFs(prev => ({ ...prev, [appendix.number]: filename }));
            }
          } catch (e) {
            // PDF not available locally
          }
        }
        
        // Check for metadata
        const metadataResponse = await fetch('/appendices/metadata.json');
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          console.log('Appendices metadata:', metadata);
        }
      } catch (error) {
        console.log('Error checking for local PDFs:', error);
      }
    };
    
    checkLocalPDFs();
  }, []);

  const handleAppendixClick = (e, appendix) => {
    // If local PDF is available, prevent default and open PDF
    if (localPDFs[appendix.number]) {
      e.preventDefault();
      const paddedNumber = appendix.number.toString().padStart(2, '0');
      window.open(`/appendices/appendix_${paddedNumber}.pdf`, '_blank');
    }
    // Otherwise, let the default link behavior happen
  };

  return (
    <div className="appendices-container">
      <div className="appendices-header">
        <h4>📚 Appendices</h4>
        <p className="appendices-description">
          Essential references for understanding the Final Testament
        </p>
        <div className="discord-invite">
          <a href="https://discord.gg/submission" target="_blank" rel="noopener noreferrer" className="discord-link">
            💬 Join our Discord Community
          </a>
        </div>
        
        {localPDFs.complete && (
          <div className="complete-pdf-download">
            <a 
              href="/appendices/appendices_complete.pdf" 
              download="Quran_Appendices_Complete.pdf"
              className="download-complete-link"
            >
              📥 Download All Appendices (PDF)
            </a>
          </div>
        )}
      </div>

      <div className="appendices-list">
        {appendices.map((appendix) => (
          <div key={appendix.number} className="appendix-item-wrapper">
            <a
              href={appendix.url}
              target="_blank"
              rel="noopener noreferrer"
              className="appendix-item"
              onClick={(e) => handleAppendixClick(e, appendix)}
            >
              <div className="appendix-number">
                {appendix.number}
              </div>
              <div className="appendix-content">
                <h5 className="appendix-title">{appendix.title}</h5>
                <p className="appendix-preview">
                  {appendix.number === 1 && "Mathematical proof of divine authorship"}
                  {appendix.number === 2 && "The prophesied messenger after Muhammad"}
                  {appendix.number === 5 && "The miraculous mathematical code"}
                  {appendix.number === 19 && "Exposing fabricated religious sources"}
                  {appendix.number === 38 && "The significance of number 19"}
                </p>
              </div>
              <div className="appendix-arrow">
                {localPDFs[appendix.number] ? '📄' : '🔗'}
              </div>
            </a>
            
            {localPDFs[appendix.number] && (
              <div className="appendix-actions">
                <button
                  className="pdf-button view-button"
                  onClick={() => {
                    const paddedNumber = appendix.number.toString().padStart(2, '0');
                    window.open(`/appendices/appendix_${paddedNumber}.pdf`, '_blank');
                  }}
                  title="View PDF"
                >
                  👁️
                </button>
                <a
                  href={`/appendices/appendix_${appendix.number.toString().padStart(2, '0')}.pdf`}
                  download={`Appendix_${appendix.number}_${appendix.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  className="pdf-button download-button"
                  title="Download PDF"
                >
                  💾
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Appendices;
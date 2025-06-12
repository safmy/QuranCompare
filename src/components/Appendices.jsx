import React, { useState, useEffect } from 'react';
import './Appendices.css';

const Appendices = () => {
  const [localPDFs, setLocalPDFs] = useState({});
  
  const appendices = [
    { number: 1, title: "One of the Great Miracles", preview: "Mathematical proof of divine authorship of the Quran" },
    { number: 2, title: "God's Messenger of the Covenant", preview: "The prophesied messenger to come after Muhammad" },
    { number: 3, title: "We Made the Quran Easy", preview: "God's promise to facilitate understanding of the Quran" },
    { number: 4, title: "Why Was the Quran Revealed in Arabic?", preview: "The significance of Arabic as the language of revelation" },
    { number: 5, title: "The Quran's Common Denominator", preview: "The miraculous mathematical code based on number 19" },
    { number: 6, title: "Greatness of God", preview: "God's greatness is far beyond human comprehension" },
    { number: 7, title: "Why Were We Created?", preview: "We are here due to a horrendous crime" },
    { number: 8, title: "The Myth of Intercession", preview: "Exposing the false doctrine of intercession" },
    { number: 9, title: "Abraham: Original Messenger of Islam", preview: "One of the prevalent myths is that Muhammad was the founder of Islam..." },
    { number: 10, title: "God's Usage of the Plural Tense", preview: "Whenever the first person plural form is used by the Almighty, it invariably indicates participation of other entities, such as the angels..." },
    { number: 11, title: "The Day of Resurrection", preview: "The earth will shine with the light of God (39:69) as He comes to our universe, together with the angels (89:22)..." },
    { number: 12, title: "Role of the Prophet Muhammad", preview: "The Prophet's sole mission was to deliver Quran, the whole Quran, and nothing but Quran (3:20; 5:48-50, 5:92, 5:99; 6:19; 13:40; 16:35, 16:82; 24:54; 29:18; 42:48; 64:12)..." },
    { number: 13, title: "The First Pillar of Islam", preview: "Verse 3:18 states the First Pillar of Islam (Submission): 'God bears witness that there is no other god besides Him, and so do the angels and those who possess knowledge.'..." },
    { number: 14, title: "Predestination", preview: "God fully knows what kind of decision each of us is destined to make; He knows which of us are going to Heaven and which are going to Hell..." },
    { number: 15, title: "Religious Duties: Gift from God", preview: "When Abraham implored God in 14:40, he did not ask for wealth or health; the gift he implored for was: 'Please God, make me one who observes the contact prayers (Salat).'..." },
    { number: 16, title: "Dietary Prohibition", preview: "The Quran teaches that God is extremely displeased with those who prohibit anything that was not specifically prohibited in the Quran (16:112-116)..." },
    { number: 17, title: "Death", preview: "At the moment of death, everyone knows his or her destiny; Heaven or Hell..." },
    { number: 18, title: "Quran: The Ultimate Reference", preview: "God's final scripture to humanity" },
    { number: 19, title: "Hadith & Sunna: Satan's Hypocritical Inventions", preview: "Exposing fabricated religious sources" },
    { number: 20, title: "Quran: Unlike Any Other Book", preview: "The unique characteristics of the divine scripture" },
    { number: 21, title: "Satan's Clever Trick", preview: "How Satan misleads people away from God's truth" },
    { number: 22, title: "Jesus", preview: "The truth about Jesus in the Quran" },
    { number: 23, title: "Mathematical Coding of the Quran", preview: "Detailed analysis of the mathematical miracle" },
    { number: 24, title: "Tampering With the Word of God", preview: "The two false verses exposed" },
    { number: 25, title: "The End of the World", preview: "Prophecies and signs of the end times" },
    { number: 26, title: "The Three Messengers of Islam", preview: "Abraham, Muhammad, and Rashad" },
    { number: 27, title: "Who Is Your God?", preview: "Your god is whoever or whatever occupies your mind most of the time" },
    { number: 28, title: "The Age of 40", preview: "The significance of age 40 in God's system" },
    { number: 29, title: "The Missing Basmalah", preview: "The mystery of Sura 9's missing opening" },
    { number: 30, title: "Messengers vs. Prophets", preview: "The distinction between messengers and prophets" },
    { number: 31, title: "Chronological Order of Revelation", preview: "The order in which the Quran was revealed" },
    { number: 32, title: "God's Usage of the Plural", preview: "When God uses 'We' in the Quran" },
    { number: 33, title: "Why Did God Send a Messenger Now?", preview: "The timing of God's final messenger" },
    { number: 34, title: "Virginity", preview: "Islamic perspective on virginity and marriage" },
    { number: 35, title: "Drugs & Alcohol", preview: "Intoxicants and their prohibition" },
    { number: 36, title: "What Price A Great Nation", preview: "Lessons from history about nations' rise and fall" },
    { number: 37, title: "The Crucial Age of 40", preview: "Why 40 is the age of spiritual maturity" },
    { number: 38, title: "19 - The Creator's Signature", preview: "The significance of number 19 in the Quran" }
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
      // Open PDF in new tab for reading (not download)
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
      </div>

      <div className="appendices-grid">
        {appendices.map((appendix) => (
          <a
            key={appendix.number}
            href={localPDFs[appendix.number] ? `/appendices/appendix_${appendix.number.toString().padStart(2, '0')}.pdf` : `https://www.masjidtucson.org/quran/appendices/appendix${appendix.number}.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="appendix-card"
          >
            <h3 className="appendix-card-title">
              {appendix.number}. {appendix.title} →
            </h3>
            <p className="appendix-card-preview">
              {appendix.preview}
            </p>
          </a>
        ))}
      </div>

      <div className="appendices-footer">
        <div className="download-section">
          <h5>Downloads & PDFs</h5>
          <p>Download appendices for offline reading</p>
        </div>
        <div className="discord-section">
          <a href="https://discord.gg/submission" target="_blank" rel="noopener noreferrer" className="discord-link">
            💬 Join our Discord Community
          </a>
        </div>
      </div>
    </div>
  );
};

export default Appendices;
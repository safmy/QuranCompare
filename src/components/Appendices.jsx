import React from 'react';
import './Appendices.css';

const Appendices = () => {
  const appendices = [
    { number: 1, title: "One of the Great Miracles", url: "https://www.wikisubmission.org/appendices/appendix-1" },
    { number: 2, title: "God's Messenger of the Covenant", url: "https://www.wikisubmission.org/appendices/appendix-2" },
    { number: 3, title: "We Made the Quran Easy", url: "https://www.wikisubmission.org/appendices/appendix-3" },
    { number: 4, title: "Why Was the Quran Revealed in Arabic?", url: "https://www.wikisubmission.org/appendices/appendix-4" },
    { number: 5, title: "The Quran's Common Denominator", url: "https://www.wikisubmission.org/appendices/appendix-5" },
    { number: 6, title: "Greatest Criterion", url: "https://www.wikisubmission.org/appendices/appendix-6" },
    { number: 7, title: "The Miracle of the Quran", url: "https://www.wikisubmission.org/appendices/appendix-7" },
    { number: 8, title: "The Myth of Intercession", url: "https://www.wikisubmission.org/appendices/appendix-8" },
    { number: 9, title: "Abraham: Founder of Islam", url: "https://www.wikisubmission.org/appendices/appendix-9" },
    { number: 10, title: "The Day of Resurrection", url: "https://www.wikisubmission.org/appendices/appendix-10" },
    { number: 11, title: "God's Usage of the Plural", url: "https://www.wikisubmission.org/appendices/appendix-11" },
    { number: 12, title: "Role of the Prophet Muhammad", url: "https://www.wikisubmission.org/appendices/appendix-12" },
    { number: 13, title: "The First Pillar of Islam", url: "https://www.wikisubmission.org/appendices/appendix-13" },
    { number: 14, title: "The Contact Prayers (Salat)", url: "https://www.wikisubmission.org/appendices/appendix-14" },
    { number: 15, title: "The Obligatory Charity (Zakat)", url: "https://www.wikisubmission.org/appendices/appendix-15" },
    { number: 16, title: "Dietary Prohibitions", url: "https://www.wikisubmission.org/appendices/appendix-16" },
    { number: 17, title: "Death", url: "https://www.wikisubmission.org/appendices/appendix-17" },
    { number: 18, title: "Quran: The Ultimate Reference", url: "https://www.wikisubmission.org/appendices/appendix-18" },
    { number: 19, title: "Hadith & Sunna: Satan's Hypocritical Inventions", url: "https://www.wikisubmission.org/appendices/appendix-19" },
    { number: 20, title: "Quran: Unlike Any Other Book", url: "https://www.wikisubmission.org/appendices/appendix-20" },
    { number: 21, title: "Satan's Clever Trick", url: "https://www.wikisubmission.org/appendices/appendix-21" },
    { number: 22, title: "Jesus", url: "https://www.wikisubmission.org/appendices/appendix-22" },
    { number: 23, title: "Mathematical Coding of the Quran", url: "https://www.wikisubmission.org/appendices/appendix-23" },
    { number: 24, title: "Tampering With the Word of God", url: "https://www.wikisubmission.org/appendices/appendix-24" },
    { number: 25, title: "The End of the World", url: "https://www.wikisubmission.org/appendices/appendix-25" },
    { number: 26, title: "The Three Messengers of Islam", url: "https://www.wikisubmission.org/appendices/appendix-26" },
    { number: 27, title: "Muhammad's Household", url: "https://www.wikisubmission.org/appendices/appendix-27" },
    { number: 28, title: "The Age of 40", url: "https://www.wikisubmission.org/appendices/appendix-28" },
    { number: 29, title: "The Missing Basmalah", url: "https://www.wikisubmission.org/appendices/appendix-29" },
    { number: 30, title: "Messengers vs. Prophets", url: "https://www.wikisubmission.org/appendices/appendix-30" },
    { number: 31, title: "Chronological Order of Revelation", url: "https://www.wikisubmission.org/appendices/appendix-31" },
    { number: 32, title: "God's Usage of the Plural", url: "https://www.wikisubmission.org/appendices/appendix-32" },
    { number: 33, title: "Why Did God Send a Messenger Now?", url: "https://www.wikisubmission.org/appendices/appendix-33" },
    { number: 34, title: "Virginity", url: "https://www.wikisubmission.org/appendices/appendix-34" },
    { number: 35, title: "Drugs & Alcohol", url: "https://www.wikisubmission.org/appendices/appendix-35" },
    { number: 36, title: "What Price A Great Nation", url: "https://www.wikisubmission.org/appendices/appendix-36" },
    { number: 37, title: "The Crucial Age of 40", url: "https://www.wikisubmission.org/appendices/appendix-37" },
    { number: 38, title: "19 - The Creator's Signature", url: "https://www.wikisubmission.org/appendices/appendix-38" }
  ];

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
      </div>

      <div className="appendices-list">
        {appendices.map((appendix) => (
          <a
            key={appendix.number}
            href={appendix.url}
            target="_blank"
            rel="noopener noreferrer"
            className="appendix-item"
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
            <div className="appendix-arrow">→</div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Appendices;
#!/usr/bin/env python3
"""
Download all appendices PDFs from quraniclabs.com or wikisubmission.org
and prepare them for local hosting in the QuranCompare app.
"""

import os
import time
import requests
import json
from urllib.parse import urljoin, urlparse

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "appendices")
PDF_SOURCES = {
    "main": "https://www.quraniclabs.com/appendices/Appendices.pdf",
    "individual": [
        # Add individual appendix PDF URLs if available
    ],
    "wikisubmission": [
        # Alternative sources from wikisubmission.org
        "https://docs.wikisubmission.org/library/books/quran-the-final-testament-introduction",
        "https://docs.wikisubmission.org/library/books/quran-hadith-and-islam",
        "https://docs.wikisubmission.org/library/books/visual-presentation-of-the-miracle",
        "https://docs.wikisubmission.org/library/books/the-computer-speaks"
    ]
}

# Appendices metadata (matching the component)
APPENDICES_METADATA = [
    {"number": 1, "title": "One of the Great Miracles", "filename": "appendix_01_one_of_the_great_miracles.pdf"},
    {"number": 2, "title": "God's Messenger of the Covenant", "filename": "appendix_02_gods_messenger_of_the_covenant.pdf"},
    {"number": 3, "title": "We Made the Quran Easy", "filename": "appendix_03_we_made_the_quran_easy.pdf"},
    {"number": 4, "title": "Why Was the Quran Revealed in Arabic?", "filename": "appendix_04_why_was_the_quran_revealed_in_arabic.pdf"},
    {"number": 5, "title": "The Quran's Common Denominator", "filename": "appendix_05_the_qurans_common_denominator.pdf"},
    {"number": 6, "title": "Greatest Criterion", "filename": "appendix_06_greatest_criterion.pdf"},
    {"number": 7, "title": "The Miracle of the Quran", "filename": "appendix_07_the_miracle_of_the_quran.pdf"},
    {"number": 8, "title": "The Myth of Intercession", "filename": "appendix_08_the_myth_of_intercession.pdf"},
    {"number": 9, "title": "Abraham: Founder of Islam", "filename": "appendix_09_abraham_founder_of_islam.pdf"},
    {"number": 10, "title": "The Day of Resurrection", "filename": "appendix_10_the_day_of_resurrection.pdf"},
    {"number": 11, "title": "God's Usage of the Plural", "filename": "appendix_11_gods_usage_of_the_plural.pdf"},
    {"number": 12, "title": "Role of the Prophet Muhammad", "filename": "appendix_12_role_of_the_prophet_muhammad.pdf"},
    {"number": 13, "title": "The First Pillar of Islam", "filename": "appendix_13_the_first_pillar_of_islam.pdf"},
    {"number": 14, "title": "The Contact Prayers (Salat)", "filename": "appendix_14_the_contact_prayers_salat.pdf"},
    {"number": 15, "title": "The Obligatory Charity (Zakat)", "filename": "appendix_15_the_obligatory_charity_zakat.pdf"},
    {"number": 16, "title": "Dietary Prohibitions", "filename": "appendix_16_dietary_prohibitions.pdf"},
    {"number": 17, "title": "Death", "filename": "appendix_17_death.pdf"},
    {"number": 18, "title": "Quran: The Ultimate Reference", "filename": "appendix_18_quran_the_ultimate_reference.pdf"},
    {"number": 19, "title": "Hadith & Sunna: Satan's Hypocritical Inventions", "filename": "appendix_19_hadith_sunna_satans_hypocritical_inventions.pdf"},
    {"number": 20, "title": "Quran: Unlike Any Other Book", "filename": "appendix_20_quran_unlike_any_other_book.pdf"},
    {"number": 21, "title": "Satan's Clever Trick", "filename": "appendix_21_satans_clever_trick.pdf"},
    {"number": 22, "title": "Jesus", "filename": "appendix_22_jesus.pdf"},
    {"number": 23, "title": "Mathematical Coding of the Quran", "filename": "appendix_23_mathematical_coding_of_the_quran.pdf"},
    {"number": 24, "title": "Tampering With the Word of God", "filename": "appendix_24_tampering_with_the_word_of_god.pdf"},
    {"number": 25, "title": "The End of the World", "filename": "appendix_25_the_end_of_the_world.pdf"},
    {"number": 26, "title": "The Three Messengers of Islam", "filename": "appendix_26_the_three_messengers_of_islam.pdf"},
    {"number": 27, "title": "Muhammad's Household", "filename": "appendix_27_muhammads_household.pdf"},
    {"number": 28, "title": "The Age of 40", "filename": "appendix_28_the_age_of_40.pdf"},
    {"number": 29, "title": "The Missing Basmalah", "filename": "appendix_29_the_missing_basmalah.pdf"},
    {"number": 30, "title": "Messengers vs. Prophets", "filename": "appendix_30_messengers_vs_prophets.pdf"},
    {"number": 31, "title": "Chronological Order of Revelation", "filename": "appendix_31_chronological_order_of_revelation.pdf"},
    {"number": 32, "title": "God's Usage of the Plural", "filename": "appendix_32_gods_usage_of_the_plural.pdf"},
    {"number": 33, "title": "Why Did God Send a Messenger Now?", "filename": "appendix_33_why_did_god_send_a_messenger_now.pdf"},
    {"number": 34, "title": "Virginity", "filename": "appendix_34_virginity.pdf"},
    {"number": 35, "title": "Drugs & Alcohol", "filename": "appendix_35_drugs_alcohol.pdf"},
    {"number": 36, "title": "What Price A Great Nation", "filename": "appendix_36_what_price_a_great_nation.pdf"},
    {"number": 37, "title": "The Crucial Age of 40", "filename": "appendix_37_the_crucial_age_of_40.pdf"},
    {"number": 38, "title": "19 - The Creator's Signature", "filename": "appendix_38_19_the_creators_signature.pdf"}
]

def create_directories():
    """Create necessary directories for storing PDFs"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Created output directory: {OUTPUT_DIR}")

def download_file(url, filepath):
    """Download a file from URL to filepath"""
    try:
        print(f"Downloading: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, stream=True, timeout=30)
        response.raise_for_status()
        
        # Save the file
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        print(f"Successfully downloaded to: {filepath}")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def download_main_appendices():
    """Download the main appendices PDF"""
    main_pdf_path = os.path.join(OUTPUT_DIR, "appendices_complete.pdf")
    
    # Try primary source
    if download_file(PDF_SOURCES["main"], main_pdf_path):
        return True
    
    # Try alternative sources
    for alt_url in PDF_SOURCES["wikisubmission"]:
        if download_file(alt_url, main_pdf_path):
            return True
    
    return False

def generate_metadata_json():
    """Generate metadata JSON file for the appendices"""
    metadata = {
        "appendices": APPENDICES_METADATA,
        "pdf_base_path": "/appendices/",
        "complete_pdf": "appendices_complete.pdf",
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_count": len(APPENDICES_METADATA)
    }
    
    metadata_path = os.path.join(OUTPUT_DIR, "metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"Generated metadata file: {metadata_path}")
    return metadata_path

def update_appendices_component():
    """Generate an updated Appendices component that uses local PDFs"""
    component_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                  "src", "components", "AppendicesLocal.jsx")
    
    component_content = """import React, { useState, useEffect } from 'react';
import './Appendices.css';

const AppendicesLocal = () => {
  const [appendices, setAppendices] = useState([]);
  const [pdfAvailable, setPdfAvailable] = useState({});

  useEffect(() => {
    // Load appendices metadata
    fetch('/appendices/metadata.json')
      .then(res => res.json())
      .then(data => {
        setAppendices(data.appendices);
        
        // Check which PDFs are available
        const availability = {};
        data.appendices.forEach(appendix => {
          // Check if individual PDF exists
          fetch(`/appendices/${appendix.filename}`, { method: 'HEAD' })
            .then(res => {
              availability[appendix.number] = res.ok;
              setPdfAvailable({...availability});
            })
            .catch(() => {
              availability[appendix.number] = false;
              setPdfAvailable({...availability});
            });
        });
      })
      .catch(err => {
        console.error('Failed to load appendices metadata:', err);
        // Fallback to hardcoded data
        setAppendices([
""" + json.dumps(APPENDICES_METADATA, indent=10) + """
        ]);
      });
  }, []);

  const handleAppendixClick = (appendix) => {
    // First try local PDF
    if (pdfAvailable[appendix.number]) {
      window.open(`/appendices/${appendix.filename}`, '_blank');
    } else {
      // Try complete PDF
      window.open('/appendices/appendices_complete.pdf', '_blank');
    }
  };

  const fallbackToOnline = (appendix) => {
    // Fallback to online version
    window.open(`https://www.wikisubmission.org/appendices/appendix-${appendix.number}`, '_blank');
  };

  return (
    <div className="appendices-container">
      <div className="appendices-header">
        <h4>📚 Appendices</h4>
        <p className="appendices-description">
          Essential references for understanding the Final Testament
        </p>
        <div className="pdf-download-section">
          <a 
            href="/appendices/appendices_complete.pdf" 
            className="download-all-btn"
            download
          >
            📥 Download All Appendices (PDF)
          </a>
        </div>
        <div className="discord-invite">
          <a href="https://discord.gg/submission" target="_blank" rel="noopener noreferrer" className="discord-link">
            💬 Join our Discord Community
          </a>
        </div>
      </div>

      <div className="appendices-list">
        {appendices.map((appendix) => (
          <div
            key={appendix.number}
            className="appendix-item"
            onClick={() => handleAppendixClick(appendix)}
            style={{ cursor: 'pointer' }}
          >
            <div className="appendix-number">
              {appendix.number}
            </div>
            <div className="appendix-content">
              <h5 className="appendix-title">{appendix.title}</h5>
              <div className="appendix-actions">
                {pdfAvailable[appendix.number] && (
                  <span className="pdf-badge">📄 PDF</span>
                )}
                <button 
                  className="online-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    fallbackToOnline(appendix);
                  }}
                >
                  🌐 View Online
                </button>
              </div>
            </div>
            <div className="appendix-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppendicesLocal;
"""
    
    with open(component_path, 'w', encoding='utf-8') as f:
        f.write(component_content)
    
    print(f"Generated local appendices component: {component_path}")
    return component_path

def update_css_for_local_appendices():
    """Add CSS styles for the local appendices component"""
    css_additions = """
/* Local Appendices Styles */
.pdf-download-section {
  margin: 15px 0;
  text-align: center;
}

.download-all-btn {
  display: inline-block;
  padding: 10px 20px;
  background-color: #4a90e2;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.download-all-btn:hover {
  background-color: #357abd;
}

.appendix-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 5px;
}

.pdf-badge {
  font-size: 0.9em;
  color: #4a90e2;
}

.online-link {
  font-size: 0.85em;
  color: #666;
  background: none;
  border: 1px solid #ddd;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.online-link:hover {
  color: #4a90e2;
  border-color: #4a90e2;
}
"""
    
    css_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                            "src", "components", "Appendices.css")
    
    # Read existing CSS
    existing_css = ""
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            existing_css = f.read()
    
    # Check if styles already added
    if "Local Appendices Styles" not in existing_css:
        with open(css_path, 'a', encoding='utf-8') as f:
            f.write("\n" + css_additions)
        print(f"Updated CSS file: {css_path}")

def main():
    """Main function to download and prepare appendices"""
    print("Starting appendices PDF download and setup...")
    
    # Create directories
    create_directories()
    
    # Download main appendices PDF
    print("\nDownloading main appendices PDF...")
    if download_main_appendices():
        print("✓ Successfully downloaded main appendices PDF")
    else:
        print("✗ Failed to download main appendices PDF")
    
    # Generate metadata
    print("\nGenerating metadata...")
    generate_metadata_json()
    
    # Update components
    print("\nUpdating React components...")
    update_appendices_component()
    update_css_for_local_appendices()
    
    print("\n✅ Setup complete!")
    print(f"\nPDFs are stored in: {OUTPUT_DIR}")
    print("\nTo use the local appendices:")
    print("1. Import AppendicesLocal instead of Appendices in SidebarMenu.jsx")
    print("2. The PDFs will be served from the /public/appendices directory")
    print("3. Users can download the complete PDF or view individual appendices")

if __name__ == "__main__":
    main()
import React, { useState, useEffect } from 'react';
import QiblaDirection from './QiblaDirection';
import PrayerTimes from './PrayerTimes';
import Appendices from './Appendices';
import './SidebarMenu.css';

const SidebarMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleSection = (section) => {
    if (activeSection === section) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.sidebar-menu')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* Modern Hamburger Menu Button */}
      <button 
        className={`hamburger-button ${isOpen ? 'open' : ''}`} 
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Sidebar Menu */}
      <div className={`sidebar-menu ${isOpen ? 'open' : ''} ${activeSection === 'appendices' ? 'expanded' : ''}`}>
        <div className="sidebar-header">
          <h3>Tools</h3>
          <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="sidebar-content">
          {/* Qibla Direction Section */}
          <div className="sidebar-section">
            <div 
              className="sidebar-section-header"
              onClick={() => toggleSection('qibla')}
            >
              <span className="section-icon">🧭</span>
              <span className="section-title">Qibla Direction</span>
              <span className={`toggle-icon ${activeSection === 'qibla' ? 'open' : ''}`}>▼</span>
            </div>
            {activeSection === 'qibla' && (
              <div className="sidebar-section-content">
                <QiblaDirection />
              </div>
            )}
          </div>

          {/* Prayer Times Section */}
          <div className="sidebar-section">
            <div 
              className="sidebar-section-header"
              onClick={() => toggleSection('prayer')}
            >
              <span className="section-icon">🕌</span>
              <span className="section-title">Prayer Times</span>
              <span className={`toggle-icon ${activeSection === 'prayer' ? 'open' : ''}`}>▼</span>
            </div>
            {activeSection === 'prayer' && (
              <div className="sidebar-section-content">
                <PrayerTimes />
              </div>
            )}
          </div>

          {/* Appendices Section */}
          <div className="sidebar-section">
            <div 
              className="sidebar-section-header"
              onClick={() => toggleSection('appendices')}
            >
              <span className="section-icon">📚</span>
              <span className="section-title">Appendices</span>
              <span className={`toggle-icon ${activeSection === 'appendices' ? 'open' : ''}`}>▼</span>
            </div>
            {activeSection === 'appendices' && (
              <div className="sidebar-section-content">
                <Appendices />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

export default SidebarMenu;
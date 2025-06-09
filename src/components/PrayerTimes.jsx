import React, { useState, useEffect } from 'react';
import './PrayerTimes.css';

const PrayerTimes = () => {
  const [location, setLocation] = useState(null);
  const [cityName, setCityName] = useState('');
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualCity, setManualCity] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timezone, setTimezone] = useState('UTC');

  // Calculate sun times using the same logic as Discord bot
  const calculateSunTimes = (lat, lon, date, timezone) => {
    // Convert date to Julian day number
    const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
    const y = date.getFullYear() + 4800 - a;
    const m = (date.getMonth() + 1) + 12 * a - 3;
    const jdn = date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
                Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    // Calculate sun position
    const n = jdn - 2451545.0 + 0.0008;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
    const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;

    // Calculate equation of time
    const E = 4 * (L - 0 - ((Math.atan2(Math.tan(lambda), Math.cos(23.44 * Math.PI / 180))) * 180 / Math.PI));
    
    // Solar declination
    const delta = Math.asin(Math.sin(23.44 * Math.PI / 180) * Math.sin(lambda));

    // Hour angle calculations
    const latRad = lat * Math.PI / 180;
    
    // Calculate sunrise/sunset hour angle
    const cosOmegaSunset = -Math.tan(latRad) * Math.tan(delta);
    let omega_sunset = null;
    
    if (Math.abs(cosOmegaSunset) <= 1) {
      omega_sunset = Math.acos(cosOmegaSunset);
    }
    
    // Calculate dawn/dusk with astronomical twilight (18 degrees below horizon)
    const astronomicalAngle = -18 * Math.PI / 180;
    const nauticalAngle = -12 * Math.PI / 180;
    const civilAngle = -6 * Math.PI / 180;
    
    let omega_dawn = null;
    let twilightType = 'ASTRONOMICAL';
    
    // Try astronomical twilight first (18 degrees)
    const cosOmegaAstronomical = (Math.sin(astronomicalAngle) - Math.sin(latRad) * Math.sin(delta)) / 
                                  (Math.cos(latRad) * Math.cos(delta));
    
    if (Math.abs(cosOmegaAstronomical) <= 1) {
      omega_dawn = Math.acos(cosOmegaAstronomical);
    } else {
      // Try nautical twilight (12 degrees)
      const cosOmegaNautical = (Math.sin(nauticalAngle) - Math.sin(latRad) * Math.sin(delta)) / 
                               (Math.cos(latRad) * Math.cos(delta));
      
      if (Math.abs(cosOmegaNautical) <= 1) {
        omega_dawn = Math.acos(cosOmegaNautical);
        twilightType = 'NAUTICAL';
      } else {
        // Try civil twilight (6 degrees)
        const cosOmegaCivil = (Math.sin(civilAngle) - Math.sin(latRad) * Math.sin(delta)) / 
                              (Math.cos(latRad) * Math.cos(delta));
        
        if (Math.abs(cosOmegaCivil) <= 1) {
          omega_dawn = Math.acos(cosOmegaCivil);
          twilightType = 'CIVIL';
        } else {
          twilightType = 'CONTINUOUS_TWILIGHT';
        }
      }
    }

    // Calculate times in decimal hours
    const noon = 12 - E / 60 - lon / 15;
    
    let sunrise = null;
    let sunset = null;
    let dawn = null;
    let dusk = null;
    let afternoon = null;
    
    if (omega_sunset !== null) {
      sunrise = noon - omega_sunset * 12 / Math.PI;
      sunset = noon + omega_sunset * 12 / Math.PI;
      
      // Calculate afternoon (Asr) as the exact midpoint between noon and sunset
      afternoon = noon + (sunset - noon) / 2;
    }
    
    if (omega_dawn !== null) {
      dawn = noon - omega_dawn * 12 / Math.PI;
      dusk = noon + omega_dawn * 12 / Math.PI;
    }

    // Convert decimal hours to time strings
    const convertToTime = (decimalHours) => {
      if (decimalHours === null || isNaN(decimalHours)) return null;
      
      // Adjust for timezone offset from UTC
      const offset = getTimezoneOffset(timezone, date);
      decimalHours += offset;
      
      // Normalize to 24-hour range
      while (decimalHours < 0) decimalHours += 24;
      while (decimalHours >= 24) decimalHours -= 24;
      
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    return {
      dawn: convertToTime(dawn),
      sunrise: convertToTime(sunrise),
      noon: convertToTime(noon),
      afternoon: convertToTime(afternoon),
      sunset: convertToTime(sunset),
      dusk: convertToTime(dusk),
      twilightType: twilightType
    };
  };

  // Get timezone offset in hours
  const getTimezoneOffset = (timezone, date) => {
    try {
      // Handle UTC+X format
      if (timezone.startsWith('UTC')) {
        const match = timezone.match(/UTC([+-]?\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
        return 0;
      }
      
      // For IANA timezone names, use proper timezone conversion
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      return (tzDate - utcDate) / (1000 * 60 * 60);
    } catch (error) {
      console.error('Invalid timezone:', timezone, error);
      return 0; // Default to UTC if invalid
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        
        // Get timezone
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(tz);
        
        // Try to get city name using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown Location';
          setCityName(city);
        } catch (e) {
          setCityName('Your Location');
        }

        // Calculate prayer times
        const times = calculateSunTimes(latitude, longitude, selectedDate, tz);
        setPrayerTimes(times);
        setLoading(false);
      },
      (error) => {
        setError('Unable to retrieve your location. Please enter a city manually.');
        setLoading(false);
      }
    );
  };

  // Search for city coordinates
  const searchCity = async () => {
    if (!manualCity.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualCity)}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setLocation({ lat: parseFloat(lat), lon: parseFloat(lon) });
        setCityName(display_name.split(',')[0]);
        
        // Use browser timezone as it's more reliable than estimating
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detectedTimezone);
        
        // Calculate prayer times
        const times = calculateSunTimes(parseFloat(lat), parseFloat(lon), selectedDate, detectedTimezone);
        setPrayerTimes(times);
      } else {
        setError('City not found. Please try another name.');
      }
    } catch (e) {
      setError('Error searching for city. Please try again.');
    }
    
    setLoading(false);
  };

  // Update prayer times when date changes
  useEffect(() => {
    if (location && timezone) {
      const times = calculateSunTimes(location.lat, location.lon, selectedDate, timezone);
      setPrayerTimes(times);
    }
  }, [selectedDate, location, timezone]);

  // Initial location fetch
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="prayer-times-container">
      <div className="prayer-times-header">
        <h4>Prayer Times (Sun-based)</h4>
        <p className="prayer-description">
          Based on sun positions with Islamic prayer names
        </p>
      </div>

      {/* Location Input */}
      <div className="location-input">
        <input
          type="text"
          placeholder="Enter city name..."
          value={manualCity}
          onChange={(e) => setManualCity(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchCity()}
        />
        <button onClick={searchCity} className="search-button">
          Search
        </button>
        <button onClick={getCurrentLocation} className="location-button" title="Use current location">
          📍
        </button>
      </div>

      {/* Date Selector */}
      <div className="date-selector">
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="date-input"
        />
      </div>

      {loading && <div className="loading">Loading prayer times...</div>}
      
      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {prayerTimes && !loading && (
        <div className="prayer-times-display">
          <div className="current-location">
            <p className="city-name">{cityName}</p>
            {location && (
              <p className="coordinates">
                {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
              </p>
            )}
          </div>

          <div className="times-grid">
            <div className="time-item">
              <span className="time-label">Dawn (Fajr)</span>
              <span className="time-value">{prayerTimes.dawn || '--:--'}</span>
            </div>
            <div className="time-item">
              <span className="time-label">Sunrise</span>
              <span className="time-value">{prayerTimes.sunrise || '--:--'}</span>
            </div>
            <div className="time-item">
              <span className="time-label">Noon (Dhuhr)</span>
              <span className="time-value">{prayerTimes.noon || '--:--'}</span>
            </div>
            <div className="time-item">
              <span className="time-label">Afternoon (Asr)</span>
              <span className="time-value">{prayerTimes.afternoon || '--:--'}</span>
            </div>
            <div className="time-item">
              <span className="time-label">Sunset (Maghrib)</span>
              <span className="time-value">{prayerTimes.sunset || '--:--'}</span>
            </div>
            <div className="time-item">
              <span className="time-label">Night (Isha)</span>
              <span className="time-value">{prayerTimes.dusk || '--:--'}</span>
            </div>
          </div>

          {prayerTimes.twilightType && (
            <div className="twilight-info">
              <small>Twilight: {prayerTimes.twilightType}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrayerTimes;
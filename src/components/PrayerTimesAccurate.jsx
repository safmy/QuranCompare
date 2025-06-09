import React, { useState, useEffect } from 'react';
import './PrayerTimes.css';

const PrayerTimesAccurate = () => {
  const [location, setLocation] = useState(null);
  const [cityName, setCityName] = useState('');
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualCity, setManualCity] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timezone, setTimezone] = useState('UTC');
  const [localTime, setLocalTime] = useState('');

  // Update local time display
  useEffect(() => {
    const updateLocalTime = () => {
      if (location && timezone) {
        const now = new Date();
        const options = {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        setLocalTime(now.toLocaleTimeString('en-US', options));
      }
    };

    updateLocalTime();
    const interval = setInterval(updateLocalTime, 1000);
    return () => clearInterval(interval);
  }, [location, timezone]);

  // More accurate sun position calculations based on NOAA algorithms
  const calculateSunTimes = (lat, lon, date, timezone) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    // Julian date calculation
    const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
    const y = date.getFullYear() + 4800 - a;
    const m = (date.getMonth() + 1) + 12 * a - 3;
    const jd = date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
                Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    
    // Century
    const T = (jd - 2451545) / 36525;
    
    // Mean longitude of the sun
    const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
    
    // Mean anomaly of the sun
    const M = toRad((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360);
    
    // Eccentricity of Earth's orbit
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    
    // Equation of center
    const C = toDeg((2 * e - e * e * e / 4) * Math.sin(M) +
                    (5 * e * e / 4) * Math.sin(2 * M) +
                    (13 * e * e * e / 12) * Math.sin(3 * M));
    
    // True longitude of the sun
    const trueLong = (L0 + C) % 360;
    
    // Obliquity of the ecliptic
    const epsilon = toRad(23.439 - 0.00000036 * T);
    
    // Right ascension
    const alpha = toDeg(Math.atan2(Math.cos(epsilon) * Math.sin(toRad(trueLong)), 
                                   Math.cos(toRad(trueLong))));
    
    // Declination
    const delta = Math.asin(Math.sin(epsilon) * Math.sin(toRad(trueLong)));
    
    // Equation of time (in minutes)
    const E = 4 * (L0 - alpha);
    
    // Solar noon
    const noon = 12 - E / 60 - lon / 15;
    
    // Hour angle calculations
    const latRad = toRad(lat);
    
    // Sunrise/Sunset
    const h0 = toRad(-0.833); // Standard solar altitude at sunrise/sunset
    const cosH0 = (Math.sin(h0) - Math.sin(latRad) * Math.sin(delta)) / 
                  (Math.cos(latRad) * Math.cos(delta));
    
    let sunrise = null;
    let sunset = null;
    
    if (Math.abs(cosH0) <= 1) {
      const H0 = toDeg(Math.acos(cosH0));
      sunrise = noon - H0 / 15;
      sunset = noon + H0 / 15;
    }
    
    // Dawn/Dusk calculations with different twilight angles
    const calculateTwilight = (angle) => {
      const h = toRad(angle);
      const cosH = (Math.sin(h) - Math.sin(latRad) * Math.sin(delta)) / 
                   (Math.cos(latRad) * Math.cos(delta));
      
      if (Math.abs(cosH) <= 1) {
        const H = toDeg(Math.acos(cosH));
        return {
          dawn: noon - H / 15,
          dusk: noon + H / 15
        };
      }
      return { dawn: null, dusk: null };
    };
    
    // Try different twilight angles
    let twilightResult = calculateTwilight(-18); // Astronomical
    let twilightType = 'ASTRONOMICAL';
    
    if (twilightResult.dawn === null) {
      twilightResult = calculateTwilight(-12); // Nautical
      twilightType = 'NAUTICAL';
      
      if (twilightResult.dawn === null) {
        twilightResult = calculateTwilight(-6); // Civil
        twilightType = 'CIVIL';
        
        if (twilightResult.dawn === null) {
          twilightType = 'CONTINUOUS';
        }
      }
    }
    
    // Asr calculation (Hanafi method)
    let afternoon = null;
    if (sunset !== null) {
      const shadowFactor = 1; // Shafi'i method (use 2 for Hanafi)
      const noonAltitude = 90 - Math.abs(lat - toDeg(delta));
      const asrAltitude = toDeg(Math.atan(1 / (shadowFactor + Math.tan(toRad(90 - noonAltitude)))));
      
      const cosHAsr = (Math.sin(toRad(asrAltitude)) - Math.sin(latRad) * Math.sin(delta)) / 
                      (Math.cos(latRad) * Math.cos(delta));
      
      if (Math.abs(cosHAsr) <= 1) {
        const HAsr = toDeg(Math.acos(cosHAsr));
        afternoon = noon + HAsr / 15;
      } else {
        // Fallback to midpoint
        afternoon = noon + (sunset - noon) / 2;
      }
    }
    
    // Convert to local time
    const convertToLocalTime = (decimalHours) => {
      if (decimalHours === null || isNaN(decimalHours)) return null;
      
      // Create a date object for the calculation day
      const calcDate = new Date(date);
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      
      // Set UTC time
      calcDate.setUTCHours(hours, minutes, 0, 0);
      
      // Convert to local timezone
      const localTimeStr = calcDate.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      return localTimeStr;
    };
    
    return {
      dawn: convertToLocalTime(twilightResult.dawn),
      sunrise: convertToLocalTime(sunrise),
      noon: convertToLocalTime(noon),
      afternoon: convertToLocalTime(afternoon),
      sunset: convertToLocalTime(sunset),
      dusk: convertToLocalTime(twilightResult.dusk),
      twilightType: twilightType,
      timezone: timezone
    };
  };

  // Get timezone offset in hours
  const getTimezoneOffset = (timezone, date) => {
    try {
      // For IANA timezone names
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      return (tzDate - utcDate) / (1000 * 60 * 60);
    } catch (error) {
      console.error('Invalid timezone:', timezone, error);
      return 0;
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
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        setLocation({ lat: latitude, lon: longitude });
        setCityName(display_name.split(',')[0]);
        
        // Get timezone for the location using a timezone API
        try {
          const tzResponse = await fetch(
            `https://api.timezonedb.com/v2.1/get-time-zone?key=YOUR_API_KEY&format=json&by=position&lat=${latitude}&lng=${longitude}`
          );
          
          if (tzResponse.ok) {
            const tzData = await tzResponse.json();
            setTimezone(tzData.zoneName || Intl.DateTimeFormat().resolvedOptions().timeZone);
          } else {
            // Fallback to browser timezone
            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
          }
        } catch (e) {
          // Use browser timezone as fallback
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
        
        // Calculate prayer times
        const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const times = calculateSunTimes(latitude, longitude, selectedDate, tz);
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
          Based on precise astronomical calculations
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
          style={{ minWidth: '150px' }}
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
            {localTime && (
              <p className="coordinates">
                Local Time: {localTime} ({timezone})
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

export default PrayerTimesAccurate;
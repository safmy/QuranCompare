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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Calculate sun times matching Discord bot's astral library logic
  const calculateSunTimes = (lat, lon, date, timezone) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    // Get day of year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Solar declination angle (simplified from astral library)
    const P = Math.asin(0.39779 * Math.cos(toRad(0.98565 * (dayOfYear - 173) + 1.914 * Math.sin(toRad(0.98565 * (dayOfYear - 2))))));
    
    // Or using the simpler formula from Discord bot
    const declination = toRad(23.45 * Math.sin(toRad(360 * (284 + dayOfYear) / 365)));

    // Equation of time (in minutes)
    const B = toRad(360 * (dayOfYear - 81) / 365);
    const E = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

    // Time correction factor
    const TC = 4 * lon + E;

    // Solar noon
    const solarNoon = 12 - TC / 60;

    // Convert latitude to radians
    const latRad = toRad(lat);

    // Helper function to calculate prayer time
    const calculatePrayerTime = (angle) => {
      const cosH = -Math.tan(latRad) * Math.tan(declination) + 
                   Math.sin(toRad(angle)) / (Math.cos(latRad) * Math.cos(declination));
      
      if (cosH > 1) return null; // Never rises (polar night)
      if (cosH < -1) return null; // Never sets (polar day)
      
      const H = toDeg(Math.acos(cosH));
      return H / 15; // Convert to hours
    };

    // Calculate times
    const sunriseOffset = calculatePrayerTime(-0.833); // Sunrise/sunset angle
    const fajrOffset = calculatePrayerTime(-18); // Astronomical twilight for Fajr
    const ishaOffset = calculatePrayerTime(-18); // Astronomical twilight for Isha

    // If astronomical twilight fails, try nautical (12°) then civil (6°)
    let actualFajrOffset = fajrOffset;
    let actualIshaOffset = ishaOffset;
    let twilightType = 'ASTRONOMICAL';

    if (!fajrOffset) {
      actualFajrOffset = calculatePrayerTime(-12);
      twilightType = 'NAUTICAL';
      if (!actualFajrOffset) {
        actualFajrOffset = calculatePrayerTime(-6);
        twilightType = 'CIVIL';
      }
    }

    if (!ishaOffset) {
      actualIshaOffset = calculatePrayerTime(-12);
      if (!actualIshaOffset) {
        actualIshaOffset = calculatePrayerTime(-6);
      }
    }

    // Calculate all prayer times
    const noon = solarNoon;
    const sunrise = sunriseOffset ? solarNoon - sunriseOffset : null;
    const sunset = sunriseOffset ? solarNoon + sunriseOffset : null;
    const fajr = actualFajrOffset ? solarNoon - actualFajrOffset : null;
    const isha = actualIshaOffset ? solarNoon + actualIshaOffset : null;
    
    // Asr calculation - exact midpoint between noon and sunset
    const asr = sunset ? noon + (sunset - noon) / 2 : null;

    // Convert to local time with proper timezone/DST handling
    const convertToLocalTime = (decimalHours) => {
      if (decimalHours === null || isNaN(decimalHours)) return null;
      
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      
      // Create a UTC date object for the calculation
      const utcDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        0,
        0
      ));
      
      // Format time in the target timezone
      const timeStr = utcDate.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      return timeStr;
    };

    return {
      dawn: convertToLocalTime(fajr),
      sunrise: convertToLocalTime(sunrise),
      noon: convertToLocalTime(noon),
      afternoon: convertToLocalTime(asr),
      sunset: convertToLocalTime(sunset),
      dusk: convertToLocalTime(isha),
      twilightType: twilightType
    };
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
        
        // Try to get timezone for the location
        let locationTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        try {
          // Use a free timezone service
          const tzResponse = await fetch(
            `https://timeapi.io/api/timezone/coordinate?latitude=${latitude}&longitude=${longitude}`
          );
          if (tzResponse.ok) {
            const tzData = await tzResponse.json();
            if (tzData.timeZone) {
              locationTimezone = tzData.timeZone;
            }
          }
        } catch (e) {
          console.log('Failed to fetch timezone, using browser default');
        }
        
        setTimezone(locationTimezone);
        
        // Calculate prayer times
        const times = calculateSunTimes(latitude, longitude, selectedDate, locationTimezone);
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

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format current time for the selected timezone
  const formatLocalTime = () => {
    if (!timezone || timezone === 'UTC') {
      return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
    
    try {
      return currentTime.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
  };

  return (
    <div className="prayer-times-container">
      <div className="prayer-times-header">
        <h4>Prayer Times</h4>
        <p className="prayer-description">
          Calculated using astronomical twilight angles
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
          style={{ minWidth: '100px' }}
        />
        <button onClick={searchCity} className="search-button">
          Search
        </button>
        <button onClick={getCurrentLocation} className="location-button" title="Use current location" style={{ minWidth: '45px', fontSize: '16px' }}>
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
              <>
                <p className="coordinates">
                  {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
                </p>
                <p className="coordinates">
                  Timezone: {timezone}
                </p>
                <p className="local-time">
                  Local Time: <strong>{formatLocalTime()}</strong>
                </p>
              </>
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
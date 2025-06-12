import React, { useState, useEffect, useCallback } from 'react';
import './PrayerTimes.css';

const PrayerTimesWithAlarmsIOS = () => {
  const [location, setLocation] = useState(null);
  const [cityName, setCityName] = useState('');
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualCity, setManualCity] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timezone, setTimezone] = useState('UTC');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Alarm states
  const [alarmSettings, setAlarmSettings] = useState(() => {
    const saved = localStorage.getItem('prayerAlarmSettings');
    return saved ? JSON.parse(saved) : {
      dawn: { enabled: false, beforeStart: 0, beforeEnd: 0 },
      sunrise: { enabled: false, beforeStart: 0, beforeEnd: 0 },
      noon: { enabled: false, beforeStart: 0, beforeEnd: 0 },
      afternoon: { enabled: false, beforeStart: 0, beforeEnd: 0 },
      sunset: { enabled: false, beforeStart: 0, beforeEnd: 0 },
      night: { enabled: false, beforeStart: 0, beforeEnd: 0 }
    };
  });
  
  const [activeAlarms, setActiveAlarms] = useState(new Set());

  // Play alarm sound
  const playAlarmSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSt7z/DWizYGGGS97OScTgwFSaHh8K1mIAg5k9nzzHkpBCh+yvLTgjsLF1+v5OidUgwGTajj8bFrIwUsjNbxx3knBipewOfvpVoOByRHqOPyrGYgBjuU1/TSgjYGFWi46+WfUg0JVqzn8axlIAU8mNzzz3woBCmC0fLRgjQHF2Sx6+egWg0AVKHR8a9oKAY4k9Lx03wqBSh+yO/XiTkJFl+05+ylVgwJS6Pi8bJtJQUuh9Tz2IM1Byxuy/fjjEANCFml4+2sYiEEOJbZ88p3KAUvedXy1oIyCxZdr+jzn1ILClOq5e+mYCEGPJvY88p7KAIofdLx2YgyBRxqwOzilEwLDU6p4+6pXx0IOpvc8sp0KgUme8cv2I4+Cirh5vOjVRMEUabb8K1pJAc6kM/vydksCyRz0+/jli0QI1+z6+6kVgoKTqfj8KxlIAg6lNXy0nkpBSh+yPDWhjcJHmux5+auWQ0DVKLR8a9oKAY4k9Lx03wqBSl+ye/UgDAJG2G56eiYUwwHT6Xh8bJuJQUyg8rx048+CwdWyuPmgTwSEEDB1/PId');
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  // Calculate sun times (same as original)
  const calculateSunTimes = (lat, lon, date, timezone) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    // Get day of year
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Solar declination angle
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
      
      if (cosH > 1) return null;
      if (cosH < -1) return null;
      
      const H = toDeg(Math.acos(cosH));
      return H / 15;
    };

    // Calculate times
    const sunriseOffset = calculatePrayerTime(-0.833);
    const fajrOffset = calculatePrayerTime(-18);
    const ishaOffset = calculatePrayerTime(-18);

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
    const asr = sunset ? noon + (sunset - noon) / 2 : null;

    // Convert to Date objects for easier alarm handling
    const convertToDateTime = (decimalHours) => {
      if (decimalHours === null || isNaN(decimalHours)) return null;
      
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes, 0, 0);
      return dateTime;
    };

    // Convert to local time string
    const convertToLocalTime = (decimalHours) => {
      if (decimalHours === null || isNaN(decimalHours)) return null;
      
      const hours = Math.floor(decimalHours);
      const minutes = Math.round((decimalHours - hours) * 60);
      
      const utcDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        0,
        0
      ));
      
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
      night: convertToLocalTime(isha),
      dusk: convertToLocalTime(isha), // Alias for compatibility
      twilightType: twilightType,
      // Also return DateTime objects for alarm checking
      times: {
        dawn: convertToDateTime(fajr),
        sunrise: convertToDateTime(sunrise),
        noon: convertToDateTime(noon),
        afternoon: convertToDateTime(asr),
        sunset: convertToDateTime(sunset),
        night: convertToDateTime(isha)
      }
    };
  };

  // Check alarms (simplified for iOS)
  const checkAlarms = useCallback(() => {
    if (!prayerTimes || !prayerTimes.times) return;
    
    const now = new Date();
    const nowTime = now.getHours() * 60 + now.getMinutes();
    
    Object.entries(prayerTimes.times).forEach(([prayerName, prayerTime]) => {
      if (!prayerTime || !alarmSettings[prayerName]?.enabled) return;
      
      const prayerMinutes = prayerTime.getHours() * 60 + prayerTime.getMinutes();
      const settings = alarmSettings[prayerName];
      
      // Check for alarms before start
      if (settings.beforeStart > 0) {
        const alarmTime = prayerMinutes - settings.beforeStart;
        const alarmKey = `${prayerName}-before-${settings.beforeStart}`;
        
        if (nowTime === alarmTime && !activeAlarms.has(alarmKey)) {
          playAlarmSound();
          setActiveAlarms(prev => new Set([...prev, alarmKey]));
        }
      }
      
      // Check for exact time alarm
      const exactKey = `${prayerName}-exact`;
      if (nowTime === prayerMinutes && !activeAlarms.has(exactKey)) {
        playAlarmSound();
        setActiveAlarms(prev => new Set([...prev, exactKey]));
      }
    });
    
    // Clear old alarms after a day
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      setActiveAlarms(new Set());
    }
  }, [prayerTimes, alarmSettings, activeAlarms]);

  // Update alarm settings
  const updateAlarmSettings = (prayer, field, value) => {
    const newSettings = {
      ...alarmSettings,
      [prayer]: {
        ...alarmSettings[prayer],
        [field]: value
      }
    };
    setAlarmSettings(newSettings);
    localStorage.setItem('prayerAlarmSettings', JSON.stringify(newSettings));
  };

  // Get user's current location (iOS optimized)
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Location services not available');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(tz);
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Current Location';
          setCityName(city);
        } catch (e) {
          setCityName('Current Location');
        }

        const times = calculateSunTimes(latitude, longitude, selectedDate, tz);
        setPrayerTimes(times);
        setLoading(false);
      },
      (error) => {
        setError('Unable to get location. Please enter a city manually.');
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 600000 // Accept cached position up to 10 minutes old
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
        
        const locationTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(locationTimezone);
        
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

  // Don't auto-fetch location on mount for iOS
  useEffect(() => {
    // Set default prompt
    setError('Tap 📍 to use your location or enter a city name');
  }, []);

  // Update current time and check alarms
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      checkAlarms();
    }, 1000);

    return () => clearInterval(timer);
  }, [checkAlarms]);

  // Format current time
  const formatLocalTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    });
  };

  return (
    <div className="prayer-times-container">
      <div className="prayer-times-header">
        <h4>Prayer Times & Alarms</h4>
        <p className="prayer-description">
          Set alarms for prayer times
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
      
      {error && !prayerTimes && (
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
                <p className="local-time">
                  Current Time: <strong>{formatLocalTime()}</strong>
                </p>
              </>
            )}
          </div>

          <div className="times-grid-with-alarms">
            {['dawn', 'sunrise', 'noon', 'afternoon', 'sunset', 'night'].map(prayer => {
              const labels = {
                dawn: 'Dawn (Fajr)',
                sunrise: 'Sunrise',
                noon: 'Noon (Dhuhr)',
                afternoon: 'Afternoon (Asr)',
                sunset: 'Sunset (Maghrib)',
                night: 'Night (Isha)'
              };
              
              return (
                <div key={prayer} className="time-item-with-alarm">
                  <div className="time-info">
                    <span className="time-label">{labels[prayer]}</span>
                    <span className="time-value">{prayerTimes[prayer] || '--:--'}</span>
                  </div>
                  
                  <div className="alarm-controls">
                    <label className="alarm-toggle">
                      <input
                        type="checkbox"
                        checked={alarmSettings[prayer].enabled}
                        onChange={(e) => updateAlarmSettings(prayer, 'enabled', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    
                    {alarmSettings[prayer].enabled && (
                      <div className="alarm-options">
                        <select
                          value={alarmSettings[prayer].beforeStart}
                          onChange={(e) => updateAlarmSettings(prayer, 'beforeStart', parseInt(e.target.value))}
                          style={{ fontSize: '0.85rem' }}
                        >
                          <option value="0">At prayer time</option>
                          <option value="10">10 min before</option>
                          <option value="15">15 min before</option>
                          <option value="20">20 min before</option>
                          <option value="30">30 min before</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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

export default PrayerTimesWithAlarmsIOS;
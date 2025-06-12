import React, { useState, useEffect, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import './PrayerTimes.css';

const PrayerTimesWithLocalNotifications = () => {
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
  
  const [notificationPermission, setNotificationPermission] = useState(false);

  // Request notification permission on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      requestNotificationPermission();
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      const result = await LocalNotifications.requestPermissions();
      setNotificationPermission(result.display === 'granted');
      
      if (result.display === 'granted') {
        console.log('Notification permission granted');
      } else {
        console.log('Notification permission denied');
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    }
  };

  // Schedule prayer notifications
  const schedulePrayerNotifications = async (times, settings) => {
    if (!Capacitor.isNativePlatform() || !notificationPermission) {
      console.log('Cannot schedule notifications');
      return;
    }

    try {
      // Cancel all existing notifications first
      await LocalNotifications.cancel({ notifications: await LocalNotifications.getPending() });

      const prayers = [
        { name: 'Dawn', time: times.dawn, setting: settings.dawn },
        { name: 'Sunrise', time: times.sunrise, setting: settings.sunrise },
        { name: 'Noon', time: times.noon, setting: settings.noon },
        { name: 'Afternoon', time: times.afternoon, setting: settings.afternoon },
        { name: 'Sunset', time: times.sunset, setting: settings.sunset },
        { name: 'Night', time: times.night, setting: settings.night }
      ];

      const notifications = [];
      
      for (const prayer of prayers) {
        if (prayer.setting.enabled && prayer.time) {
          const [hours, minutes] = prayer.time.split(':').map(Number);
          const prayerDate = new Date();
          prayerDate.setHours(hours, minutes, 0, 0);

          // Schedule notification before start
          if (prayer.setting.beforeStart > 0) {
            const beforeStartDate = new Date(prayerDate.getTime() - prayer.setting.beforeStart * 60000);
            if (beforeStartDate > new Date()) {
              notifications.push({
                title: `${prayer.name} Prayer Reminder`,
                body: `${prayer.name} prayer in ${prayer.setting.beforeStart} minutes`,
                id: notifications.length + 1,
                schedule: { at: beforeStartDate },
                sound: 'default',
                smallIcon: 'ic_launcher',
                actionTypeId: 'PRAYER_REMINDER',
                extra: {
                  prayer: prayer.name,
                  type: 'beforeStart'
                }
              });
            }
          }

          // Schedule notification at prayer time
          if (prayerDate > new Date()) {
            notifications.push({
              title: `${prayer.name} Prayer Time`,
              body: `It's time for ${prayer.name} prayer`,
              id: notifications.length + 1,
              schedule: { at: prayerDate },
              sound: 'default',
              smallIcon: 'ic_launcher',
              actionTypeId: 'PRAYER_TIME',
              extra: {
                prayer: prayer.name,
                type: 'prayerTime'
              }
            });
          }

          // Schedule notification before end
          if (prayer.setting.beforeEnd > 0) {
            // For simplicity, assume prayer duration is 30 minutes
            const endDate = new Date(prayerDate.getTime() + 30 * 60000);
            const beforeEndDate = new Date(endDate.getTime() - prayer.setting.beforeEnd * 60000);
            if (beforeEndDate > new Date()) {
              notifications.push({
                title: `${prayer.name} Prayer Ending Soon`,
                body: `${prayer.name} prayer time ending in ${prayer.setting.beforeEnd} minutes`,
                id: notifications.length + 1,
                schedule: { at: beforeEndDate },
                sound: 'default',
                smallIcon: 'ic_launcher',
                actionTypeId: 'PRAYER_ENDING',
                extra: {
                  prayer: prayer.name,
                  type: 'beforeEnd'
                }
              });
            }
          }
        }
      }

      // Schedule all notifications
      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        console.log(`Scheduled ${notifications.length} prayer notifications`);
      }
    } catch (e) {
      console.error('Failed to schedule notifications:', e);
    }
  };

  // Update notifications when prayer times or settings change
  useEffect(() => {
    if (prayerTimes && notificationPermission) {
      schedulePrayerNotifications(prayerTimes, alarmSettings);
    }
  }, [prayerTimes, alarmSettings, notificationPermission]);

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

    // Hour angle for sunrise/sunset
    const hourAngle = toDeg(Math.acos(-Math.tan(latRad) * Math.tan(declination)));

    // Sunrise and sunset times
    const sunrise = solarNoon - hourAngle / 15;
    const sunset = solarNoon + hourAngle / 15;

    // Format time
    const formatTime = (decimalHours) => {
      const totalMinutes = Math.round(decimalHours * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    return {
      sunrise: formatTime(sunrise),
      sunset: formatTime(sunset),
      noon: formatTime(solarNoon)
    };
  };

  // Calculate prayer times
  const calculatePrayerTimes = (lat, lon, date, timezone) => {
    const sunTimes = calculateSunTimes(lat, lon, date, timezone);
    
    // Parse times for calculations
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const formatMinutes = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const sunriseMinutes = parseTime(sunTimes.sunrise);
    const sunsetMinutes = parseTime(sunTimes.sunset);
    const noonMinutes = parseTime(sunTimes.noon);

    // Dawn: 1.5 hours before sunrise
    const dawnMinutes = sunriseMinutes - 90;

    // Afternoon: Noon + 5 minutes (to ensure sun has passed zenith)
    const afternoonMinutes = noonMinutes + 5;

    // Night: 1.5 hours after sunset
    const nightMinutes = sunsetMinutes + 90;

    return {
      dawn: formatMinutes(dawnMinutes),
      sunrise: sunTimes.sunrise,
      noon: sunTimes.noon,
      afternoon: formatMinutes(afternoonMinutes),
      sunset: sunTimes.sunset,
      night: formatMinutes(nightMinutes)
    };
  };

  // Get user location
  const getUserLocation = () => {
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
        
        // Calculate prayer times
        const times = calculatePrayerTimes(latitude, longitude, selectedDate, tz);
        setPrayerTimes(times);
        
        // Get city name using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown Location';
          setCityName(city);
        } catch (e) {
          setCityName('Your Location');
        }
        
        setLoading(false);
      },
      (error) => {
        setError('Unable to retrieve your location. Please check your permissions.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Handle manual city search
  const searchCity = async () => {
    if (!manualCity.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Search for city coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualCity)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLocation({ lat: parseFloat(lat), lon: parseFloat(lon) });
        setCityName(data[0].display_name.split(',')[0]);
        
        // Get timezone for the location (approximate)
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(tz);
        
        // Calculate prayer times
        const times = calculatePrayerTimes(parseFloat(lat), parseFloat(lon), selectedDate, tz);
        setPrayerTimes(times);
      } else {
        setError('City not found. Please try another search.');
      }
    } catch (e) {
      setError('Failed to search for city. Please try again.');
    }
    
    setLoading(false);
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check for current/next prayer
  const getCurrentAndNextPrayer = () => {
    if (!prayerTimes) return { current: null, next: null };

    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const prayers = [
      { name: 'Dawn', time: prayerTimes.dawn },
      { name: 'Sunrise', time: prayerTimes.sunrise },
      { name: 'Noon', time: prayerTimes.noon },
      { name: 'Afternoon', time: prayerTimes.afternoon },
      { name: 'Sunset', time: prayerTimes.sunset },
      { name: 'Night', time: prayerTimes.night }
    ];

    let current = null;
    let next = null;

    for (let i = 0; i < prayers.length; i++) {
      const [hours, minutes] = prayers[i].time.split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      
      if (now < prayerMinutes) {
        next = prayers[i];
        if (i > 0) {
          current = prayers[i - 1];
        }
        break;
      }
    }

    // If no next prayer found, next is dawn of tomorrow
    if (!next) {
      current = prayers[prayers.length - 1];
      next = prayers[0];
    }

    return { current, next };
  };

  // Auto-detect location on mount
  useEffect(() => {
    getUserLocation();
  }, []);

  // Recalculate prayer times when date changes
  useEffect(() => {
    if (location) {
      const times = calculatePrayerTimes(location.lat, location.lon, selectedDate, timezone);
      setPrayerTimes(times);
    }
  }, [selectedDate, location, timezone]);

  // Handle alarm toggle
  const toggleAlarm = (prayer, type) => {
    setAlarmSettings(prev => {
      const newSettings = {
        ...prev,
        [prayer]: {
          ...prev[prayer],
          enabled: !prev[prayer].enabled
        }
      };
      localStorage.setItem('prayerAlarmSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Handle alarm time change
  const updateAlarmTime = (prayer, type, value) => {
    setAlarmSettings(prev => {
      const newSettings = {
        ...prev,
        [prayer]: {
          ...prev[prayer],
          [type]: parseInt(value) || 0
        }
      };
      localStorage.setItem('prayerAlarmSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const { current, next } = getCurrentAndNextPrayer();

  return (
    <div className="prayer-times-container">
      <div className="prayer-header">
        <h3>Prayer Times</h3>
        <p className="location-info">
          {cityName && `${cityName} • `}
          {currentTime.toLocaleTimeString()}
        </p>
      </div>

      {!notificationPermission && Capacitor.isNativePlatform() && (
        <div className="notification-permission-banner">
          <p>Enable notifications to receive prayer time alarms</p>
          <button onClick={requestNotificationPermission}>Enable Notifications</button>
        </div>
      )}

      {loading && <div className="loading">Loading prayer times...</div>}
      
      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={getUserLocation} className="retry-button">
            Use Current Location
          </button>
        </div>
      )}

      <div className="location-search">
        <input
          type="text"
          placeholder="Enter city name..."
          value={manualCity}
          onChange={(e) => setManualCity(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchCity()}
        />
        <button onClick={searchCity}>Search</button>
      </div>

      <div className="date-selector">
        <button onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>
          ←
        </button>
        <span>{selectedDate.toLocaleDateString()}</span>
        <button onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>
          →
        </button>
      </div>

      {prayerTimes && (
        <>
          {current && next && (
            <div className="current-next-prayer">
              <div className="current-prayer">
                <span>Current:</span> {current.name}
              </div>
              <div className="next-prayer">
                <span>Next:</span> {next.name} at {next.time}
              </div>
            </div>
          )}

          <div className="prayer-times-list">
            {Object.entries({
              dawn: 'Dawn (Fajr)',
              sunrise: 'Sunrise',
              noon: 'Noon (Dhuhr)',
              afternoon: 'Afternoon (Asr)',
              sunset: 'Sunset (Maghrib)',
              night: 'Night (Isha)'
            }).map(([key, name]) => (
              <div key={key} className="prayer-time-item">
                <div className="prayer-info">
                  <span className="prayer-name">{name}</span>
                  <span className="prayer-time">{prayerTimes[key]}</span>
                </div>
                
                <div className="alarm-controls">
                  <label className="alarm-toggle">
                    <input
                      type="checkbox"
                      checked={alarmSettings[key].enabled}
                      onChange={() => toggleAlarm(key)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  
                  {alarmSettings[key].enabled && (
                    <div className="alarm-settings">
                      <label>
                        <span>Before:</span>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={alarmSettings[key].beforeStart}
                          onChange={(e) => updateAlarmTime(key, 'beforeStart', e.target.value)}
                        />
                        <span>min</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="calculation-note">
            <p>Prayer times calculated using sun position (shortest path method)</p>
            <p>Dawn: 1.5 hours before sunrise | Night: 1.5 hours after sunset</p>
          </div>
        </>
      )}
    </div>
  );
};

export default PrayerTimesWithLocalNotifications;
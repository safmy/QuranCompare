import React, { useState, useEffect } from 'react';
import './QiblaDirection.css';

const QiblaDirectionIOS = () => {
  const [location, setLocation] = useState(null);
  const [qiblaAngle, setQiblaAngle] = useState(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasCompass, setHasCompass] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [locationAttempted, setLocationAttempted] = useState(false);

  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;

  // Detect if running in simulator/development
  const isSimulator = () => {
    return navigator.userAgent.includes('Simulator') || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  };

  // Calculate Qibla direction using the shortest path (Great Circle)
  const calculateQibla = (userLat, userLon) => {
    // Convert to radians
    const lat1 = userLat * Math.PI / 180;
    const lat2 = KAABA_LAT * Math.PI / 180;
    const deltaLon = (KAABA_LON - userLon) * Math.PI / 180;

    // Calculate bearing using Great Circle formula
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - 
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    
    // Normalize to 0-360 degrees
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  // Load default location for simulator/fallback
  const loadDefaultLocation = () => {
    // Default to New York City
    const defaultLat = 40.7128;
    const defaultLon = -74.0060;
    const defaultCity = 'New York (Default)';
    
    setLocation({ lat: defaultLat, lon: defaultLon });
    const angle = calculateQibla(defaultLat, defaultLon);
    setQiblaAngle(angle);
    setError('Using default location. Enter a city for accurate Qibla direction.');
  };

  // Get user location
  const getUserLocation = () => {
    setLoading(true);
    setError(null);
    setLocationAttempted(true);

    // Check if we're in simulator
    if (isSimulator()) {
      setError('Location not available in simulator. Using default location.');
      loadDefaultLocation();
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported. Please enter a city manually.');
      setLoading(false);
      return;
    }

    // Set timeout for iOS
    const timeoutId = setTimeout(() => {
      setError('Location request timed out. Please enter a city manually.');
      loadDefaultLocation();
      setLoading(false);
    }, 5000); // 5 second timeout

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        const angle = calculateQibla(latitude, longitude);
        setQiblaAngle(angle);
        setError(null);
        setLoading(false);
        
        // Save to localStorage
        localStorage.setItem('savedQiblaLocation', JSON.stringify({
          lat: latitude,
          lon: longitude,
          city: 'Current Location'
        }));
      },
      (error) => {
        clearTimeout(timeoutId);
        console.log('Geolocation error:', error);
        
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable in Settings > Privacy > Location Services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Using default location.';
            loadDefaultLocation();
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or enter a city.';
            break;
          default:
            errorMessage = 'Unable to get location. Please enter a city manually.';
        }
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 600000 // Accept cached position up to 10 minutes old
      }
    );
  };

  // Search for city coordinates
  const searchCity = async () => {
    if (!manualCity.trim()) return;
    
    setLoading(true);
    setError(null);
    setLocationAttempted(true);

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
        const angle = calculateQibla(latitude, longitude);
        setQiblaAngle(angle);
        setError(null);
        
        // Save to localStorage
        localStorage.setItem('savedQiblaLocation', JSON.stringify({
          lat: latitude,
          lon: longitude,
          city: display_name.split(',')[0]
        }));
      } else {
        setError('City not found. Please try another name.');
      }
    } catch (e) {
      setError('Error searching for city. Please check your internet connection.');
    }
    
    setLoading(false);
  };

  // Handle compass heading (for mobile devices)
  useEffect(() => {
    const handleOrientation = (event) => {
      if (event.webkitCompassHeading) {
        // iOS
        setCompassHeading(event.webkitCompassHeading);
        setHasCompass(true);
      } else if (event.alpha) {
        // Android
        setCompassHeading((360 - event.alpha) % 360);
        setHasCompass(true);
      }
    };

    if (window.DeviceOrientationEvent) {
      // Request permission for iOS 13+
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(response => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Load saved location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('savedQiblaLocation');
    if (savedLocation) {
      try {
        const { lat, lon, city } = JSON.parse(savedLocation);
        setLocation({ lat, lon });
        const angle = calculateQibla(lat, lon);
        setQiblaAngle(angle);
        setLocationAttempted(true);
      } catch (e) {
        console.log('Failed to load saved location');
      }
    }
  }, []);

  const getCardinalDirection = (angle) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(angle / 45) % 8;
    return directions[index];
  };

  const getDirectionDescription = (angle) => {
    // For Americas, the Qibla is typically between 45-135 degrees (NE to SE)
    if (angle >= 45 && angle <= 135) {
      if (angle < 90) {
        return 'slightly north of east';
      } else if (angle > 90) {
        return 'slightly south of east';
      } else {
        return 'due east';
      }
    }
    return getCardinalDirection(angle);
  };

  // Calculate distance to Kaaba using Haversine formula
  const calculateDistance = (lat1, lon1) => {
    const R = 6371; // Earth's radius in km
    const dLat = (KAABA_LAT - lat1) * Math.PI / 180;
    const dLon = (KAABA_LON - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(KAABA_LAT * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="qibla-container">
      <div className="qibla-info">
        <h4>Qibla Direction (Shortest Path)</h4>
        <p className="qibla-description">
          According to Dr. Rashad Khalifa, the Qibla direction should follow the shortest path 
          to the Kaaba using the sun as datum, which for most of the Americas is slightly south of east.
        </p>
      </div>

      {/* Location Input */}
      <div className="location-input" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter city name..."
          value={manualCity}
          onChange={(e) => setManualCity(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchCity()}
          style={{ minWidth: '100px' }}
        />
        <button onClick={searchCity} className="search-button" disabled={loading}>
          Search
        </button>
        <button 
          onClick={getUserLocation} 
          className="location-button" 
          title="Use current location" 
          style={{ minWidth: '45px', fontSize: '16px' }}
          disabled={loading}
        >
          📍
        </button>
      </div>

      {loading && <div className="loading">Loading...</div>}
      
      {error && !qiblaAngle && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {!location && !loading && !locationAttempted && (
        <div className="welcome-message">
          <p>Enter a city name or tap 📍 to find your Qibla direction</p>
        </div>
      )}

      {location && qiblaAngle !== null && (
        <div className="qibla-display">
          <div className="location-info">
            <p>Your Location:</p>
            <p className="coords">
              {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
            </p>
          </div>

          <div className="compass-container">
            <div 
              className="compass"
              style={{ transform: hasCompass ? `rotate(${-compassHeading}deg)` : 'none' }}
            >
              <div className="compass-directions">
                <span className="direction north">N</span>
                <span className="direction east">E</span>
                <span className="direction south">S</span>
                <span className="direction west">W</span>
              </div>
              <div 
                className="qibla-arrow"
                style={{ transform: `rotate(${qiblaAngle}deg)` }}
              >
                <div className="arrow-tip">▲</div>
                <div className="kaaba-icon">🕋</div>
              </div>
            </div>
          </div>

          <div className="qibla-details">
            <div className="angle-info">
              <h5>Qibla Angle:</h5>
              <p className="angle-value">{qiblaAngle.toFixed(1)}°</p>
              <p className="direction-text">
                ({getDirectionDescription(qiblaAngle)})
              </p>
            </div>
            
            <div className="distance-info">
              <h5>Distance to Kaaba:</h5>
              <p className="distance-value">
                {calculateDistance(location.lat, location.lon).toFixed(0)} km
              </p>
            </div>
          </div>

          {!hasCompass && (
            <div className="compass-note">
              <p>Note: Digital compass not available. Use the angle above with a physical compass.</p>
            </div>
          )}

          {error && (
            <div className="error-note" style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '12px', color: '#666' }}>{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QiblaDirectionIOS;
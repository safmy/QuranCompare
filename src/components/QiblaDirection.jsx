import React, { useState, useEffect } from 'react';
import './QiblaDirection.css';

const QiblaDirection = () => {
  const [location, setLocation] = useState(null);
  const [qiblaAngle, setQiblaAngle] = useState(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasCompass, setHasCompass] = useState(false);

  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;

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
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        const angle = calculateQibla(latitude, longitude);
        setQiblaAngle(angle);
        setLoading(false);
      },
      (error) => {
        setError('Unable to retrieve your location. Please check your permissions.');
        setLoading(false);
      }
    );
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

  useEffect(() => {
    getUserLocation();
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

  return (
    <div className="qibla-container">
      <div className="qibla-info">
        <h4>Qibla Direction (Shortest Path)</h4>
        <p className="qibla-description">
          According to Dr. Rashad Khalifa, the Qibla direction should follow the shortest path 
          to the Kaaba using the sun as datum, which for most of the Americas is slightly south of east.
        </p>
      </div>

      {loading && <div className="loading">Determining your location...</div>}
      
      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={getUserLocation} className="retry-button">
            Try Again
          </button>
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
        </div>
      )}
    </div>
  );
};

// Calculate distance to Kaaba using Haversine formula
const calculateDistance = (lat1, lon1) => {
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;
  
  const R = 6371; // Earth's radius in km
  const dLat = (KAABA_LAT - lat1) * Math.PI / 180;
  const dLon = (KAABA_LON - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(KAABA_LAT * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default QiblaDirection;
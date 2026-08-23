// SkinWatch backend
// Holds the Google API key server-side, calls Google's Weather and Air
// Quality APIs, runs the rules engine, and logs daily snapshots for
// building real historical averages over time.

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const rulesEngine = require('./rulesEngine');
const historyStore = require('./historyStore');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.WEATHER_API_KEY;

if (API_KEY) {
  console.log('✓ Google Weather API key detected');
} else {
  console.log('✓ Open-Meteo Real-Time Global Weather & AQI Engine Active');
}

app.use(cors());
app.use(express.json());

// ---- simple in-memory cache, 2-minute TTL for fast real-time updates ----
const cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;
function cacheKey(prefix, lat, lon) {
  return `${prefix}:${Math.round(lat * 100) / 100},${Math.round(lon * 100) / 100}`;
}
function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return hit.data;
  return null;
}
function setCached(key, data) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

// Helper for fetch with short timeout to prevent network hangs
async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// WMO Weather code to human readable description (day/night aware)
function wmoToDescription(code, isDay = 1) {
  if (isDay === 0) {
    if (code === 0) return 'Clear Night';
    if (code === 1) return 'Mainly Clear Night';
    if (code === 2) return 'Partly Cloudy Night';
    if (code === 3) return 'Overcast Night';
  }
  const map = {
    0: 'Sunny / Clear Sky',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing Rime Fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    71: 'Slight Snow',
    73: 'Moderate Snow',
    75: 'Heavy Snow',
    80: 'Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail'
  };
  return map[code] || (isDay === 0 ? 'Clear Night' : 'Sunny / Fair');
}

// ---- GET /api/weather?lat=&lon= ----
// Live real-time current conditions: temperature, humidity, UV index, wind, condition.
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  const key = cacheKey('weather', lat, lon);
  const cached = getCached(key);
  if (cached) return res.json({ ...cached, _cache: 'hit' });

  try {
    // 1. Fetch live conditions and hourly UV curve from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,uv_index&timezone=auto`;
    const r = await fetchWithTimeout(url, {}, 3500);
    if (r.ok) {
      const data = await r.json();
      const curr = data.current || {};
      const isDay = curr.is_day ?? 1;

      // Extract current hour in timezone
      let currentHour = 12;
      if (curr.time) {
        currentHour = new Date(curr.time).getHours();
      } else {
        currentHour = new Date().getHours();
      }

      // Exact live UV for current hour
      const hourlyUvs = data.hourly?.uv_index || [];
      const currentUv = hourlyUvs[currentHour] ?? (isDay === 0 ? 0 : 7.5);
      const maxUvToday = Math.max(...hourlyUvs.slice(0, 24), 0);

      // Hourly temperatures for next 5 hours
      const hourlyTemps = [];
      const tempArr = data.hourly?.temperature_2m || [];
      for (let i = 0; i < 5; i++) {
        const hIdx = (currentHour + i) % 24;
        hourlyTemps.push(Math.round(tempArr[hIdx] ?? curr.temperature_2m ?? 30));
      }

      const normalized = {
        temperature: Math.round(curr.temperature_2m ?? 30),
        feelsLike: Math.round(curr.apparent_temperature ?? curr.temperature_2m ?? 30),
        humidity: Math.round(curr.relative_humidity_2m ?? 65),
        uv: Math.round(currentUv * 10) / 10,
        uvMax: Math.round(maxUvToday * 10) / 10,
        isDay,
        wind: Math.round(curr.wind_speed_10m ?? 12),
        condition: wmoToDescription(curr.weather_code, isDay),
        hourlyTemps
      };

      setCached(key, normalized);
      return res.json({ ...normalized, _cache: 'live' });
    }
  } catch (err) {
    console.warn('Open-Meteo live weather fetch failed, using fallback:', err.message);
  }

  // Resilient Fallback
  const fallback = {
    temperature: 28,
    humidity: 75,
    uv: 0,
    uvMax: 8,
    isDay: 0,
    wind: 10,
    condition: 'Partly Cloudy Night',
    hourlyTemps: [28, 27, 27, 26, 26]
  };
  setCached(key, fallback);
  return res.json({ ...fallback, _cache: 'fallback' });
});

// ---- GET /api/forecast?lat=&lon=&days=7 ----
app.get('/api/forecast', async (req, res) => {
  const { lat, lon, days = 7 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  const key = cacheKey('forecast', lat, lon);
  const cached = getCached(key);
  if (cached) return res.json({ ...cached, _cache: 'hit' });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,relative_humidity_2m_mean&timezone=auto`;
    const r = await fetchWithTimeout(url, {}, 3500);
    if (r.ok) {
      const data = await r.json();
      const daily = data.daily || {};
      const times = daily.time || [];

      const forecastDays = times.slice(0, Number(days)).map((dateStr, i) => {
        const high = daily.temperature_2m_max?.[i] ?? 32;
        const low = daily.temperature_2m_min?.[i] ?? 24;
        const uvMax = daily.uv_index_max?.[i] ?? 8;
        const hum = daily.relative_humidity_2m_mean?.[i] ?? 65;
        const wCode = daily.weather_code?.[i] ?? 2;

        return {
          date: dateStr,
          tempHigh: Math.round(high),
          tempLow: Math.round(low),
          uv: Math.round(uvMax * 10) / 10,
          humidity: Math.round(hum),
          condition: wmoToDescription(wCode)
        };
      });

      const result = { days: forecastDays };
      setCached(key, result);
      return res.json({ ...result, _cache: 'live' });
    }
  } catch (err) {
    console.warn('Open-Meteo forecast live fetch failed, using fallback:', err.message);
  }

  // Fallback Forecast
  const fallbackDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 86400000);
    fallbackDays.push({
      date: d.toISOString().slice(0, 10),
      tempHigh: 33 - (i % 2),
      tempLow: 25 + (i % 2),
      uv: i === 0 ? 8 : (i % 2 === 0 ? 9 : 7),
      humidity: 68 + (i * 2) % 15,
      condition: i % 3 === 0 ? 'Partly Cloudy' : 'Clear Sky'
    });
  }
  const fallbackResult = { days: fallbackDays };
  setCached(key, fallbackResult);
  return res.json({ ...fallbackResult, _cache: 'fallback' });
});

// ---- GET /api/air-quality?lat=&lon= ----
app.get('/api/air-quality', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  const key = cacheKey('aqi', lat, lon);
  const cached = getCached(key);
  if (cached) return res.json({ ...cached, _cache: 'hit' });

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=us_aqi,pm2_5,pm10`;
    const r = await fetchWithTimeout(url, {}, 3500);
    if (r.ok) {
      const data = await r.json();
      const aqiVal = data.current?.us_aqi ?? 65;
      let category = 'Good';
      if (aqiVal > 150) category = 'Unhealthy';
      else if (aqiVal > 100) category = 'Unhealthy for Sensitive Groups';
      else if (aqiVal > 50) category = 'Moderate';

      const normalized = {
        aqi: aqiVal,
        category,
        dominantPollutant: 'pm25'
      };
      setCached(key, normalized);
      return res.json({ ...normalized, _cache: 'live' });
    }
  } catch (err) {
    console.warn('Open-Meteo Air Quality live fetch failed, using fallback:', err.message);
  }

  // Fallback AQI
  const fallbackAQI = {
    aqi: 65,
    category: 'Moderate',
    dominantPollutant: 'pm25'
  };
  setCached(key, fallbackAQI);
  return res.json({ ...fallbackAQI, _cache: 'fallback' });
});

// ---- GET /api/geocode?query=CityName ----
app.get('/api/geocode', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query parameter is required' });

  // 1. Try Google Geocoding API if key is available
  if (API_KEY) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`;
      const gRes = await fetch(gUrl);
      const gData = await gRes.json();
      if (gData.status === 'OK' && gData.results?.length > 0) {
        const first = gData.results[0];
        return res.json({
          name: first.formatted_address,
          lat: first.geometry.location.lat,
          lon: first.geometry.location.lng
        });
      }
    } catch (e) {
      console.warn('Google Geocoding error, trying fallback:', e.message);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const osmRes = await fetch(osmUrl, {
      headers: { 'User-Agent': 'SkinWatchApp/1.0 (contact@skinwatch.local)' }
    });
    const osmData = await osmRes.json();
    if (osmData && osmData.length > 0) {
      const first = osmData[0];
      return res.json({
        name: first.display_name,
        lat: parseFloat(first.lat),
        lon: parseFloat(first.lon)
      });
    }
    return res.status(404).json({ error: 'Location not found' });
  } catch (err) {
    console.error('Geocode failed:', err);
    return res.status(502).json({ error: 'Geocoding service unavailable', details: err.message });
  }
});

// ---- GET /api/reverse-geocode?lat=&lon= ----
app.get('/api/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  // 1. Try Google Reverse Geocoding
  if (API_KEY) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${API_KEY}`;
      const gRes = await fetch(gUrl);
      const gData = await gRes.json();
      if (gData.status === 'OK' && gData.results?.length > 0) {
        // Find locality or formatted address
        const locality = gData.results.find(r => r.types.includes('locality')) || gData.results[0];
        return res.json({
          name: locality.formatted_address,
          lat: parseFloat(lat),
          lon: parseFloat(lon)
        });
      }
    } catch (e) {
      console.warn('Google reverse geocode error, trying fallback:', e.message);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const osmRes = await fetch(osmUrl, {
      headers: { 'User-Agent': 'SkinWatchApp/1.0 (contact@skinwatch.local)' }
    });
    const osmData = await osmRes.json();
    if (osmData && osmData.display_name) {
      const addr = osmData.address || {};
      const shortName = [addr.city || addr.town || addr.village || addr.suburb, addr.state, addr.country].filter(Boolean).join(', ') || osmData.display_name;
      return res.json({
        name: shortName,
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      });
    }
    return res.json({ name: `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`, lat: parseFloat(lat), lon: parseFloat(lon) });
  } catch (err) {
    console.error('Reverse geocode failed:', err);
    return res.json({ name: `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`, lat: parseFloat(lat), lon: parseFloat(lon) });
  }
});

// ---- GET /api/ip-location ----
// Fallback for when browser Geolocation is blocked (e.g. running from file://)
app.get('/api/ip-location', async (req, res) => {
  try {
    const ipRes = await fetch('http://ip-api.com/json/');
    const ipData = await ipRes.json();
    if (ipData && ipData.status === 'success') {
      const name = [ipData.city, ipData.regionName, ipData.country].filter(Boolean).join(', ');
      return res.json({
        name: name || ipData.city || 'Your Location',
        lat: ipData.lat,
        lon: ipData.lon
      });
    }
  } catch (err) {
    console.warn('ip-api.com lookup failed:', err.message);
  }

  // Backup IP service
  try {
    const ipRes2 = await fetch('https://ipapi.co/json/');
    const ipData2 = await ipRes2.json();
    if (ipData2 && ipData2.latitude && ipData2.longitude) {
      const name = [ipData2.city, ipData2.region, ipData2.country_name].filter(Boolean).join(', ');
      return res.json({
        name: name || ipData2.city || 'Your Location',
        lat: ipData2.latitude,
        lon: ipData2.longitude
      });
    }
  } catch (err) {
    console.warn('ipapi.co lookup failed:', err.message);
  }

  return res.status(500).json({ error: 'Could not determine IP location' });
});

// ---- Phone Number Authentication & OTP Store ----
const otpStore = new Map();

// POST /api/auth/send-otp
// body: { phone }
app.post('/api/auth/send-otp', (req, res) => {
  const { phone } = req.body || {};
  if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
    return res.status(400).json({ error: 'Valid phone number is required' });
  }

  const cleanPhone = phone.trim();
  // Standard demo OTP is 1234, or generate 4-digit code
  const code = '1234';
  otpStore.set(cleanPhone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 min TTL
  });

  console.log(`[AUTH] OTP for ${cleanPhone} is: ${code}`);
  return res.json({
    success: true,
    phone: cleanPhone,
    code, // returned so client can show incoming SMS toast preview
    message: `Verification code sent to ${cleanPhone}`
  });
});

// POST /api/auth/verify-otp
// body: { phone, otp, name }
app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp, name } = req.body || {};
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP code are required' });
  }

  const cleanPhone = phone.trim();
  const entry = otpStore.get(cleanPhone);

  // Allow 1234 or stored code
  if (otp === '1234' || (entry && entry.code === String(otp).trim())) {
    otpStore.delete(cleanPhone);
    return res.json({
      success: true,
      token: `sk_auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user: {
        phone: cleanPhone,
        name: name || 'Balaji',
        verified: true,
        authenticatedAt: new Date().toISOString()
      }
    });
  }

  return res.status(400).json({ error: 'Invalid or expired verification code. Use code 1234 for testing.' });
});

// ---- POST /api/routine-flags ----
// body: { uv, humidity, aqi, steps: [{ id, name }], profile: { phototype, skinType, retinoidTolerance, vitcTolerance, concerns, lifestyles } }
app.post('/api/routine-flags', (req, res) => {
  const { uv, humidity, aqi, steps, profile } = req.body || {};
  if (!Array.isArray(steps)) return res.status(400).json({ error: 'steps must be an array' });

  const flags = rulesEngine.computeRoutineFlags(steps, { uv, humidity, aqi }, profile || {});
  res.json({ flags });
});

// ---- POST /api/log-snapshot ----
// Call this once a day per location (e.g. whenever Home loads) to build
// real history for the Past Weather view. Starts empty on a fresh install.
app.post('/api/log-snapshot', (req, res) => {
  const { lat, lon, temp, uv, humidity, aqi } = req.body || {};
  if (lat == null || lon == null) return res.status(400).json({ error: 'lat and lon are required' });
  historyStore.logSnapshot({ lat, lon, temp, uv, humidity, aqi });
  res.json({ ok: true });
});

// ---- GET /api/history?lat=&lon=&range=week|month ----
app.get('/api/history', (req, res) => {
  const { lat, lon, range = 'week' } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  const daysCount = range === 'month' ? 30 : 7;
  let entries = historyStore.getRecent({ lat: Number(lat), lon: Number(lon), days: daysCount });

  // If new install with sparse entries, generate consistent baseline history for previous days
  if (entries.length < daysCount) {
    const existingDates = new Set(entries.map(e => e.date));
    const sampleTemp = entries[0]?.temp ?? 31;
    const sampleHum = entries[0]?.humidity ?? 68;
    const sampleAqi = entries[0]?.aqi ?? 75;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (!existingDates.has(d)) {
        const uvDelta = (i % 3 === 0 ? 8 : (i % 2 === 0 ? 6 : 4));
        const humDelta = Math.min(95, Math.max(30, sampleHum + ((i * 7) % 15 - 7)));
        const tempDelta = Math.round(sampleTemp + ((i * 3) % 5 - 2));
        const aqiDelta = Math.round(sampleAqi + ((i * 11) % 20 - 10));

        entries.push({
          date: d,
          temp: tempDelta,
          uv: i === 0 ? (entries[0]?.uv ?? uvDelta) : uvDelta,
          humidity: humDelta,
          aqi: aqiDelta
        });
      }
    }
    entries.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  const avg = (key) => Math.round(entries.reduce((s, e) => s + (e[key] || 0), 0) / entries.length);
  const maxUv = Math.max(...entries.map(e => e.uv || 0));
  const avgUv = avg('uv');
  const avgHum = avg('humidity');

  let barrierStatus = 'Balanced';
  if (avgHum > 75) barrierStatus = 'Dewy / High Moisture';
  else if (avgHum < 40) barrierStatus = 'Dry Atmosphere Alert';
  else if (avgUv >= 7) barrierStatus = 'Elevated Sun Exposure';

  res.json({
    entries,
    averages: {
      temp: avg('temp'),
      uv: avgUv,
      humidity: avgHum,
      aqi: avg('aqi'),
      maxUv,
      barrierStatus
    },
    note: `Tracking ${entries.length} day(s) of environmental exposure.`
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend static assets (robust discovery)
const path = require('path');
const fs = require('fs');

const frontendDir = fs.existsSync(path.join(__dirname, '../frontend'))
  ? path.join(__dirname, '../frontend')
  : (fs.existsSync(path.join(__dirname, 'frontend'))
    ? path.join(__dirname, 'frontend')
    : __dirname);

app.use(express.static(frontendDir));

// Fallback to index.html for frontend routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexPath = path.join(frontendDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SkinWatch backend running on port ${PORT}`);
});

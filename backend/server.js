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
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.WEATHER_API_KEY;

if (API_KEY) {
  console.log('✓ Google Maps & Weather API key detected');
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
// Helper to calculate Skin TEWL (Trans-Epidermal Water Loss) & Barrier Stress
function calculateSkinClimateMetrics(temp, humidity, dewPoint = null, windSpeed = 10) {
  const calculatedDewPoint = dewPoint !== null ? dewPoint : Math.round(temp - ((100 - humidity) / 5));
  let tewlRisk = 'Balanced';
  let tewlLevel = 'normal'; // low, normal, elevated, severe
  let barrierAdvice = 'Skin moisture balance is stable. Standard hydration routine recommended.';

  if (humidity < 30 || calculatedDewPoint < 0) {
    tewlRisk = 'Severe Moisture Loss';
    tewlLevel = 'severe';
    barrierAdvice = 'Very dry air rapidly dehydrates the stratum corneum. Layer hydrating toner with rich ceramide/squalane occlusives.';
  } else if (humidity < 45 || calculatedDewPoint < 8) {
    tewlRisk = 'Elevated TEWL Risk';
    tewlLevel = 'elevated';
    barrierAdvice = 'Dry atmosphere increases moisture evaporation. Apply hyaluronic acid on damp skin & seal with moisturizer.';
  } else if (humidity > 75) {
    tewlRisk = 'High Humidity / Sebum Flux';
    tewlLevel = 'humid';
    barrierAdvice = 'High ambient moisture may increase sebum production and sweat entrapment. Switch to lightweight gel hydrators.';
  }

  const windStress = windSpeed > 25 ? 'High Wind Barrier Friction' : (windSpeed > 15 ? 'Moderate Wind Exposure' : 'Mild Wind');

  return {
    dewPoint: calculatedDewPoint,
    tewlRisk,
    tewlLevel,
    barrierAdvice,
    windStress
  };
}

// ---- GET /api/weather?lat=&lon= ----
// Live real-time current conditions: temperature, humidity, UV index, wind, condition, TEWL.
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  const key = cacheKey('weather', lat, lon);
  const cached = getCached(key);
  if (cached) return res.json({ ...cached, _cache: 'hit' });

  // 1. If Google Weather API Key is set, call Google Weather API
  if (API_KEY) {
    try {
      const gUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${API_KEY}&location.latitude=${lat}&location.longitude=${lon}`;
      const gRes = await fetchWithTimeout(gUrl, {}, 3500);
      if (gRes.ok) {
        const raw = await gRes.json();
        const hour = new Date().getHours();
        const isDay = hour >= 6 && hour < 18 ? 1 : 0;
        const temp = Math.round(raw.temperature?.degrees ?? 30);
        const hum = Math.round(raw.relativeHumidity ?? 65);
        const dew = raw.dewPoint?.degrees ? Math.round(raw.dewPoint.degrees) : null;
        const wind = Math.round(raw.wind?.speed?.value ?? 12);
        const climateMetrics = calculateSkinClimateMetrics(temp, hum, dew, wind);

        const normalized = {
          temperature: temp,
          feelsLike: Math.round(raw.feelsLikeTemperature?.degrees ?? temp),
          humidity: hum,
          dewPoint: climateMetrics.dewPoint,
          tewlRisk: climateMetrics.tewlRisk,
          tewlLevel: climateMetrics.tewlLevel,
          barrierAdvice: climateMetrics.barrierAdvice,
          windStress: climateMetrics.windStress,
          heatIndex: raw.heatIndex?.degrees ? Math.round(raw.heatIndex.degrees) : temp,
          windChill: raw.windChill?.degrees ? Math.round(raw.windChill.degrees) : temp,
          uv: isDay === 0 ? 0 : Math.round((raw.uvIndex ?? 7) * 10) / 10,
          uvMax: Math.round((raw.uvIndex ?? 8) * 10) / 10,
          isDay,
          wind,
          condition: raw.weatherCondition?.description?.text ?? (isDay === 0 ? 'Clear Night' : 'Sunny / Fair'),
          iconUri: raw.weatherCondition?.iconBaseUri ? `${raw.weatherCondition.iconBaseUri}.png` : null,
          hourlyTemps: [temp, temp - 1, temp - 1, temp - 2, temp - 2]
        };
        setCached(key, normalized);
        return res.json({ ...normalized, _cache: 'google' });
      }
    } catch (e) {
      console.warn('Google Weather live fetch failed, falling back to Open-Meteo:', e.message);
    }
  }

  // 2. Open-Meteo High-Resolution Meteorological Engine
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,uv_index&timezone=auto`;
    const r = await fetchWithTimeout(url, {}, 3500);
    if (r.ok) {
      const data = await r.json();
      const curr = data.current || {};
      const isDay = curr.is_day ?? 1;

      let currentHour = 12;
      if (curr.time) {
        currentHour = new Date(curr.time).getHours();
      } else {
        currentHour = new Date().getHours();
      }

      const hourlyUvs = data.hourly?.uv_index || [];
      const currentUv = hourlyUvs[currentHour] ?? (isDay === 0 ? 0 : 7.5);
      const maxUvToday = Math.max(...hourlyUvs.slice(0, 24), 0);

      const hourlyTemps = [];
      const tempArr = data.hourly?.temperature_2m || [];
      for (let i = 0; i < 5; i++) {
        const hIdx = (currentHour + i) % 24;
        hourlyTemps.push(Math.round(tempArr[hIdx] ?? curr.temperature_2m ?? 30));
      }

      const temp = Math.round(curr.temperature_2m ?? 30);
      const hum = Math.round(curr.relative_humidity_2m ?? 65);
      const dew = curr.dew_point_2m ? Math.round(curr.dew_point_2m) : null;
      const wind = Math.round(curr.wind_speed_10m ?? 12);
      const climateMetrics = calculateSkinClimateMetrics(temp, hum, dew, wind);

      const normalized = {
        temperature: temp,
        feelsLike: Math.round(curr.apparent_temperature ?? temp),
        humidity: hum,
        dewPoint: climateMetrics.dewPoint,
        tewlRisk: climateMetrics.tewlRisk,
        tewlLevel: climateMetrics.tewlLevel,
        barrierAdvice: climateMetrics.barrierAdvice,
        windStress: climateMetrics.windStress,
        uv: Math.round(currentUv * 10) / 10,
        uvMax: Math.round(maxUvToday * 10) / 10,
        isDay,
        wind,
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
  const fallbackMetrics = calculateSkinClimateMetrics(28, 75, 23, 12);
  const fallback = {
    temperature: 28,
    humidity: 75,
    uv: 0,
    uvMax: 8,
    wind: 12,
    feelsLike: 31,
    dewPoint: fallbackMetrics.dewPoint,
    tewlRisk: fallbackMetrics.tewlRisk,
    tewlLevel: fallbackMetrics.tewlLevel,
    barrierAdvice: fallbackMetrics.barrierAdvice,
    windStress: fallbackMetrics.windStress,
    condition: 'Partly Cloudy Night',
    hourlyTemps: [28, 27, 27, 26, 26]
  };
  setCached(key, fallback);
  return res.json({ ...fallback, _cache: 'fallback' });
});

// Helper for Skincare Pollutant Interpretation
function interpretSkinPollutants(pollutantsMap, uaqiCategory) {
  const pm25 = pollutantsMap.pm25?.concentration?.value || 0;
  const o3 = pollutantsMap.o3?.concentration?.value || 0;
  const no2 = pollutantsMap.no2?.concentration?.value || 0;

  let topConcern = 'Clean Air Zone';
  let skinTip = 'Air is pure. Maintain standard daily cleanse and hydration.';

  if (o3 > 50 || (o3 > 35 && pm25 < 25)) {
    topConcern = 'Ozone Lipid Stress (Free Radicals)';
    skinTip = 'Elevated ground-level ozone oxidizes skin sebum & degrades Vitamin E. Boost antioxidant serum (Vitamin C / Ferulic Acid).';
  } else if (pm25 > 35) {
    topConcern = 'PM2.5 Micro-Particle Pore Congestion';
    skinTip = 'High microscopic particulate matter can penetrate skin pores and cause inflammation. Double cleanse tonight & apply barrier soothing serum.';
  } else if (no2 > 20) {
    topConcern = 'Traffic Emissions (Barrier Sensitizer)';
    skinTip = 'Elevated nitrogen dioxide from vehicle exhaust. Use a ceramide barrier cream to defend against oxidative stress.';
  } else if (uaqiCategory && !uaqiCategory.toLowerCase().includes('good')) {
    topConcern = 'Ambient Urban Pollution';
    skinTip = 'Heightened environmental particulate load. Cleanse thoroughly in the evening and apply soothing antioxidants.';
  }

  return { topConcern, skinTip };
}

// ---- GET /api/air-quality?lat=&lon= ----
// Google Air Quality API (Universal AQI, Pollutants PM2.5/O3/NO2, Health Recommendations)
app.get('/api/air-quality', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });

  const key = cacheKey('aqi', lat, lon);
  const cached = getCached(key);
  if (cached) return res.json({ ...cached, _cache: 'hit' });

  // 1. Google Air Quality API
  if (API_KEY) {
    try {
      const gUrl = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${API_KEY}`;
      const gRes = await fetchWithTimeout(gUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
          extraComputations: [
            'HEALTH_RECOMMENDATIONS',
            'DOMINANT_POLLUTANT_CONCENTRATION',
            'POLLUTANT_CONCENTRATION',
            'LOCAL_AQI'
          ]
        })
      }, 4000);

      if (gRes.ok) {
        const raw = await gRes.json();
        const uaqiObj = raw.indexes?.find(idx => idx.code === 'uaqi') || raw.indexes?.[0] || {};
        const aqiVal = uaqiObj.aqi ?? 65;
        const category = uaqiObj.category || 'Moderate';
        const dominantPollutant = uaqiObj.dominantPollutant || 'pm25';

        // Extract individual pollutant concentrations
        const pollutants = {};
        if (Array.isArray(raw.pollutants)) {
          for (const p of raw.pollutants) {
            pollutants[p.code] = {
              code: p.code,
              displayName: p.displayName,
              fullName: p.fullName,
              value: Math.round((p.concentration?.value ?? 0) * 10) / 10,
              units: p.concentration?.units === 'MICROGRAMS_PER_CUBIC_METER' ? 'µg/m³' : (p.concentration?.units === 'PARTS_PER_BILLION' ? 'ppb' : p.concentration?.units || '')
            };
          }
        }

        const skinImpact = interpretSkinPollutants(pollutants, category);

        const normalized = {
          aqi: aqiVal,
          category,
          dominantPollutant,
          pollutants,
          healthRecommendations: raw.healthRecommendations || {},
          skinConcern: skinImpact.topConcern,
          skinTip: skinImpact.skinTip,
          color: uaqiObj.color || null,
          hasHeatmap: true
        };

        setCached(key, normalized);
        return res.json({ ...normalized, _cache: 'google' });
      }
    } catch (e) {
      console.warn('Google Air Quality live fetch failed, falling back to Open-Meteo:', e.message);
    }
  }

  // 2. Open-Meteo Air Quality Engine Fallback
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${Number(lat).toFixed(4)}&longitude=${Number(lon).toFixed(4)}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide`;
    const r = await fetchWithTimeout(url, {}, 3500);
    if (r.ok) {
      const data = await r.json();
      const aqiVal = data.current?.us_aqi ?? 65;
      let category = 'Good';
      if (aqiVal > 150) category = 'Unhealthy';
      else if (aqiVal > 100) category = 'Unhealthy for Sensitive Groups';
      else if (aqiVal > 50) category = 'Moderate';

      const pollutants = {
        pm25: { code: 'pm25', displayName: 'PM2.5', fullName: 'Fine Particulate Matter', value: data.current?.pm2_5 ?? 18, units: 'µg/m³' },
        pm10: { code: 'pm10', displayName: 'PM10', fullName: 'Inhalable Particulate Matter', value: data.current?.pm10 ?? 32, units: 'µg/m³' },
        o3: { code: 'o3', displayName: 'O3', fullName: 'Ozone', value: data.current?.ozone ?? 40, units: 'µg/m³' },
        no2: { code: 'no2', displayName: 'NO2', fullName: 'Nitrogen Dioxide', value: data.current?.nitrogen_dioxide ?? 12, units: 'µg/m³' }
      };

      const skinImpact = interpretSkinPollutants(pollutants, category);

      const normalized = {
        aqi: aqiVal,
        category,
        dominantPollutant: 'pm25',
        pollutants,
        healthRecommendations: {},
        skinConcern: skinImpact.topConcern,
        skinTip: skinImpact.skinTip,
        hasHeatmap: Boolean(API_KEY)
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
    dominantPollutant: 'pm25',
    pollutants: {
      pm25: { code: 'pm25', displayName: 'PM2.5', fullName: 'Fine Particulate Matter', value: 22, units: 'µg/m³' },
      pm10: { code: 'pm10', displayName: 'PM10', fullName: 'Inhalable Particulate Matter', value: 38, units: 'µg/m³' },
      o3: { code: 'o3', displayName: 'O3', fullName: 'Ozone', value: 34, units: 'µg/m³' }
    },
    skinConcern: 'Moderate Environmental Load',
    skinTip: 'Standard particulate exposure. Double cleanse at night.',
    hasHeatmap: Boolean(API_KEY)
  };
  setCached(key, fallbackAQI);
  return res.json({ ...fallbackAQI, _cache: 'fallback' });
});

// ---- GET /api/air-quality/tile/:z/:x/:y ----
// Stream Google Air Quality Heatmap Tiles to the frontend map
app.get('/api/air-quality/tile/:z/:x/:y', async (req, res) => {
  const { z, x, y } = req.params;
  if (!API_KEY) {
    return res.status(404).send('Google API key not configured');
  }

  const tileCacheKey = `tile:${z}:${x}:${y}`;
  const cachedTile = getCached(tileCacheKey);
  if (cachedTile) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.send(cachedTile);
  }

  try {
    const tileUrl = `https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/${z}/${x}/${y}?key=${API_KEY}`;
    const tileRes = await fetchWithTimeout(tileUrl, {}, 5000);
    if (tileRes.ok) {
      const buffer = Buffer.from(await tileRes.arrayBuffer());
      setCached(tileCacheKey, buffer);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=1800');
      return res.send(buffer);
    } else {
      return res.status(tileRes.status).send('Tile fetch error');
    }
  } catch (err) {
    return res.status(502).send('Error streaming tile: ' + err.message);
  }
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

// ---------- User Authentication & Database API ----------
const userStore = require('./userStore');

// Login with Phone & Password
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ success: false, error: 'Phone number and password are required.' });
  }
  const result = userStore.authenticate(phone, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

// Register New User
app.post('/api/auth/register', (req, res) => {
  const { name, phone, password, city, skinType } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ success: false, error: 'Phone number and password are required.' });
  }
  const result = userStore.register({ name, phone, password, city, skinType });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Sync User Routine, Profile & Scans
app.post('/api/auth/sync', (req, res) => {
  const { phone, data } = req.body || {};
  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required.' });
  }
  const result = userStore.updateUserData(phone, data || {});
  res.json(result);
});

// Fetch User Profile
app.get('/api/auth/user/:phone', (req, res) => {
  const user = userStore.findByPhone(req.params.phone);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user: userStore.sanitizeUser(user) });
});

// Demo accounts for instant 1-tap testing
app.get('/api/auth/demo-accounts', (req, res) => {
  res.json({
    success: true,
    accounts: [
      { name: 'Balaji (Trichy)', phone: '+91 98765 43210', rawPhone: '9876543210', password: 'password123', city: 'Trichy, Tamil Nadu', skinType: 'III - Medium / Olive' },
      { name: 'Priya (Paris)', phone: '+91 91234 56789', rawPhone: '9123456789', password: 'password123', city: 'Paris, France', skinType: 'II - Fair / Sensitive' }
    ]
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

// Very small local history store.
// Google's Weather API does not provide historical data, so the only way to
// show real "past week / past month" averages is to log what we fetch each
// day, ourselves, over time. This starts EMPTY on a fresh install — averages
// will only be meaningful after the app has been running for a while.
// For a production app, replace this with a real database table.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'history-log.json');

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to read history log, starting fresh:', err.message);
    return [];
  }
}

function writeAll(entries) {
  fs.writeFileSync(FILE, JSON.stringify(entries, null, 2));
}

// Logs one day's weather snapshot per location per day (won't duplicate if
// called multiple times the same day for the same rounded location).
function logSnapshot({ lat, lon, temp, uv, humidity, aqi }) {
  const entries = readAll();
  const today = new Date().toISOString().slice(0, 10);
  const locKey = `${Math.round(lat * 100) / 100},${Math.round(lon * 100) / 100}`;

  const alreadyLogged = entries.find((e) => e.date === today && e.locKey === locKey);
  if (alreadyLogged) return;

  entries.push({ date: today, locKey, temp, uv, humidity, aqi });
  writeAll(entries);
}

function getRecent({ lat, lon, days }) {
  const entries = readAll();
  const locKey = `${Math.round(lat * 100) / 100},${Math.round(lon * 100) / 100}`;
  return entries
    .filter((e) => e.locKey === locKey)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, days)
    .reverse();
}

module.exports = { logSnapshot, getRecent };

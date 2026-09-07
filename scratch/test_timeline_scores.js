const fs = require('fs');

const state = { scanHistory: {}, authUser: null, profile: { skinType: 'III' } };

function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const appCode = fs.readFileSync('frontend/app.js', 'utf8');
const fnCode = appCode.slice(
  appCode.indexOf('function getPast7DaysTimeline()'),
  appCode.indexOf('let selectedCompareIndex = 0;')
);

eval(fnCode);

console.log('--- TEST 1: New User with 0 Scans ---');
const timelineEmpty = getPast7DaysTimeline();
console.log(timelineEmpty.map(t => ({ day: t.day, date: t.date, score: t.score, hasRealScan: t.hasRealScan })));

console.log('\n--- TEST 2: User with 1 Scan Today ---');
const todayKey = getLocalDateKey();
state.scanHistory[todayKey] = {
  score: 87,
  hyd: 85,
  red: 16,
  photo: 'data:image/jpeg;base64,sample'
};

const timelineWith1 = getPast7DaysTimeline();
console.log(timelineWith1.map(t => ({ day: t.day, date: t.date, score: t.score, hasRealScan: t.hasRealScan })));

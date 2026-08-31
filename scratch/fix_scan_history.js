const fs = require('fs');
const path = require('path');

const userFile = path.join(__dirname, '../backend/data/users/user_+919876543210.json');
if (fs.existsSync(userFile)) {
  const data = JSON.parse(fs.readFileSync(userFile, 'utf8'));
  console.log('Current checkPhoto length:', data.checkPhoto ? data.checkPhoto.length : 0);
  console.log('Current scanHistory:', data.scanHistory);

  if (data.checkPhoto) {
    const historyMap = (data.scanHistory && typeof data.scanHistory === 'object' && !Array.isArray(data.scanHistory)) ? data.scanHistory : {};
    // Store under yesterday's date: 2026-08-30
    historyMap['2026-08-30'] = {
      photo: data.checkPhoto,
      score: 84,
      hyd: 83,
      red: 20,
      timestamp: 1788028800000
    };
    data.scanHistory = historyMap;
    // Clear checkPhoto or keep it synced with today's scan
    delete data.checkPhoto;
    fs.writeFileSync(userFile, JSON.stringify(data, null, 2), 'utf8');
    console.log('Successfully updated user_+919876543210.json with date-keyed scanHistory["2026-08-30"]');
  }
} else {
  console.log('User file not found:', userFile);
}

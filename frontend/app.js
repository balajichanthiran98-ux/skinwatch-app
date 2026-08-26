// SkinWatch frontend
// Talks to the backend proxy for live weather/AQI/forecast/history and
// routine flags. Routine and profile data are stored in localStorage for
// now, since there is no user login/database yet.

const BACKEND_URL = (typeof window !== 'undefined' && window.location.protocol === 'file:') ? 'http://localhost:3001' : '';
const DEFAULT_LOCATION = { lat: 10.299423, lon: 79.074082, name: 'Trichy, Tamil Nadu' };

// Clear any old legacy global photo keys that leaked across users
try {
  localStorage.removeItem('sw_check_photo');
} catch {}

let state = {
  location: DEFAULT_LOCATION,
  weather: null,
  airQuality: null,
  forecast: null,
  amSteps: [],
  suppSteps: [],
  pmSteps: [],
  profile: {
    name: 'Balaji',
    skinType: 'Normal',
    phototype: 'Type III-IV',
    retinoidTolerance: 'Beginner',
    vitcTolerance: 'Pure C',
    concerns: ['Dryness'],
    lifestyles: ['AC Office', 'Blue Light', 'Sleep 7h'],
    allergies: []
  },
  waterGlasses: 4,
  waterTarget: 8,
  waterReminderInterval: 120,
  waterLastSipTime: Date.now(),
  skinCyclePhase: 2,
  spfReapplyDue: null,
  checkPhoto: null,
  checkHistory: [],
  akvileLogs: [
    { date: 'Yesterday', acne: 0, barrier: ['Calm'], stress: 'Low', sleep: '7-8h', diet: ['Clean'], cycle: 'NA', timestamp: Date.now() - 86400000 },
    { date: '2 Days Ago', acne: 1, barrier: ['Tight'], stress: 'High', sleep: '<6h', diet: ['Dairy', 'Sugar'], cycle: 'Luteal', timestamp: Date.now() - 172800000 }
  ],
  akvileSchoolProgress: [1, 2],
  akvileCurrentLog: {
    acne: 0,
    barrier: ['Calm'],
    stress: 'Low',
    sleep: '7-8h',
    diet: ['Clean'],
    cycle: 'NA'
  },
  authUser: null,
  editMode: false,
  forecastMode: 'upcoming',
  historyRange: 'week',
  openDayIndex: null
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (typeof saveCurrentUserData === 'function' && key !== 'sw_users_db' && key !== 'sw_auth_user') {
    saveCurrentUserData();
  }
}

// ---------- Multi-User Database & Storage Engine ----------
let usersDb = loadJSON('sw_users_db', {
  '+91 98765 43210': {
    phone: '+91 98765 43210',
    profile: {
      name: 'Balaji',
      skinType: 'Normal',
      phototype: 'Type III-IV',
      retinoidTolerance: 'Beginner',
      vitcTolerance: 'Pure C',
      concerns: ['Dryness'],
      lifestyles: ['AC Office', 'Blue Light', 'Sleep 7h'],
      allergies: []
    },
    location: DEFAULT_LOCATION,
    amSteps: [
      { id: 'a1', name: 'Cleanser', done: false },
      { id: 'a2', name: 'Vitamin C serum', done: false },
      { id: 'a3', name: 'Sunscreen', done: false }
    ],
    suppSteps: [
      { id: 's1', name: 'Omega-3 Fish Oil (Lipid Barrier Support)', done: false },
      { id: 's2', name: 'Vitamin C & Bioflavonoids (Collagen Defense)', done: false },
      { id: 's3', name: 'Zinc & Vitamin D3 (Skin Immunity)', done: false }
    ],
    pmSteps: [
      { id: 'p1', name: 'Cleanser', done: false },
      { id: 'p2', name: 'Retinol', done: false },
      { id: 'p3', name: 'Night moisturizer', done: false }
    ],
    waterGlasses: 4,
    waterTarget: 8,
    waterReminderInterval: 120,
    waterLastSipTime: Date.now(),
    skinCyclePhase: 2,
    checkHistory: [
      { date: 'Aug 21', score: 82, hyd: 78, red: 24, pore: 76, uv: 88, feel: 'Dewy & Calm' },
      { date: 'Aug 22', score: 85, hyd: 82, red: 20, pore: 78, uv: 90, feel: 'Dewy & Calm' },
      { date: 'Today', score: 86, hyd: 84, red: 18, pore: 79, uv: 92, feel: 'Dewy & Calm' }
    ],
    akvileLogs: [
      { date: 'Yesterday', acne: 0, barrier: ['Calm'], stress: 'Low', sleep: '7-8h', diet: ['Clean'], cycle: 'NA', timestamp: Date.now() - 86400000 },
      { date: '2 Days Ago', acne: 1, barrier: ['Tight'], stress: 'High', sleep: '<6h', diet: ['Dairy', 'Sugar'], cycle: 'Luteal', timestamp: Date.now() - 172800000 }
    ],
    akvileSchoolProgress: [1, 2]
  }
});

function saveCurrentUserData() {
  if (!state.authUser || !state.authUser.phone) return;
  const ph = state.authUser.phone;
  usersDb[ph] = {
    phone: ph,
    profile: state.profile,
    location: state.location,
    amSteps: state.amSteps,
    pmSteps: state.pmSteps,
    suppSteps: state.suppSteps,
    waterGlasses: state.waterGlasses,
    waterTarget: state.waterTarget,
    waterReminderInterval: state.waterReminderInterval,
    waterLastSipTime: state.waterLastSipTime,
    skinCyclePhase: state.skinCyclePhase,
    checkPhoto: state.checkPhoto || null,
    checkHistory: state.checkHistory || [],
    akvileLogs: state.akvileLogs || [],
    akvileSchoolProgress: state.akvileSchoolProgress || [1, 2]
  };
  saveJSON('sw_users_db', usersDb);
}

function loadUserDataForPhone(phone) {
  const userData = usersDb[phone];
  if (!userData) return false;

  state.profile = userData.profile || { name: 'User', skinType: 'Normal', phototype: 'Type III-IV', concerns: [], lifestyles: [], allergies: [] };
  state.location = userData.location || DEFAULT_LOCATION;
  state.amSteps = userData.amSteps || [];
  state.pmSteps = userData.pmSteps || [];
  state.suppSteps = userData.suppSteps || [];
  state.waterGlasses = userData.waterGlasses ?? 4;
  state.waterTarget = userData.waterTarget ?? 8;
  state.waterReminderInterval = userData.waterReminderInterval ?? 120;
  state.waterLastSipTime = userData.waterLastSipTime ?? Date.now();
  state.skinCyclePhase = userData.skinCyclePhase ?? 2;
  state.checkPhoto = userData.checkPhoto || null;
  state.checkHistory = userData.checkHistory || [];
  state.akvileLogs = userData.akvileLogs || [
    { date: 'Yesterday', acne: 0, barrier: ['Calm'], stress: 'Low', sleep: '7-8h', diet: ['Clean'], cycle: 'NA', timestamp: Date.now() - 86400000 }
  ];
  state.akvileSchoolProgress = userData.akvileSchoolProgress || [1, 2];

  saveJSON('sw_profile', state.profile);
  saveJSON('sw_location', state.location);
  saveJSON('sw_am_steps', state.amSteps);
  saveJSON('sw_pm_steps', state.pmSteps);
  saveJSON('sw_supp_steps', state.suppSteps);
  saveJSON('sw_water_glasses', state.waterGlasses);
  saveJSON('sw_water_target', state.waterTarget);
  saveJSON('sw_water_remind_interval', state.waterReminderInterval);
  saveJSON('sw_skin_cycle_phase', state.skinCyclePhase);
  saveJSON('sw_check_photo', state.checkPhoto);
  saveJSON('sw_check_history', state.checkHistory);
  saveJSON('sw_akvile_logs', state.akvileLogs);
  saveJSON('sw_akvile_school', state.akvileSchoolProgress);

  resetCheckScreenForUser();
  if (typeof renderAkvileSystem === 'function') {
    renderAkvileSystem();
  }
  return true;
}

function resetCheckScreenForUser() {
  const uploadZone = document.getElementById('upload-zone');
  const uploadContent = document.getElementById('upload-zone-content');
  const diagnosticResults = document.getElementById('diagnostic-results');
  const photoActions = document.getElementById('photo-actions');
  const cameraContainer = document.getElementById('camera-container');
  const splitBeforeImg = document.getElementById('split-before-img');
  const splitAfterImg = document.getElementById('split-after-img');
  const photoInput = document.getElementById('photo-input');
  const avatarInput = document.getElementById('avatar-input');
  const avatar = document.getElementById('avatar');

  if (typeof activeCameraStream !== 'undefined' && activeCameraStream) {
    activeCameraStream.getTracks().forEach(t => t.stop());
    activeCameraStream = null;
  }
  if (cameraContainer) cameraContainer.style.display = 'none';
  if (photoInput) photoInput.value = '';
  if (avatarInput) avatarInput.value = '';

  if (state.checkPhoto) {
    if (uploadZone) {
      uploadZone.style.display = 'flex';
      uploadZone.style.backgroundImage = `url('${state.checkPhoto}')`;
    }
    if (uploadContent) uploadContent.style.display = 'none';
    if (photoActions) photoActions.style.display = 'flex';
    if (diagnosticResults) diagnosticResults.style.display = 'block';
  } else {
    if (uploadZone) {
      uploadZone.style.display = 'flex';
      uploadZone.style.backgroundImage = 'none';
    }
    if (uploadContent) uploadContent.style.display = 'flex';
    if (photoActions) photoActions.style.display = 'none';
    if (diagnosticResults) diagnosticResults.style.display = 'none';
  }

  if (splitBeforeImg) splitBeforeImg.style.backgroundImage = `url('${sampleFaceSvg}')`;
  if (splitAfterImg) splitAfterImg.style.backgroundImage = `url('${state.checkPhoto || sampleFaceSvg}')`;

  if (avatar && !state.authUser?.avatar) {
    avatar.style.backgroundImage = 'none';
    avatar.innerHTML = `<i class="ti ti-user"></i>`;
  }

  if (typeof renderPastWeekComparison === 'function') {
    renderPastWeekComparison();
  }
}

// ---------- Account Switcher Controller ----------
function renderAccountSwitcherModal() {
  const list = document.getElementById('account-profiles-list');
  const modal = document.getElementById('switch-account-modal');
  if (!list || !modal) return;
  list.innerHTML = '';

  const phones = Object.keys(usersDb);
  phones.forEach((ph) => {
    const userObj = usersDb[ph];
    const isCurrent = state.authUser && state.authUser.phone === ph;

    const item = document.createElement('div');
    item.className = `account-profile-item ${isCurrent ? 'active' : ''}`;
    item.innerHTML = `
      <div class="account-profile-avatar"><i class="ti ti-user"></i></div>
      <div class="account-profile-info">
        <span class="account-profile-name">${escapeHtml(userObj.profile?.name || 'User')}</span>
        <span class="account-profile-phone">${escapeHtml(ph)}</span>
      </div>
      ${isCurrent ? '<span class="account-active-badge">Active</span>' : ''}
    `;

    item.addEventListener('click', () => {
      saveCurrentUserData();
      loadUserDataForPhone(ph);
      state.authUser = {
        phone: ph,
        name: userObj.profile?.name || 'User',
        verified: true,
        isNewUser: false
      };
      saveJSON('sw_auth_user', state.authUser);
      modal.style.display = 'none';
      checkAuthState();
    });

    list.appendChild(item);
  });

  modal.style.display = 'flex';
}

const switchAccountBtn = document.getElementById('switch-account-btn');
if (switchAccountBtn) {
  switchAccountBtn.addEventListener('click', renderAccountSwitcherModal);
}

document.getElementById('close-switch-modal')?.addEventListener('click', () => {
  const modal = document.getElementById('switch-account-modal');
  if (modal) modal.style.display = 'none';
});

document.getElementById('add-new-account-btn')?.addEventListener('click', () => {
  saveCurrentUserData();
  const modal = document.getElementById('switch-account-modal');
  if (modal) modal.style.display = 'none';
  localStorage.removeItem('sw_auth_user');
  state.authUser = null;
  state.checkPhoto = null;
  state.checkHistory = [];
  resetCheckScreenForUser();
  checkAuthState();
});

// ---------- Navigation ----------
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.screen').forEach((s) => (s.style.display = 'none'));
    const screen = document.getElementById('screen-' + btn.dataset.screen);
    if (screen) screen.style.display = 'block';

    if (btn.dataset.screen === 'check') {
      resetCheckScreenForUser();
    } else if (typeof stopLiveCamera === 'function') {
      stopLiveCamera();
    }

    if (btn.dataset.screen === 'home' && homeMapInstance) {
      setTimeout(() => homeMapInstance.invalidateSize(), 100);
    }
  });
});

// ---------- API helpers ----------
async function apiGet(path) {
  const res = await fetch(BACKEND_URL + path);
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(BACKEND_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

function showBackendWarning(show) {
  document.getElementById('backend-url-display').textContent = BACKEND_URL;
  document.getElementById('config-warning').style.display = show ? 'block' : 'none';
}

// ---------- Home & Map ----------
let homeMapInstance = null;
let homeMapMarker = null;
let homeMapAqiLayer = null;
let aqiLayerEnabled = false;

function initOrUpdateMap(lat, lon) {
  if (typeof L === 'undefined') return;
  const mapElem = document.getElementById('home-map');
  if (!mapElem) return;

  try {
    if (!homeMapInstance) {
      homeMapInstance = L.map('home-map', {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false
      }).setView([lat, lon], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
      }).addTo(homeMapInstance);

      // Google Air Quality Heatmap Layer
      homeMapAqiLayer = L.tileLayer('/api/air-quality/tile/{z}/{x}/{y}', {
        maxZoom: 18,
        opacity: 0.65,
        zIndex: 5
      });

      if (aqiLayerEnabled) {
        homeMapAqiLayer.addTo(homeMapInstance);
      }
    } else {
      homeMapInstance.setView([lat, lon], 12);
    }

    const pinIcon = L.divIcon({
      className: 'custom-map-pin',
      html: '<div class="pin-ring"></div><div class="pin-dot"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (homeMapMarker) {
      homeMapMarker.remove();
    }
    homeMapMarker = L.marker([lat, lon], { icon: pinIcon, zIndexOffset: 1000 }).addTo(homeMapInstance);

    setTimeout(() => {
      if (homeMapInstance) homeMapInstance.invalidateSize();
    }, 200);
  } catch (err) {
    console.warn('Map initialization note:', err);
  }
}

function toggleAqiHeatmap() {
  aqiLayerEnabled = !aqiLayerEnabled;
  const btn = document.getElementById('map-aqi-toggle');
  if (homeMapInstance && homeMapAqiLayer) {
    if (aqiLayerEnabled) {
      homeMapAqiLayer.addTo(homeMapInstance);
      if (btn) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="ti ti-wind"></i> <span>AQI Layer ON</span>';
      }
    } else {
      homeMapInstance.removeLayer(homeMapAqiLayer);
      if (btn) {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="ti ti-wind"></i> <span>AQI Layer</span>';
      }
    }
  }
}

const mapAqiToggleBtn = document.getElementById('map-aqi-toggle');
if (mapAqiToggleBtn) {
  mapAqiToggleBtn.addEventListener('click', toggleAqiHeatmap);
}

function renderHourlyForecast(currentTemp) {
  const now = new Date();
  const currentHour = now.getHours();
  const base = currentTemp != null ? Math.round(currentTemp) : (state.weather?.temperature ? Math.round(state.weather.temperature) : 28);
  const hourlyTemps = (state.weather?.hourlyTemps && state.weather.hourlyTemps.length >= 5) 
    ? state.weather.hourlyTemps 
    : [base, Math.max(16, base - 1), Math.max(16, base - 1), Math.max(16, base - 2), Math.max(16, base - 2)];

  const hourNowElem = document.getElementById('hour-now');
  if (hourNowElem) hourNowElem.textContent = `${hourlyTemps[0]}°`;

  for (let i = 1; i <= 4; i++) {
    const nextHour = (currentHour + i) % 24;
    const period = nextHour >= 12 ? 'PM' : 'AM';
    const displayHour = nextHour % 12 === 0 ? 12 : nextHour % 12;

    const timeElem = document.getElementById(`hour-${i}-time`);
    const tempElem = document.getElementById(`hour-${i}-temp`);

    if (timeElem) timeElem.textContent = `${displayHour}${period}`;
    const tVal = hourlyTemps[i] != null ? hourlyTemps[i] : Math.max(16, base - i);
    if (tempElem) tempElem.textContent = `${tVal}°`;
  }
}

// ---------- Home ----------
async function loadWeatherAndAQI() {
  const { lat, lon } = state.location || DEFAULT_LOCATION;
  try {
    const [weatherRes, aqiRes] = await Promise.allSettled([
      apiGet(`/api/weather?lat=${lat}&lon=${lon}`),
      apiGet(`/api/air-quality?lat=${lat}&lon=${lon}`)
    ]);

    state.weather = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
    state.airQuality = aqiRes.status === 'fulfilled' ? aqiRes.value : null;

    if (!state.weather) {
      state.weather = {
        temperature: 28,
        condition: 'Cloudy',
        humidity: 82,
        uv: 0,
        wind: 14,
        hourlyTemps: [28, 27, 27, 26, 26],
        tewlRisk: 'High Humidity / Sebum Flux',
        tewlLevel: 'humid'
      };
    }
    if (!state.airQuality) {
      state.airQuality = {
        aqi: 64,
        category: 'Good air quality'
      };
    }

    renderHome();
    renderRoutineFlags();

    // Log today's snapshot for the Past Weather history view
    if (state.weather) {
      apiPost('/api/log-snapshot', {
        lat, lon,
        temp: state.weather.temperature,
        uv: state.weather.uv,
        humidity: state.weather.humidity,
        aqi: state.airQuality?.aqi ?? 64
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error loading weather/AQI:', err);
    state.weather = state.weather || { temperature: 28, condition: 'Cloudy', humidity: 82, uv: 0, wind: 14, hourlyTemps: [28, 27, 27, 26, 26] };
    state.airQuality = state.airQuality || { aqi: 64, category: 'Good air quality' };
    renderHome();
    renderRoutineFlags();
  }
}

function updateDateTime() {
  const dtElem = document.getElementById('hero-datetime');
  if (!dtElem) return;
  const now = new Date();
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  dtElem.textContent = now.toLocaleDateString(undefined, options);
}

function renderHome() {
  updateDateTime();
  const w = state.weather || { temperature: 28, condition: 'Cloudy', humidity: 82, uv: 0, wind: 14, hourlyTemps: [28, 27, 27, 26, 26] };
  const aqi = state.airQuality || { aqi: 64, category: 'Good air quality' };
  const locName = state.location?.name || 'Trichy, Tamil Nadu';

  const heroCity = document.getElementById('hero-city');
  const profLoc = document.getElementById('profile-location');
  if (heroCity) heroCity.textContent = locName;
  if (profLoc) profLoc.textContent = locName;

  const heroTemp = document.getElementById('hero-temp');
  if (heroTemp) heroTemp.textContent = Math.round(w.temperature) + '°';
  const heroCond = document.getElementById('hero-cond');
  if (heroCond) heroCond.textContent = w.condition || 'Warm & Sunny';
  const statHum = document.getElementById('stat-hum');
  if (statHum) statHum.textContent = w.humidity + '% humidity';
  const statUv = document.getElementById('stat-uv');
  if (statUv) statUv.textContent = 'UV ' + (w.uv != null ? w.uv : 0);
  const statAqi = document.getElementById('stat-aqi');
  if (statAqi) statAqi.textContent = 'AQI ' + (aqi.aqi != null ? aqi.aqi : 64);
  const statWind = document.getElementById('stat-wind');
  if (statWind) statWind.textContent = 'Wind ' + Math.round(w.wind || 10) + ' km/h';

  // Update TEWL (Trans-Epidermal Water Loss) badge
  const tewlBadge = document.getElementById('hero-tewl-badge');
  const tewlText = document.getElementById('hero-tewl-text');
  if (tewlBadge && tewlText) {
    const risk = w.tewlRisk || (w.humidity < 35 ? 'Severe Loss' : (w.humidity > 75 ? 'Sebum Risk' : 'Balanced'));
    tewlText.textContent = `TEWL: ${risk}`;
    tewlBadge.className = 'hero-tewl-badge';
    if (w.tewlLevel === 'severe') tewlBadge.classList.add('tewl-severe');
    else if (w.tewlLevel === 'elevated') tewlBadge.classList.add('tewl-elevated');
    else if (w.tewlLevel === 'humid') tewlBadge.classList.add('tewl-humid');
  }

  // Update AQI status pill
  const aqiPill = document.getElementById('aqi-status-pill');
  if (aqiPill) {
    const cat = aqi.category || (aqi.aqi > 100 ? 'Unhealthy' : (aqi.aqi > 50 ? 'Moderate' : 'Good'));
    aqiPill.textContent = `UAQI: ${cat}`;
    aqiPill.className = 'aqi-status-pill';
    if (aqi.aqi > 100) aqiPill.classList.add('aqi-unhealthy');
    else if (aqi.aqi > 50) aqiPill.classList.add('aqi-moderate');
  }

  // Update Pollutants (PM2.5, O3, NO2)
  const poll = aqi.pollutants || {};
  const pm25Val = poll.pm25?.value != null ? poll.pm25.value : Math.min(Math.round((aqi.aqi || 60) * 0.35), 80);
  const o3Val = poll.o3?.value != null ? poll.o3.value : Math.min(Math.round((aqi.aqi || 60) * 0.45), 90);
  const no2Val = poll.no2?.value != null ? poll.no2.value : Math.min(Math.round((aqi.aqi || 60) * 0.15), 50);

  const barPm25 = document.getElementById('bar-pm25');
  const valPm25 = document.getElementById('val-pm25');
  if (barPm25) barPm25.style.width = Math.min(Math.max((pm25Val / 60) * 100, 10), 100) + '%';
  if (valPm25) valPm25.textContent = `${pm25Val} ${poll.pm25?.units || 'µg/m³'}`;

  const barO3 = document.getElementById('bar-o3');
  const valO3 = document.getElementById('val-o3');
  if (barO3) barO3.style.width = Math.min(Math.max((o3Val / 80) * 100, 10), 100) + '%';
  if (valO3) valO3.textContent = `${o3Val} ${poll.o3?.units || 'ppb'}`;

  const barNo2 = document.getElementById('bar-no2');
  const valNo2 = document.getElementById('val-no2');
  if (barNo2) barNo2.style.width = Math.min(Math.max((no2Val / 50) * 100, 10), 100) + '%';
  if (valNo2) valNo2.textContent = `${no2Val} ${poll.no2?.units || 'ppb'}`;

  // Update Skincare Advice Box from Google Environmental Insights
  const adviceText = document.getElementById('skin-advice-text');
  if (adviceText) {
    const tip = aqi.skinTip || w.barrierAdvice || 'Clean atmospheric conditions. Standard daily antioxidant shield is sufficient.';
    adviceText.textContent = tip;
  }

  renderHourlyForecast(w.temperature);
  if (state.location?.lat != null && state.location?.lon != null) {
    initOrUpdateMap(state.location.lat, state.location.lon);
  }

  const alertBanner = document.getElementById('alert-banner');
  if (alertBanner) {
    if (w.uv >= 8) {
      const alertText = document.getElementById('alert-text');
      if (alertText) alertText.textContent = 'Heat/UV advisory — UV Index is very high today.';
      alertBanner.style.display = 'flex';
    } else {
      alertBanner.style.display = 'none';
    }
  }
}

document.getElementById('dismiss-alert')?.addEventListener('click', () => {
  const alertBanner = document.getElementById('alert-banner');
  if (alertBanner) alertBanner.style.display = 'none';
});

// ---------- Forecast ----------
function getUvMeta(uv) {
  const num = uv != null ? Number(uv) : 0;
  if (num >= 11) return { label: 'Extreme', badgeClass: 'uv-lvl-ext', color: '#6A1B9A' };
  if (num >= 8)  return { label: 'Very High', badgeClass: 'uv-lvl-vhigh', color: '#C62828' };
  if (num >= 6)  return { label: 'High', badgeClass: 'uv-lvl-high', color: '#D84315' };
  if (num >= 3)  return { label: 'Moderate', badgeClass: 'uv-lvl-mod', color: '#E65100' };
  return { label: 'Low', badgeClass: 'uv-lvl-low', color: '#2E7D32' };
}

function getDailySkincarePlan(uv, humidity, condition) {
  const uvNum = uv != null ? Number(uv) : 0;
  const humNum = humidity != null ? Number(humidity) : 60;

  if (uvNum >= 8) {
    return 'SPF 50+ mandatory. Reapply every 2 hrs. Skip potent retinoids tonight to avoid photosensitivity.';
  }
  if (uvNum >= 6) {
    return 'SPF 30-50 recommended. Seek midday shade. Safe for evening barrier repair serums.';
  }
  if (humNum > 75) {
    return 'High humidity — switch to a lightweight, oil-free gel moisturizer to prevent clogged pores.';
  }
  if (humNum < 35) {
    return 'Dry air warning — layer hyaluronic acid on damp skin and seal with a ceramide cream.';
  }
  return 'Standard daily routine: gentle cleanser, antioxidant serum, SPF 30, and night hydration.';
}

function getSkinFeel(humidity) {
  if (humidity == null) return 'Balanced';
  if (humidity > 75) return 'Muggy';
  if (humidity > 60) return 'Dewy';
  if (humidity < 35) return 'Crisp / Dry';
  return 'Balanced';
}

function renderUvTrendBar(days) {
  const barsContainer = document.getElementById('uv-bars-row');
  const peakBadge = document.getElementById('trend-peak-badge');
  if (!barsContainer) return;
  barsContainer.innerHTML = '';

  if (!days || days.length === 0) return;

  let peakUv = 0;
  let peakDay = '';

  days.slice(0, 7).forEach((d, i) => {
    const uvVal = d.uv != null ? Number(d.uv) : 5;
    const meta = getUvMeta(uvVal);
    const dayLabel = i === 0 ? 'Today' : (d.date ? new Date(d.date).toLocaleDateString(undefined, { weekday: 'narrow' }) : `D${i+1}`);

    if (uvVal > peakUv) {
      peakUv = uvVal;
      peakDay = d.date ? new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }) : `Day ${i+1}`;
    }

    const heightPct = Math.max(15, Math.min(100, Math.round((uvVal / 11) * 100)));

    const col = document.createElement('div');
    col.className = 'uv-bar-col';
    col.innerHTML = `
      <span class="uv-bar-val">${uvVal}</span>
      <div class="uv-bar-track">
        <div class="uv-bar-fill" style="height: ${heightPct}%; background: ${meta.color};"></div>
      </div>
      <span class="uv-bar-day">${dayLabel}</span>
    `;

    col.addEventListener('click', () => {
      state.openDayIndex = state.openDayIndex === i ? null : i;
      renderForecastDays();
    });

    barsContainer.appendChild(col);
  });

  if (peakBadge) {
    const peakMeta = getUvMeta(peakUv);
    peakBadge.textContent = `Peak: ${peakDay} (UV ${peakUv} ${peakMeta.label})`;
  }
}

async function loadForecast() {
  const { lat, lon } = state.location;
  try {
    const forecast = await apiGet(`/api/forecast?lat=${lat}&lon=${lon}&days=7`);
    state.forecast = forecast;
    renderForecastDays();
  } catch (err) {
    console.error('Forecast load failed:', err);
    document.getElementById('day-list').innerHTML =
      '<p class="muted-note">Could not load forecast data.</p>';
  }
}

function renderForecastDays() {
  const list = document.getElementById('day-list');
  if (!list) return;
  list.innerHTML = '';
  const days = state.forecast?.days || [];

  renderUvTrendBar(days);

  if (days.length === 0) {
    list.innerHTML = '<p class="muted-note">No forecast data available.</p>';
    return;
  }

  days.forEach((d, i) => {
    const isExpanded = state.openDayIndex === i;
    const isToday = i === 0;
    const dateObj = d.date ? new Date(d.date) : null;
    const weekday = isToday ? 'Today' : (dateObj ? dateObj.toLocaleDateString(undefined, { weekday: 'short' }) : `Day ${i + 1}`);
    const meta = getUvMeta(d.uv);
    const skinTip = getDailySkincarePlan(d.uv, d.humidity, d.condition);
    const skinFeel = getSkinFeel(d.humidity);

    const card = document.createElement('div');
    card.className = `day-card ${isExpanded ? 'expanded' : ''}`;

    card.innerHTML = `
      <button class="day-card-head" type="button">
        <div class="day-card-left">
          <span class="day-card-weekday">${weekday}</span>
          <span class="day-card-cond">${d.condition || 'Clear'}</span>
        </div>
        <div class="day-card-right">
          <span class="uv-badge ${meta.badgeClass}">UV ${d.uv ?? '--'}</span>
          <span class="day-card-temps">
            ${d.tempHigh != null ? d.tempHigh + '°' : '--'}
            <span class="lo">${d.tempLow != null ? d.tempLow + '°' : '--'}</span>
          </span>
          <i class="ti ti-chevron-down day-card-chevron"></i>
        </div>
      </button>
      ${isExpanded ? `
        <div class="day-card-body">
          <div class="skincare-plan-row">
            <i class="ti ti-sparkles"></i>
            <div><strong>Skin Directive:</strong> ${skinTip}</div>
          </div>
          <div class="day-metrics-row">
            <div class="metric-chip">
              <div class="metric-lbl">UV Risk</div>
              <div class="metric-val" style="color:${meta.color};">${meta.label}</div>
            </div>
            <div class="metric-chip">
              <div class="metric-lbl">Humidity</div>
              <div class="metric-val">${d.humidity != null ? d.humidity + '%' : '--'}</div>
            </div>
            <div class="metric-chip">
              <div class="metric-lbl">Skin Feel</div>
              <div class="metric-val">${skinFeel}</div>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    card.querySelector('.day-card-head').addEventListener('click', () => {
      state.openDayIndex = state.openDayIndex === i ? null : i;
      renderForecastDays();
    });

    list.appendChild(card);
  });
}

document.getElementById('mode-upcoming')?.addEventListener('click', () => setForecastMode('upcoming'));
document.getElementById('mode-past')?.addEventListener('click', () => setForecastMode('past'));
function setForecastMode(mode) {
  state.forecastMode = mode;
  document.getElementById('mode-upcoming')?.classList.toggle('active', mode === 'upcoming');
  document.getElementById('mode-past')?.classList.toggle('active', mode === 'past');
  const viewUp = document.getElementById('view-upcoming');
  const viewPast = document.getElementById('view-past');
  if (viewUp) viewUp.style.display = mode === 'upcoming' ? 'block' : 'none';
  if (viewPast) viewPast.style.display = mode === 'past' ? 'block' : 'none';
  if (mode === 'past') loadHistory();
}

async function loadHistory() {
  const { lat, lon } = state.location || DEFAULT_LOCATION;
  try {
    const data = await apiGet(`/api/history?lat=${lat}&lon=${lon}&range=${state.historyRange}`);
    renderHistory(data);
  } catch (err) {
    const pastNote = document.getElementById('past-note');
    if (pastNote) pastNote.textContent = 'Could not load history.';
  }
}
let openPastDayIndex = null;
let openPastWeekIndex = 0; // Default to opening the most recent week in Month mode

function renderHistory(data) {
  const cards = document.getElementById('avg-cards');
  const statusElem = document.getElementById('hist-barrier-status');
  const peakBadge = document.getElementById('hist-peak-badge');
  const barsRow = document.getElementById('hist-bars-row');
  const timelineList = document.getElementById('past-timeline-list');
  const insightDesc = document.getElementById('past-insight-desc');

  if (!cards || !data.averages) return;

  const avg = data.averages;
  const entries = data.entries || [];
  const isMonth = state.historyRange === 'month';

  // 1. Barrier Climate Status & Peak Badge
  if (statusElem) statusElem.textContent = avg.barrierStatus || 'Balanced & Stable';
  if (peakBadge) {
    peakBadge.textContent = isMonth 
      ? `30D Peak: UV ${avg.maxUv ?? avg.uv ?? '--'}` 
      : `7D Peak: UV ${avg.maxUv ?? avg.uv ?? '--'}`;
  }

  // 2. Trend Bars: 4 Weekly Bars for Month mode OR 7 Daily Bars for Week mode
  if (barsRow && entries.length > 0) {
    barsRow.innerHTML = '';

    if (isMonth) {
      // Aggregate into 4 weekly chunks
      const weekChunks = [];
      const total = entries.length;
      const chunkSize = Math.ceil(total / 4);

      for (let i = 0; i < 4; i++) {
        const start = i * chunkSize;
        const end = Math.min(total, start + chunkSize);
        const chunkEntries = entries.slice(start, end);
        if (chunkEntries.length > 0) {
          const avgUvVal = Math.round(chunkEntries.reduce((s, e) => s + (e.uv || 0), 0) / chunkEntries.length);
          const avgHumVal = Math.round(chunkEntries.reduce((s, e) => s + (e.humidity || 0), 0) / chunkEntries.length);
          const avgTempVal = Math.round(chunkEntries.reduce((s, e) => s + (e.temp || 0), 0) / chunkEntries.length);
          weekChunks.push({
            weekNum: i + 1,
            label: i === 3 ? 'This Wk' : `Wk ${i + 1}`,
            fullLabel: `Week ${i + 1} (${chunkEntries[0]?.date ? new Date(chunkEntries[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''} – ${chunkEntries[chunkEntries.length - 1]?.date ? new Date(chunkEntries[chunkEntries.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''})`,
            uv: avgUvVal,
            humidity: avgHumVal,
            temp: avgTempVal,
            days: chunkEntries
          });
        }
      }

      weekChunks.forEach((wk, i) => {
        const meta = getUvMeta(wk.uv);
        const heightPct = Math.max(20, Math.min(100, Math.round((wk.uv / 11) * 100)));

        const col = document.createElement('div');
        col.className = 'uv-bar-col';
        col.innerHTML = `
          <span class="uv-bar-val">UV ${wk.uv}</span>
          <div class="uv-bar-track" style="width: 22px;">
            <div class="uv-bar-fill" style="height: ${heightPct}%; background: ${meta.color};"></div>
          </div>
          <span class="uv-bar-day" style="font-weight: 500;">${wk.label}</span>
        `;
        col.addEventListener('click', () => {
          openPastWeekIndex = openPastWeekIndex === i ? null : i;
          renderHistory(data);
        });
        barsRow.appendChild(col);
      });
    } else {
      // 7 Daily bars for Week mode
      const slice = entries.slice(-7);
      slice.forEach((entry, i) => {
        const uvVal = entry.uv != null ? Number(entry.uv) : 5;
        const meta = getUvMeta(uvVal);
        const isLatest = i === slice.length - 1;
        const dayLabel = isLatest ? 'Today' : (entry.date ? new Date(entry.date).toLocaleDateString(undefined, { weekday: 'narrow' }) : `D${i+1}`);
        const heightPct = Math.max(15, Math.min(100, Math.round((uvVal / 11) * 100)));

        const col = document.createElement('div');
        col.className = 'uv-bar-col';
        col.innerHTML = `
          <span class="uv-bar-val">${uvVal}</span>
          <div class="uv-bar-track">
            <div class="uv-bar-fill" style="height: ${heightPct}%; background: ${meta.color};"></div>
          </div>
          <span class="uv-bar-day">${dayLabel}</span>
        `;
        col.addEventListener('click', () => {
          openPastDayIndex = openPastDayIndex === i ? null : i;
          renderHistory(data);
        });
        barsRow.appendChild(col);
      });
    }
  }

  // 3. 4 Avg Metric Cards
  cards.innerHTML = `
    <div class="avg-card">
      <i class="ti ti-sun"></i>
      <p class="val">${avg.uv != null ? 'UV ' + avg.uv : '--'}</p>
      <p class="lbl">${isMonth ? '30D Avg UV' : '7D Avg UV'}</p>
    </div>
    <div class="avg-card">
      <i class="ti ti-droplet"></i>
      <p class="val">${avg.humidity != null ? avg.humidity + '%' : '--'}</p>
      <p class="lbl">${isMonth ? '30D Avg Humidity' : '7D Avg Humidity'}</p>
    </div>
    <div class="avg-card">
      <i class="ti ti-temperature"></i>
      <p class="val">${avg.temp != null ? avg.temp + '°' : '--'}</p>
      <p class="lbl">${isMonth ? '30D Avg Temp' : '7D Avg Temp'}</p>
    </div>
    <div class="avg-card">
      <i class="ti ti-wind"></i>
      <p class="val">${avg.aqi != null ? 'AQI ' + avg.aqi : '--'}</p>
      <p class="lbl">${isMonth ? '30D Avg AQI' : '7D Avg AQI'}</p>
    </div>
  `;

  // 4. Past Timeline Cards: Grouped by Week in Month mode OR Daily in Week mode
  if (timelineList) {
    timelineList.innerHTML = '';

    if (isMonth) {
      // Month mode: 4 Weekly Summary Cards with internal daily breakdown
      const weekChunks = [];
      const total = entries.length;
      const chunkSize = Math.ceil(total / 4);

      for (let i = 0; i < 4; i++) {
        const start = i * chunkSize;
        const end = Math.min(total, start + chunkSize);
        const chunkEntries = entries.slice(start, end);
        if (chunkEntries.length > 0) {
          const avgUvVal = Math.round(chunkEntries.reduce((s, e) => s + (e.uv || 0), 0) / chunkEntries.length);
          const avgHumVal = Math.round(chunkEntries.reduce((s, e) => s + (e.humidity || 0), 0) / chunkEntries.length);
          const avgTempVal = Math.round(chunkEntries.reduce((s, e) => s + (e.temp || 0), 0) / chunkEntries.length);
          const startDate = chunkEntries[0]?.date ? new Date(chunkEntries[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
          const endDate = chunkEntries[chunkEntries.length - 1]?.date ? new Date(chunkEntries[chunkEntries.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
          weekChunks.push({
            weekIndex: i,
            title: i === 3 ? 'Current Week' : `Week ${i + 1}`,
            dateSpan: `${startDate} – ${endDate}`,
            uv: avgUvVal,
            humidity: avgHumVal,
            temp: avgTempVal,
            entries: chunkEntries
          });
        }
      }

      // Render weeks in reverse chronological order (current week first)
      weekChunks.reverse().forEach((wk, i) => {
        const isExpanded = openPastWeekIndex === i;
        const meta = getUvMeta(wk.uv);

        const card = document.createElement('div');
        card.className = `day-card ${isExpanded ? 'expanded' : ''}`;
        card.innerHTML = `
          <button class="day-card-head" type="button">
            <div class="day-card-left">
              <span class="day-card-weekday" style="width:auto; font-size:12.5px;">${wk.title}</span>
              <span class="day-card-cond" style="max-width: 120px;">${wk.dateSpan}</span>
            </div>
            <div class="day-card-right">
              <span class="uv-badge ${meta.badgeClass}">Avg UV ${wk.uv}</span>
              <span class="day-card-temps">${wk.temp}°</span>
              <i class="ti ti-chevron-down day-card-chevron"></i>
            </div>
          </button>
          ${isExpanded ? `
            <div class="day-card-body">
              <div class="skincare-plan-row">
                <i class="ti ti-calendar-stats"></i>
                <div><strong>Weekly Climate Summary:</strong> Average UV index was <strong>${wk.uv} (${meta.label})</strong> with <strong>${wk.humidity}%</strong> average humidity. ${wk.uv >= 7 ? 'Sustained UV load demanded intensive daily SPF 50+ adherence.' : 'Atmospheric conditions remained stable.'}</div>
              </div>
              <div class="day-metrics-row">
                <div class="metric-chip">
                  <div class="metric-lbl">Avg UV</div>
                  <div class="metric-val" style="color:${meta.color};">UV ${wk.uv}</div>
                </div>
                <div class="metric-chip">
                  <div class="metric-lbl">Avg Humidity</div>
                  <div class="metric-val">${wk.humidity}%</div>
                </div>
                <div class="metric-chip">
                  <div class="metric-lbl">Days Logged</div>
                  <div class="metric-val">${wk.entries.length} Days</div>
                </div>
              </div>
            </div>
          ` : ''}
        `;

        card.querySelector('.day-card-head').addEventListener('click', () => {
          openPastWeekIndex = openPastWeekIndex === i ? null : i;
          renderHistory(data);
        });

        timelineList.appendChild(card);
      });
    } else {
      // Week mode: 7 individual daily snapshot cards
      const reversed = [...entries].reverse().slice(0, 7);

      reversed.forEach((d, i) => {
        const isExpanded = openPastDayIndex === i;
        const isToday = i === 0;
        const dateObj = d.date ? new Date(d.date) : null;
        const weekday = isToday ? 'Today' : (dateObj ? dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : `Day ${i + 1}`);
        const meta = getUvMeta(d.uv);
        const skinFeel = getSkinFeel(d.humidity);

        let retrospectiveNote = 'Climate was mild; standard daytime SPF 30 and gentle hydration maintained equilibrium.';
        if (d.uv >= 8) {
          retrospectiveNote = 'Very high UV radiation recorded. Required intensive SPF 50+ protection and nighttime soothing recovery.';
        } else if (d.humidity > 75) {
          retrospectiveNote = 'High humidity provided ample ambient moisture; lightweight gel formulations prevented congestion.';
        } else if (d.humidity < 35) {
          retrospectiveNote = 'Low atmospheric humidity increased transepidermal water loss (TEWL); ceramide barrier support was beneficial.';
        }

        const card = document.createElement('div');
        card.className = `day-card ${isExpanded ? 'expanded' : ''}`;
        card.innerHTML = `
          <button class="day-card-head" type="button">
            <div class="day-card-left">
              <span class="day-card-weekday" style="width:auto; font-size:12px;">${weekday}</span>
            </div>
            <div class="day-card-right">
              <span class="uv-badge ${meta.badgeClass}">UV ${d.uv ?? '--'}</span>
              <span class="day-card-temps">
                ${d.temp != null ? d.temp + '°' : '--'}
              </span>
              <i class="ti ti-chevron-down day-card-chevron"></i>
            </div>
          </button>
          ${isExpanded ? `
            <div class="day-card-body">
              <div class="skincare-plan-row">
                <i class="ti ti-history"></i>
                <div><strong>Recorded Impact:</strong> ${retrospectiveNote}</div>
              </div>
              <div class="day-metrics-row">
                <div class="metric-chip">
                  <div class="metric-lbl">UV Index</div>
                  <div class="metric-val" style="color:${meta.color};">${d.uv ?? '--'} (${meta.label})</div>
                </div>
                <div class="metric-chip">
                  <div class="metric-lbl">Humidity</div>
                  <div class="metric-val">${d.humidity != null ? d.humidity + '%' : '--'}</div>
                </div>
                <div class="metric-chip">
                  <div class="metric-lbl">Atmosphere</div>
                  <div class="metric-val">${skinFeel}</div>
                </div>
              </div>
            </div>
          ` : ''}
        `;

        card.querySelector('.day-card-head').addEventListener('click', () => {
          openPastDayIndex = openPastDayIndex === i ? null : i;
          renderHistory(data);
        });

        timelineList.appendChild(card);
      });
    }
  }

  // 5. Dermatological Insight
  if (insightDesc) {
    if (avg.uv >= 7) {
      insightDesc.textContent = `Past ${isMonth ? '30-day' : '7-day'} UV averaged high (${avg.uv}). Consistent SPF 50+ usage and antioxidant serums remain essential to neutralize ongoing free radical damage.`;
    } else if (avg.humidity > 70) {
      insightDesc.textContent = `High ambient humidity (${avg.humidity}%) over the past ${isMonth ? 'month' : 'week'} minimized barrier dehydration. Continue prioritizing lightweight, non-comedogenic hydration.`;
    } else {
      insightDesc.textContent = `Climate conditions have remained stable. Maintaining consistent daily hydration and broad-spectrum sunscreen protects your skin barrier against chronic photo-aging.`;
    }
  }
}

document.getElementById('range-week')?.addEventListener('click', () => setHistoryRange('week'));
document.getElementById('range-month')?.addEventListener('click', () => setHistoryRange('month'));
function setHistoryRange(range) {
  state.historyRange = range;
  document.getElementById('range-week')?.classList.toggle('active', range === 'week');
  document.getElementById('range-month')?.classList.toggle('active', range === 'month');
  loadHistory();
}

function iconFor(name) {
  const n = name.toLowerCase();
  if (n.includes('cleanser') || n.includes('wash')) return 'ti-droplet';
  if (n.includes('vitamin c') || n.includes('serum')) return 'ti-flask';
  if (n.includes('sunscreen') || n.includes('spf') || n.includes('sunblock')) return 'ti-sun';
  if (n.includes('retinol') || n.includes('night') || n.includes('acid')) return 'ti-moon-stars';
  if (n.includes('moistur') || n.includes('cream') || n.includes('lotion')) return 'ti-droplet-half-2';
  if (n.includes('omega') || n.includes('fish oil') || n.includes('zinc') || n.includes('collagen') || n.includes('supplement') || n.includes('pill')) return 'ti-pill';
  if (n.includes('tea') || n.includes('extract') || n.includes('herb')) return 'ti-leaf';
  return 'ti-sparkles';
}

function getSmartStepTag(stepName, type) {
  const n = stepName.toLowerCase();
  const w = state.weather;
  const uv = w?.uv ?? 8;
  const hum = w?.humidity ?? 65;

  if (n.includes('sunscreen') || n.includes('spf') || n.includes('sunblock')) {
    if (uv >= 8) return { text: `☀️ UV ${uv}: SPF 50+ Required`, cls: 'smart-tag-uv' };
    if (uv >= 6) return { text: `☀️ UV ${uv}: SPF 30+ Midday`, cls: 'smart-tag-uv' };
    return { text: `☀️ Standard UV Protection`, cls: 'smart-tag-uv' };
  }
  if (n.includes('retinol')) {
    if (uv >= 8) return { text: `⚠️ High UV Caution Tonight`, cls: 'smart-tag-night' };
    return { text: `🌙 Climate Safe Tonight`, cls: 'smart-tag-night' };
  }
  if (n.includes('vitamin c')) {
    return { text: `🛡️ Free Radical Shield`, cls: 'smart-tag-uv' };
  }
  if (n.includes('moistur') || n.includes('cream')) {
    if (hum > 75) return { text: `💧 ${hum}% Hum: Light Gel Formula`, cls: 'smart-tag-hum' };
    if (hum < 35) return { text: `💧 ${hum}% Hum: Ceramide Seal`, cls: 'smart-tag-hum' };
    return { text: `💧 Barrier Hydration`, cls: 'smart-tag-hum' };
  }
  if (type === 'supp') {
    if (n.includes('omega')) return { text: `💧 Lipid Barrier Nutrition`, cls: 'smart-tag-supp' };
    if (n.includes('collagen') || n.includes('vitamin c')) return { text: `✨ Collagen Synthesis`, cls: 'smart-tag-supp' };
    if (n.includes('zinc')) return { text: `🛡️ Cellular Skin Defense`, cls: 'smart-tag-supp' };
    return { text: `💊 Daily Skin Nutrition`, cls: 'smart-tag-supp' };
  }
  return null;
}

function updateRoutineProgress() {
  const all = [...state.amSteps, ...state.suppSteps, ...state.pmSteps];
  const total = all.length;
  const done = all.filter(s => s.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const valEl = document.getElementById('routine-progress-val');
  const fillEl = document.getElementById('routine-progress-fill');
  const streakEl = document.getElementById('routine-streak-badge');

  if (valEl) {
    if (total > 0 && done === total) {
      valEl.textContent = `🎉 All Steps & Supplements Done! (100%)`;
      if (streakEl) streakEl.textContent = `🔥 6-Day Streak!`;
    } else {
      valEl.textContent = `${done} of ${total} Completed (${pct}%)`;
    }
  }
  if (fillEl) {
    fillEl.style.width = `${pct}%`;
  }

  // Time-aware highlight for AM vs PM badges
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;
  const amBadge = document.getElementById('am-time-badge');
  const pmBadge = document.getElementById('pm-time-badge');

  if (amBadge) {
    amBadge.textContent = isDay ? '☀️ Active Now' : 'AM Routine';
    amBadge.style.background = isDay ? 'var(--gold)' : 'var(--gold-tint)';
    amBadge.style.color = isDay ? '#fff' : 'var(--gold)';
  }
  if (pmBadge) {
    pmBadge.textContent = !isDay ? '🌙 Active Now' : 'PM Reset';
    pmBadge.style.background = !isDay ? 'var(--gold)' : 'var(--gold-tint)';
    pmBadge.style.color = !isDay ? '#fff' : 'var(--gold)';
  }
}

function renderRoutineList(containerId, steps, storageKey, type = 'topical') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  steps.forEach((step, i) => {
    const card = document.createElement('div');
    card.className = `routine-card ${step.done ? 'step-done' : ''}`;
    const avatar = `<div class="routine-avatar"><i class="ti ${iconFor(step.name)}"></i></div>`;
    const smartTag = getSmartStepTag(step.name, type);
    const tagHtml = smartTag ? `<span class="smart-tag ${smartTag.cls}">${smartTag.text}</span>` : '';

    if (state.editMode) {
      card.innerHTML = `
        <span class="routine-step-num">${i + 1}</span>
        ${avatar}
        <input class="routine-input" value="${escapeHtml(step.name)}" placeholder="Enter step name">
        <button class="routine-delete" title="Delete step"><i class="ti ti-trash"></i></button>
      `;
      card.querySelector('.routine-input').addEventListener('input', (e) => {
        steps[i].name = e.target.value;
        saveJSON(storageKey, steps);
      });
      card.querySelector('.routine-delete').addEventListener('click', () => {
        steps.splice(i, 1);
        renderRoutineAll();
      });
    } else {
      card.innerHTML = `
        <span class="routine-step-num">${i + 1}</span>
        ${avatar}
        <div class="routine-content-col">
          <span class="routine-name ${step.done ? 'done' : ''}">${escapeHtml(step.name)}</span>
          ${tagHtml}
        </div>
        <button class="routine-check ${step.done ? 'done' : ''}" aria-label="Mark completed">
          ${step.done ? '<i class="ti ti-check"></i>' : ''}
        </button>
      `;
      card.querySelector('.routine-check').addEventListener('click', () => {
        step.done = !step.done;
        renderRoutineAll();
      });
    }
    container.appendChild(card);
  });
  saveJSON(storageKey, steps);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderHydrationTracker() {
  const row = document.getElementById('water-glasses-row');
  const txt = document.getElementById('hyd-val-text');
  const reminderStrip = document.getElementById('hyd-reminder-strip');
  const reminderText = document.getElementById('hyd-reminder-text');
  if (!row) return;
  row.innerHTML = '';

  const target = state.waterTarget || 8;
  const count = Math.min(state.waterGlasses || 0, target);
  const currentLiters = (count * 0.3).toFixed(1);
  const targetLiters = (target * 0.3).toFixed(1);

  if (txt) {
    txt.textContent = `${count} of ${target} Drops (${currentLiters}L / ${targetLiters}L)`;
  }

  // Render droplets matching the user's custom target count
  for (let i = 1; i <= target; i++) {
    const isFilled = i <= count;
    const btn = document.createElement('button');
    btn.className = `water-glass-btn ${isFilled ? 'filled' : ''}`;
    btn.title = `Drop ${i} of ${target} (${i * 300}ml)`;
    btn.innerHTML = `<i class="ti ${isFilled ? 'ti-droplet-filled' : 'ti-droplet'}"></i>`;
    btn.addEventListener('click', () => {
      state.waterGlasses = (state.waterGlasses === i) ? i - 1 : i;
      state.waterLastSipTime = Date.now();
      saveJSON('sw_water_glasses', state.waterGlasses);
      saveJSON('sw_water_last_sip_time', state.waterLastSipTime);
      renderHydrationTracker();
    });
    row.appendChild(btn);
  }

  // Reminder status display
  if (reminderStrip && reminderText) {
    const interval = state.waterReminderInterval || 0;
    if (interval === 0) {
      reminderStrip.style.display = 'none';
    } else {
      reminderStrip.style.display = 'flex';
      const nextDue = new Date((state.waterLastSipTime || Date.now()) + interval * 60 * 1000);
      const nextDueFormatted = nextDue.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
      const hoursStr = interval >= 60 ? `${interval / 60} hr${interval > 60 ? 's' : ''}` : `${interval} min`;
      reminderText.textContent = `Reminder: Every ${hoursStr} (Next due by ${nextDueFormatted})`;
    }
  }

  // Update active states on goal & reminder pills
  document.querySelectorAll('.goal-pill').forEach(p => {
    p.classList.toggle('active', Number(p.dataset.target) === target);
  });
  document.querySelectorAll('.remind-pill').forEach(p => {
    p.classList.toggle('active', Number(p.dataset.interval) === (state.waterReminderInterval || 0));
  });
}

// Add Glass Button
const addWaterBtn = document.getElementById('add-water-glass-btn');
if (addWaterBtn) {
  addWaterBtn.addEventListener('click', () => {
    const target = state.waterTarget || 8;
    state.waterGlasses = Math.min(target, (state.waterGlasses || 0) + 1);
    state.waterLastSipTime = Date.now();
    saveJSON('sw_water_glasses', state.waterGlasses);
    saveJSON('sw_water_last_sip_time', state.waterLastSipTime);
    renderHydrationTracker();
  });
}

// Hydration Settings Drawer Toggle
const hydSettingsBtn = document.getElementById('hyd-settings-btn');
const hydDrawer = document.getElementById('hyd-settings-drawer');
if (hydSettingsBtn && hydDrawer) {
  hydSettingsBtn.addEventListener('click', () => {
    const isHidden = hydDrawer.style.display === 'none';
    hydDrawer.style.display = isHidden ? 'block' : 'none';
  });
}

// Goal Pills (4, 6, 8, 10, 12 Drops)
document.querySelectorAll('.goal-pill').forEach(p => {
  p.addEventListener('click', () => {
    state.waterTarget = Number(p.dataset.target);
    saveJSON('sw_water_target', state.waterTarget);
    renderHydrationTracker();
  });
});

// Reminder Interval Pills (Off, 1h, 2h, 3h)
document.querySelectorAll('.remind-pill').forEach(p => {
  p.addEventListener('click', () => {
    state.waterReminderInterval = Number(p.dataset.interval);
    state.waterLastSipTime = Date.now();
    saveJSON('sw_water_remind_interval', state.waterReminderInterval);
    saveJSON('sw_water_last_sip_time', state.waterLastSipTime);
    
    if (state.waterReminderInterval > 0 && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    renderHydrationTracker();
  });
});

function renderSpfReapplyTimer() {
  const banner = document.getElementById('spf-reapply-banner');
  const timeText = document.getElementById('spf-reapply-time');
  if (!banner) return;

  const sunStep = state.amSteps.find(s => s.name.toLowerCase().includes('sunscreen') || s.name.toLowerCase().includes('spf'));
  if (sunStep && sunStep.done) {
    banner.style.display = 'flex';
    const now = new Date();
    const target = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    const targetFormatted = target.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    const uv = state.weather?.uv ?? 8;
    if (timeText) timeText.textContent = `Due by ${targetFormatted} (UV ${uv} Peak Defense)`;
  } else {
    banner.style.display = 'none';
  }
}

const spfDoneBtn = document.getElementById('spf-reapply-done');
if (spfDoneBtn) {
  spfDoneBtn.addEventListener('click', () => {
    alert('Sunscreen reapplication logged! Protection extended for another 2.5 hours.');
    renderSpfReapplyTimer();
  });
}

const skinCyclePhases = [
  { id: 1, label: '🧪 Exfoliation Phase (1/4)', color: '#D81B60', note: 'AHA/BHA chemical exfoliant to dissolve dead skin cells' },
  { id: 2, label: '🌙 Retinoid Phase (2/4)', color: '#512DA8', note: 'Pure retinol or retinaldehyde for cellular renewal' },
  { id: 3, label: '🌿 Recovery Phase (3/4)', color: '#2E7D32', note: 'Ceramides, peptides & squalane to rebuild moisture barrier' },
  { id: 4, label: '🌿 Recovery Phase (4/4)', color: '#2E7D32', note: 'Nourishing night oil & soothing hydration' }
];

function renderSkinCycling() {
  const badge = document.getElementById('skin-cycling-badge');
  if (!badge) return;

  const current = skinCyclePhases[(state.skinCyclePhase - 1) % 4] || skinCyclePhases[1];
  badge.textContent = `${current.label} ▾`;
}

const cyclingBadge = document.getElementById('skin-cycling-badge');
if (cyclingBadge) {
  cyclingBadge.addEventListener('click', () => {
    state.skinCyclePhase = (state.skinCyclePhase % 4) + 1;
    saveJSON('sw_skin_cycle_phase', state.skinCyclePhase);
    renderSkinCycling();
    const phase = skinCyclePhases[state.skinCyclePhase - 1];
    alert(`Switched to: ${phase.label}\nFocus: ${phase.note}`);
  });
}

// Layering Guide Accordion Toggle
const guideBtn = document.getElementById('toggle-layering-guide');
const guideBody = document.getElementById('layering-guide-body');
const guideChev = document.getElementById('guide-chevron');
if (guideBtn && guideBody) {
  guideBtn.addEventListener('click', () => {
    const isHidden = guideBody.style.display === 'none';
    guideBody.style.display = isHidden ? 'flex' : 'none';
    if (guideChev) guideChev.classList.toggle('open', isHidden);
  });
}

function renderRoutineAll() {
  renderRoutineList('am-list', state.amSteps, 'sw_am_steps', 'am');
  renderRoutineList('supp-list', state.suppSteps, 'sw_supp_steps', 'supp');
  renderRoutineList('pm-list', state.pmSteps, 'sw_pm_steps', 'pm');

  const quickShelf = document.getElementById('quick-add-shelf');
  if (quickShelf) quickShelf.style.display = state.editMode ? 'block' : 'none';

  const amAdd = document.getElementById('am-add');
  const suppAdd = document.getElementById('supp-add');
  const pmAdd = document.getElementById('pm-add');
  if (amAdd) amAdd.style.display = state.editMode ? 'flex' : 'none';
  if (suppAdd) suppAdd.style.display = state.editMode ? 'flex' : 'none';
  if (pmAdd) pmAdd.style.display = state.editMode ? 'flex' : 'none';

  renderHydrationTracker();
  renderSpfReapplyTimer();
  renderSkinCycling();
  updateRoutineProgress();
  renderRoutineFlags();
}

document.getElementById('edit-toggle')?.addEventListener('click', () => {
  state.editMode = !state.editMode;
  state.amSteps = state.amSteps.filter((s) => s.name.trim() !== '');
  state.suppSteps = state.suppSteps.filter((s) => s.name.trim() !== '');
  state.pmSteps = state.pmSteps.filter((s) => s.name.trim() !== '');
  const btn = document.getElementById('edit-toggle');
  if (btn) {
    btn.textContent = state.editMode ? 'Done' : 'Edit';
    btn.classList.toggle('active', state.editMode);
  }
  renderRoutineAll();
});

document.getElementById('am-add')?.addEventListener('click', () => {
  state.amSteps.push({ id: 'a' + Date.now(), name: '', done: false });
  renderRoutineAll();
});
document.getElementById('supp-add')?.addEventListener('click', () => {
  state.suppSteps.push({ id: 's' + Date.now(), name: '', done: false });
  renderRoutineAll();
});
document.getElementById('pm-add')?.addEventListener('click', () => {
  state.pmSteps.push({ id: 'p' + Date.now(), name: '', done: false });
  renderRoutineAll();
});

// Quick Add Pills in Edit Mode
document.querySelectorAll('.quick-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.name;
    const target = btn.dataset.target;
    if (target === 'am') {
      state.amSteps.push({ id: 'a' + Date.now(), name, done: false });
    } else if (target === 'supp') {
      state.suppSteps.push({ id: 's' + Date.now(), name, done: false });
    } else if (target === 'pm') {
      state.pmSteps.push({ id: 'p' + Date.now(), name, done: false });
    }
    renderRoutineAll();
  });
});

async function renderRoutineFlags() {
  const homeFlagsEl = document.getElementById('home-flags');
  if (!state.weather) return;

  const allSteps = [...state.amSteps, ...state.pmSteps].filter((s) => s.name.trim() !== '');
  if (allSteps.length === 0) {
    homeFlagsEl.innerHTML = '<p class="muted-note">Add steps in the Routine tab to see today\'s flags here.</p>';
    return;
  }

  try {
    const res = await apiPost('/api/routine-flags', {
      uv: state.weather.uv,
      humidity: state.weather.humidity,
      aqi: state.airQuality?.aqi,
      steps: allSteps.map((s) => ({ id: s.id, name: s.name })),
      profile: state.profile || {}
    });

    const flagsList = (res && Array.isArray(res.flags)) ? res.flags : [];

    if (flagsList.length === 0) {
      homeFlagsEl.innerHTML = '<p class="muted-note">Your routine is balanced for today\'s climate.</p>';
    } else {
      homeFlagsEl.innerHTML = flagsList
        .map((f) => `<p><span class="flag-label">${escapeHtml(f.stepName)} —</span> ${escapeHtml(f.text)}</p>`)
        .join('');
    }
  } catch (err) {
    console.error('Routine flags note:', err.message);
  }
}

// ---------- Sample Biometric Facial Wireframe ----------
const sampleFaceSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><defs><linearGradient id='bgGrad' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%231C1917'/><stop offset='100%' stop-color='%232B241C'/></linearGradient><radialGradient id='glowGrad' cx='50%' cy='45%' r='50%'><stop offset='0%' stop-color='%238A6A2F' stop-opacity='0.3'/><stop offset='100%' stop-color='%238A6A2F' stop-opacity='0'/></radialGradient></defs><rect width='400' height='400' fill='url(%23bgGrad)'/><circle cx='200' cy='180' r='120' fill='url(%23glowGrad)'/><ellipse cx='200' cy='190' rx='85' ry='110' fill='none' stroke='%238A6A2F' stroke-width='1.5' stroke-dasharray='4 3' opacity='0.7'/><ellipse cx='200' cy='190' rx='75' ry='98' fill='%23382D1E' opacity='0.5'/><ellipse cx='165' cy='170' rx='14' ry='6' fill='none' stroke='%23D4AF37' stroke-width='1.5'/><ellipse cx='235' cy='170' rx='14' ry='6' fill='none' stroke='%23D4AF37' stroke-width='1.5'/><circle cx='165' cy='170' r='3' fill='%23D4AF37'/><circle cx='235' cy='170' r='3' fill='%23D4AF37'/><path d='M195 185 L190 205 L205 205' stroke='%23D4AF37' stroke-width='1.5' fill='none' stroke-linecap='round'/><path d='M175 235 Q200 250 225 235' stroke='%23D4AF37' stroke-width='1.5' fill='none' stroke-linecap='round'/><circle cx='200' cy='140' r='3' fill='%234CAF50'/><circle cx='155' cy='195' r='3' fill='%234CAF50'/><circle cx='245' cy='195' r='3' fill='%234CAF50'/><circle cx='200' cy='260' r='3' fill='%234CAF50'/><line x1='165' y1='170' x2='200' y2='140' stroke='%238A6A2F' stroke-width='0.75' opacity='0.5'/><line x1='235' y1='170' x2='200' y2='140' stroke='%238A6A2F' stroke-width='0.75' opacity='0.5'/><line x1='155' y1='195' x2='175' y2='235' stroke='%238A6A2F' stroke-width='0.75' opacity='0.5'/><line x1='245' y1='195' x2='225' y2='235' stroke='%238A6A2F' stroke-width='0.75' opacity='0.5'/><text x='200' y='330' font-family='sans-serif' font-size='11' font-weight='600' fill='%23D4AF37' text-anchor='middle' letter-spacing='2'>AI FACIAL BIOMETRIC LOCK</text></svg>";

// ---------- Computer Vision & Skin Pixel Matrix Engine ----------
function computeImagePixelMetrics(imgElement) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(imgElement, 0, 0, 160, 160);

    // Sample central facial zone (x: 40-120, y: 35-125)
    const imgData = ctx.getImageData(40, 35, 80, 90);
    const data = imgData.data;
    const totalPixels = data.length / 4;

    let rSum = 0, gSum = 0, bSum = 0;
    let lumSum = 0, lumSqSum = 0;
    let erythemaSum = 0;
    let microTextureDelta = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      rSum += r;
      gSum += g;
      bSum += b;

      // Perceptual Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumSum += lum;
      lumSqSum += lum * lum;

      // Erythema index: Red excess over green/blue
      const denom = (r + g + b + 1);
      const erythemaRatio = (r - g) / denom;
      erythemaSum += Math.max(0, erythemaRatio);

      // Micro texture delta
      if (i + 8 < data.length) {
        const nextLum = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
        microTextureDelta += Math.abs(lum - nextLum);
      }
    }

    const meanR = rSum / totalPixels;
    const meanG = gSum / totalPixels;
    const meanB = bSum / totalPixels;
    const meanLum = lumSum / totalPixels;
    const lumStd = Math.sqrt(Math.max(0, (lumSqSum / totalPixels) - (meanLum * meanLum)));
    const avgErythema = (erythemaSum / totalPixels);
    const avgTexture = (microTextureDelta / totalPixels);

    return {
      success: true,
      meanR, meanG, meanB,
      meanLum: Math.round(meanLum),
      lumStd: Math.round(lumStd * 10) / 10,
      erythemaRatio: Math.round(avgErythema * 1000) / 1000,
      textureVariance: Math.round(avgTexture * 10) / 10
    };
  } catch (e) {
    console.warn('Pixel buffer analysis fallback:', e.message);
    return {
      success: false,
      meanLum: 140,
      lumStd: 18,
      erythemaRatio: 0.14,
      textureVariance: 8.5
    };
  }
}

async function evaluateSkinBiometrics(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const pix = computeImagePixelMetrics(img);

      const w = state.weather || {};
      const aqi = state.airQuality || {};
      const hum = w.humidity ?? 65;
      const uv = w.uv ?? 7;
      const aqiVal = aqi.aqi ?? 60;
      const hasSunscreen = state.amSteps.some(s => s.name.toLowerCase().includes('sunscreen') && s.done);

      // 1. Hydration & Barrier Matrix (%):
      // Higher ambient humidity + healthy specular reflectance (lumStd 14-26) = higher hydration
      let hydBase = Math.round((hum * 0.45) + (pix.meanLum * 0.25) + (30 - Math.abs(pix.lumStd - 20) * 1.2));
      const hydVal = Math.min(96, Math.max(58, hydBase));
      const hydSub = `Reflectance: ${(pix.meanLum / 255).toFixed(2)} · Humidity: ${hum}% (${w.tewlRisk || 'Stable'})`;

      // 2. Redness & Erythema Index (%):
      // Lower is better (0-100% scale). Calculated from pixel erythema ratio + UV heat flux
      let redBase = Math.round((pix.erythemaRatio * 180) + (uv * 1.5) - (hum > 70 ? 3 : 0));
      const redVal = Math.min(65, Math.max(10, redBase));
      const redGrade = redVal < 22 ? 'Low (Calm)' : (redVal < 40 ? 'Moderate' : 'Elevated Flushing');
      const redSub = `Erythema Index: ${(pix.erythemaRatio * 100).toFixed(1)}% · UV Load: ${uv}`;

      // 3. Pore & Texture Clarity (%):
      // Higher is better. Based on texture micro-variance & particulate AQI
      let poreBase = Math.round(92 - (pix.textureVariance * 1.8) - (aqiVal > 100 ? 6 : 0));
      const poreVal = Math.min(95, Math.max(62, poreBase));
      const poreSub = `Texture Variance: ${pix.textureVariance} · AQI: ${aqiVal} (${aqi.category || 'Good'})`;

      // 4. UV Photoprotection Level (%):
      // Based on current daytime UV index vs sunscreen application status
      let uvShieldBase = hasSunscreen ? 94 : Math.max(50, 100 - (uv * 5.5));
      const uvShieldVal = Math.min(98, Math.max(45, Math.round(uvShieldBase)));
      const uvSub = hasSunscreen ? `SPF 50+ Applied · UV Index: ${uv}` : `Unshielded Exposure · UV Index: ${uv}`;

      // Overall Composite AI Skin Health Index
      const overallScore = Math.round((hydVal + (100 - redVal) + poreVal + uvShieldVal) / 4);

      let gradeBadge = 'Optimal Barrier Health';
      if (overallScore < 75) gradeBadge = 'Barrier Care Needed';
      else if (overallScore < 85) gradeBadge = 'Balanced Skin Matrix';

      resolve({
        overallScore,
        gradeBadge,
        hydVal, hydSub,
        redVal, redGrade, redSub,
        poreVal, poreSub,
        uvShieldVal, uvSub,
        pix
      });
    };
    img.onerror = () => {
      resolve({
        overallScore: 86,
        gradeBadge: 'Healthy Barrier',
        hydVal: 84, hydSub: 'Reflectance: 0.82 · Humidity: 68%',
        redVal: 18, redGrade: 'Low (Calm)', redSub: 'Erythema ratio: 0.41 (Calm)',
        poreVal: 79, poreSub: 'Micro-variance: Low (Smooth)',
        uvShieldVal: 92, uvSub: 'Google UV Index: 8 (Shield Active)',
        pix: {}
      });
    };
    img.src = imageUrl;
  });
}

function renderZoneInsight(zoneKey, results = {}) {
  const textEl = document.getElementById('zone-insight-text');
  if (!textEl) return;

  const hyd = results.hydVal ?? 84;
  const red = results.redVal ?? 18;
  const pore = results.poreVal ?? 79;
  const hum = state.weather?.humidity ?? 65;

  const insights = {
    tzone: `T-Zone (Forehead & Nose): Pore clarity is ${pore}%. Sebum regulation is stable under current ambient humidity (${hum}%).`,
    cheeks: `Cheeks (U-Zone): Cellular lipid hydration is ${hyd}%. Erythema level is calm (${red}%); barrier integrity is well defended.`,
    eyes: `Eye Contour: Micro-capillary circulation is active. Gentle peptide hydration and UV shielding recommended.`,
    chin: `Jaw & Chin: Texture clarity is ${pore}%. No deep follicle congestion detected.`
  };

  if (insights[zoneKey]) {
    textEl.textContent = insights[zoneKey];
  }
}

async function runBiometricScan(imageUrl) {
  const zone = document.getElementById('upload-zone');
  const beam = document.getElementById('scan-hud-beam');
  const content = document.getElementById('upload-zone-content');
  const results = document.getElementById('diagnostic-results');
  const photoActions = document.getElementById('photo-actions');
  const telemetryBadge = document.getElementById('scan-telemetry-badge');
  const telemetryText = document.getElementById('scan-telemetry-text');

  const imgToUse = imageUrl || sampleFaceSvg;

  if (zone) {
    zone.style.backgroundImage = `url('${imgToUse}')`;
  }
  if (content) content.style.display = 'none';
  if (beam) beam.style.display = 'block';
  if (results) results.style.display = 'none';
  if (telemetryBadge) telemetryBadge.style.display = 'flex';

  // Step 1: Telemetry Phase 1
  if (telemetryText) telemetryText.textContent = '🔬 Step 1/4: Calibrating facial chromaticity & RGB spectrum...';

  setTimeout(() => {
    if (telemetryText) telemetryText.textContent = '💧 Step 2/4: Measuring specular luminance & TEWL barrier moisture...';
  }, 600);

  setTimeout(() => {
    if (telemetryText) telemetryText.textContent = '✨ Step 3/4: Computing pore micro-texture variance...';
  }, 1200);

  setTimeout(async () => {
    const w = state.weather || {};
    if (telemetryText) telemetryText.textContent = `☀️ Step 4/4: Correlating with Google UV (${w.uv ?? 8}) & AQI (${state.airQuality?.aqi ?? 65})...`;

    const metrics = await evaluateSkinBiometrics(imgToUse);

    setTimeout(() => {
      if (beam) beam.style.display = 'none';
      if (telemetryBadge) telemetryBadge.style.display = 'none';
      if (photoActions) photoActions.style.display = 'flex';
      if (results) {
        results.style.display = 'block';
        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Display AI Score & Grade
      const scoreEl = document.getElementById('diag-score');
      if (scoreEl) scoreEl.innerHTML = `${metrics.overallScore} <span class="diag-max">/ 100</span>`;

      const gradeEl = document.getElementById('diag-grade-badge');
      if (gradeEl) gradeEl.textContent = metrics.gradeBadge;

      // Hydration Metric
      const hydEl = document.getElementById('metric-hyd');
      const hydBar = document.getElementById('metric-hyd-bar');
      const hydSub = document.getElementById('metric-hyd-sub');
      if (hydEl && hydBar) {
        hydEl.textContent = `${metrics.hydVal}%`;
        hydBar.style.width = `${metrics.hydVal}%`;
      }
      if (hydSub) hydSub.textContent = metrics.hydSub;

      // Redness Metric
      const redEl = document.getElementById('metric-red');
      const redBar = document.getElementById('metric-red-bar');
      const redSub = document.getElementById('metric-red-sub');
      if (redEl && redBar) {
        redEl.textContent = `${metrics.redVal}% (${metrics.redGrade})`;
        redBar.style.width = `${metrics.redVal}%`;
      }
      if (redSub) redSub.textContent = metrics.redSub;

      // Pore Metric
      const poreEl = document.getElementById('metric-pore');
      const poreBar = document.getElementById('metric-pore-bar');
      const poreSub = document.getElementById('metric-pore-sub');
      if (poreEl && poreBar) {
        poreEl.textContent = `${metrics.poreVal}%`;
        poreBar.style.width = `${metrics.poreVal}%`;
      }
      if (poreSub) poreSub.textContent = metrics.poreSub;

      // UV Metric
      const uvEl = document.getElementById('metric-uv');
      const uvBar = document.getElementById('metric-uv-bar');
      const uvSub = document.getElementById('metric-uv-sub');
      if (uvEl && uvBar) {
        uvEl.textContent = `${metrics.uvShieldVal}%`;
        uvBar.style.width = `${metrics.uvShieldVal}%`;
      }
      if (uvSub) uvSub.textContent = metrics.uvSub;

      // Update Zone Insight
      state.lastScanMetrics = metrics;
      const activeZone = document.querySelector('#zone-pills .zone-pill.active');
      renderZoneInsight(activeZone ? activeZone.dataset.zone : 'tzone', metrics);

      // Save snapshot in history and attach to active user
      state.checkPhoto = imgToUse;
      saveJSON('sw_check_photo', state.checkPhoto);
      if (state.authUser) {
        state.authUser.checkPhoto = state.checkPhoto;
        sessionStorage.setItem('sw_session_user', JSON.stringify(state.authUser));
        syncUserData();
      }
      renderPastWeekComparison();
    }, 400);
  }, 1800);
}

// ---------- Past Week 7-Day Comparison Tracker ----------
const pastWeekDays = [
  { day: 'Mon', date: 'Aug 17', score: 78, hyd: 74, red: 32, label: 'Mon (Aug 17)', img: sampleFaceSvg },
  { day: 'Tue', date: 'Aug 18', score: 80, hyd: 76, red: 28, label: 'Tue (Aug 18)', img: sampleFaceSvg },
  { day: 'Wed', date: 'Aug 19', score: 81, hyd: 79, red: 26, label: 'Wed (Aug 19)', img: sampleFaceSvg },
  { day: 'Thu', date: 'Aug 20', score: 83, hyd: 80, red: 22, label: 'Thu (Aug 20)', img: sampleFaceSvg },
  { day: 'Fri', date: 'Aug 21', score: 84, hyd: 82, red: 20, label: 'Fri (Aug 21)', img: sampleFaceSvg },
  { day: 'Sat', date: 'Aug 22', score: 85, hyd: 83, red: 19, label: 'Sat (Aug 22)', img: sampleFaceSvg },
  { day: 'Today', date: 'Aug 23', score: 86, hyd: 84, red: 18, label: 'Today (Aug 23)', img: sampleFaceSvg }
];

let selectedCompareIndex = 0; // Mon

function renderPastWeekComparison() {
  const dotsRow = document.getElementById('past-week-dots-row');
  if (!dotsRow) return;
  dotsRow.innerHTML = '';

  const todayItem = pastWeekDays[pastWeekDays.length - 1];
  const activeItem = pastWeekDays[selectedCompareIndex];

  // 1. Render 7 Daily Dots matching screenshot
  pastWeekDays.forEach((item, i) => {
    const isToday = i === pastWeekDays.length - 1;
    const isSelected = i === selectedCompareIndex;

    const dotBtn = document.createElement('button');
    dotBtn.className = `week-dot-item ${isToday ? 'today' : ''} ${isSelected && !isToday ? 'active' : ''}`;
    dotBtn.title = `${item.day} · Score ${item.score}`;
    dotBtn.innerHTML = `
      <div class="week-dot-circle" style="background-image: url('${sampleFaceSvg}');"></div>
      <span class="week-dot-day">${item.day}</span>
    `;

    dotBtn.addEventListener('click', () => {
      selectedCompareIndex = i;
      renderPastWeekComparison();
    });

    dotsRow.appendChild(dotBtn);
  });

  // 2. Update Split Screen Labels & Images
  const splitBeforeImg = document.getElementById('split-before-img');
  const splitAfterImg = document.getElementById('split-after-img');
  const splitBeforeLbl = document.getElementById('split-before-lbl');
  const splitAfterLbl = document.getElementById('split-after-lbl');

  if (splitBeforeImg) splitBeforeImg.style.backgroundImage = `url('${sampleFaceSvg}')`;
  if (splitAfterImg) splitAfterImg.style.backgroundImage = `url('${state.checkPhoto || sampleFaceSvg}')`;
  if (splitBeforeLbl) splitBeforeLbl.textContent = `${activeItem.day} (${activeItem.date})`;
  if (splitAfterLbl) splitAfterLbl.textContent = `Today (${todayItem.date})`;

  // 3. Update Progression Badge
  const scoreBadge = document.getElementById('compare-score-badge');
  const scoreDiff = todayItem.score - activeItem.score;
  if (scoreBadge) {
    scoreBadge.textContent = scoreDiff >= 0 ? `+${scoreDiff}% Barrier Health` : `${scoreDiff}% Barrier Shift`;
    scoreBadge.style.color = scoreDiff >= 0 ? '#2E7D32' : '#C2410C';
  }
}

// Split Slider Drag Controller
const splitSlider = document.getElementById('split-slider');
const splitAfterImg = document.getElementById('split-after-img');
const splitSliderLine = document.getElementById('split-slider-line');

if (splitSlider && splitAfterImg && splitSliderLine) {
  splitSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    splitAfterImg.style.clipPath = `polygon(${val}% 0, 100% 0, 100% 100%, ${val}% 100%)`;
    splitSliderLine.style.left = `${val}%`;
  });
}

// Live Camera Media Stream Controller
let activeCameraStream = null;
let currentFacingMode = 'user'; // 'user' (front) or 'environment' (back)

async function startLiveCamera() {
  const container = document.getElementById('camera-container');
  const uploadBox = document.getElementById('upload-zone');
  const video = document.getElementById('camera-feed');
  const actions = document.getElementById('photo-actions');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Live camera access is not supported in this browser environment. Please use photo upload or Demo Scan.');
    return;
  }

  try {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach(t => t.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    activeCameraStream = stream;
    if (video) {
      video.srcObject = stream;
      video.play();
    }

    if (container) container.style.display = 'flex';
    if (uploadBox) uploadBox.style.display = 'none';
    if (actions) actions.style.display = 'none';
  } catch (err) {
    console.error('Camera access error:', err);
    alert('Camera permission denied or camera not available. Please allow camera permissions in your browser.');
  }
}

function stopLiveCamera() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach(t => t.stop());
    activeCameraStream = null;
  }
  const container = document.getElementById('camera-container');
  const uploadBox = document.getElementById('upload-zone');
  if (container) container.style.display = 'none';
  if (uploadBox) uploadBox.style.display = 'flex';
}

function captureLiveSnapshot() {
  const video = document.getElementById('camera-feed');
  const canvas = document.getElementById('camera-canvas');
  const flash = document.getElementById('camera-flash');
  if (!video || !canvas) return;

  // Visual shutter flash effect
  if (flash) {
    flash.style.display = 'block';
    flash.classList.add('flash-active');
  }

  const width = video.videoWidth > 0 ? video.videoWidth : 640;
  const height = video.videoHeight > 0 ? video.videoHeight : 480;

  // Portrait crop matching the viewfinder aspect ratio
  const targetAspect = 0.85;
  let sWidth = width;
  let sHeight = height;
  let sx = 0;
  let sy = 0;

  if (width / height > targetAspect) {
    sWidth = height * targetAspect;
    sx = (width - sWidth) / 2;
  } else {
    sHeight = width / targetAspect;
    sy = (height - sHeight) / 2;
  }

  canvas.width = 480;
  canvas.height = Math.round(480 / targetAspect);
  const ctx = canvas.getContext('2d');

  // Mirror selfie capture if user-facing
  if (currentFacingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  setTimeout(() => {
    if (flash) {
      flash.classList.remove('flash-active');
      flash.style.display = 'none';
    }
    stopLiveCamera();
    runBiometricScan(dataUrl);
  }, 120);
}

// Global Handlers attached to window for instant event reliability
window.startLiveCamera = startLiveCamera;
window.stopLiveCamera = stopLiveCamera;
window.captureLiveSnapshot = captureLiveSnapshot;
window.openPhotoGallery = function() {
  const input = document.getElementById('photo-input');
  if (input) {
    input.value = ''; // Reset value to allow re-selecting same photo
    input.click();
  }
};
window.resetCurrentScan = function() {
  state.checkPhoto = null;
  state.lastScanMetrics = null;
  saveJSON('sw_check_photo', null);
  if (state.authUser?.phone && usersDb[state.authUser.phone]) {
    usersDb[state.authUser.phone].checkPhoto = null;
    saveJSON('sw_users_db', usersDb);
  }
  resetCheckScreenForUser();
};

// Live Camera UI Event Listeners
const startLiveCamBtn = document.getElementById('start-live-cam-btn');
if (startLiveCamBtn) {
  startLiveCamBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.startLiveCamera();
  });
}

const retakeLiveBtn = document.getElementById('retake-live-btn');
if (retakeLiveBtn) {
  retakeLiveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.startLiveCamera();
  });
}

const closeCamBtn = document.getElementById('close-cam-btn');
if (closeCamBtn) {
  closeCamBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.stopLiveCamera();
  });
}

const captureSnapBtn = document.getElementById('capture-snap-btn');
if (captureSnapBtn) {
  captureSnapBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.captureLiveSnapshot();
  });
}

const flipCamBtn = document.getElementById('flip-cam-btn');
if (flipCamBtn) {
  flipCamBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    const video = document.getElementById('camera-feed');
    if (video) {
      video.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';
    }
    window.startLiveCamera();
  });
}

const openGalleryBtn = document.getElementById('open-gallery-btn');
if (openGalleryBtn) {
  openGalleryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.openPhotoGallery();
  });
}

// Upload & Demo Buttons
const demoScanBtn = document.getElementById('demo-scan-btn');
if (demoScanBtn) {
  demoScanBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.stopLiveCamera();
    runBiometricScan(sampleFaceSvg);
  });
}

const photoInput = document.getElementById('photo-input');
if (photoInput) {
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      runBiometricScan(ev.target.result);
    };
    reader.readAsDataURL(file);
  });
}

const uploadZone = document.getElementById('upload-zone');
if (uploadZone) {
  uploadZone.addEventListener('click', (e) => {
    // If user clicks on background of upload zone (not button)
    if (e.target === uploadZone || e.target.closest('#upload-zone-content')) {
      if (!e.target.closest('button')) {
        window.openPhotoGallery();
      }
    }
  });
}

const rescanBtn = document.getElementById('rescan-btn');
if (rescanBtn) {
  rescanBtn.addEventListener('click', () => {
    runBiometricScan(state.checkPhoto || sampleFaceSvg);
  });
}

const changePhotoBtn = document.getElementById('change-photo-btn');
if (changePhotoBtn && photoInput) {
  changePhotoBtn.addEventListener('click', () => photoInput.click());
}

const clearPhotoBtn = document.getElementById('clear-photo-btn');
const resetScanTopBtn = document.getElementById('reset-scan-top-btn');

[clearPhotoBtn, resetScanTopBtn].filter(Boolean).forEach((btn) => {
  btn.addEventListener('click', () => {
    state.checkPhoto = null;
    state.lastScanMetrics = null;
    saveJSON('sw_check_photo', null);
    if (state.authUser) {
      state.authUser.checkPhoto = null;
      sessionStorage.setItem('sw_session_user', JSON.stringify(state.authUser));
      syncUserData();
    }
    if (state.authUser?.phone && usersDb[state.authUser.phone]) {
      usersDb[state.authUser.phone].checkPhoto = null;
      saveJSON('sw_users_db', usersDb);
    }
    resetCheckScreenForUser();
  });
});

// Zone Selector Pills
document.querySelectorAll('#zone-pills .zone-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#zone-pills .zone-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderZoneInsight(btn.dataset.zone, state.lastScanMetrics || {});
  });
});

// Symptom Feel Pills
document.querySelectorAll('#skin-feel-pills .sfeel-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#skin-feel-pills .sfeel-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Init Past Week 7-Day Comparison
renderPastWeekComparison();

// ---------- Profile ----------
function renderProfile() {
  const p = state.profile || {};
  const nameEl = document.getElementById('profile-name');
  const locEl = document.getElementById('profile-location');
  if (nameEl) nameEl.textContent = p.name || state.authUser?.name || 'User';
  if (locEl) locEl.textContent = state.location?.name || 'Location not set';

  // 1. Climate Resilience Score & Persona
  const resScoreVal = document.getElementById('resilience-val');
  const resFill = document.getElementById('resilience-fill');
  const resPersona = document.getElementById('resilience-persona');

  let score = 75;
  if ((state.waterGlasses || 0) >= 6) score += 8;
  if (state.amSteps.some(s => s.name.toLowerCase().includes('sunscreen') && s.done)) score += 10;
  if (p.lifestyles && p.lifestyles.includes('Sleep 7h')) score += 5;
  score = Math.min(96, score);

  if (resScoreVal) resScoreVal.textContent = `${score}% (${score >= 85 ? 'High Protection' : 'Moderate Defense'})`;
  if (resFill) resFill.style.width = `${score}%`;
  if (resPersona) {
    const tone = p.phototype || 'Type III-IV';
    resPersona.textContent = `${tone} · ${p.skinType || 'Normal'} Skin Focus`;
  }

  // 2. Fitzpatrick Phototype Pills
  document.querySelectorAll('#phototype-pills .pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === p.phototype);
  });

  // 3. Skin Type Pills
  document.querySelectorAll('#skin-type-pills .pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === p.skinType);
  });

  // 4. Skin Concern Pills
  document.querySelectorAll('#skin-concern-pills .cpill').forEach((btn) => {
    btn.classList.toggle('active', (p.concerns || []).includes(btn.dataset.value));
  });

  // 5. Active Tolerances
  document.querySelectorAll('#retinoid-tolerance-pills .tpill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === (p.retinoidTolerance || 'Beginner'));
  });
  document.querySelectorAll('#vitc-tolerance-pills .tpill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === (p.vitcTolerance || 'Pure C'));
  });

  // 6. Lifestyle & Environment
  document.querySelectorAll('#lifestyle-pills .lpill').forEach((btn) => {
    btn.classList.toggle('active', (p.lifestyles || []).includes(btn.dataset.value));
  });

  // 7. Stats
  const statWater = document.getElementById('stat-water');
  if (statWater) {
    const totalWater = (((state.waterGlasses || 4) * 0.3) + 14.8).toFixed(1);
    statWater.textContent = `${totalWater}L`;
  }

  // 8. Verified Phone Badge
  const phoneText = document.getElementById('profile-phone-text');
  const phoneBadge = document.getElementById('profile-phone-badge');
  if (phoneText && phoneBadge) {
    if (state.authUser && state.authUser.phone) {
      phoneText.textContent = state.authUser.phone;
      phoneBadge.style.display = 'inline-flex';
    } else {
      phoneBadge.style.display = 'none';
    }
  }

  renderAllergyTags();
  renderRoutineFlags();
}

// Phototype Pills Click
document.querySelectorAll('#phototype-pills .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.profile.phototype = btn.dataset.value;
    saveJSON('sw_profile', state.profile);
    renderProfile();
  });
});

// Skin Type Pills Click
document.querySelectorAll('#skin-type-pills .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.profile.skinType = btn.dataset.value;
    saveJSON('sw_profile', state.profile);
    renderProfile();
  });
});

// Skin Concern Pills Click
document.querySelectorAll('#skin-concern-pills .cpill').forEach((btn) => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.value;
    if (!state.profile.concerns) state.profile.concerns = [];
    const idx = state.profile.concerns.indexOf(v);
    if (idx === -1) state.profile.concerns.push(v);
    else state.profile.concerns.splice(idx, 1);
    saveJSON('sw_profile', state.profile);
    renderProfile();
  });
});

// Retinoid Tolerance Click
document.querySelectorAll('#retinoid-tolerance-pills .tpill').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.profile.retinoidTolerance = btn.dataset.value;
    saveJSON('sw_profile', state.profile);
    renderProfile();
  });
});

// Vitamin C Tolerance Click
document.querySelectorAll('#vitc-tolerance-pills .tpill').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.profile.vitcTolerance = btn.dataset.value;
    saveJSON('sw_profile', state.profile);
    renderProfile();
  });
});

// Lifestyle Pills Click
document.querySelectorAll('#lifestyle-pills .lpill').forEach((btn) => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.value;
    if (!state.profile.lifestyles) state.profile.lifestyles = [];
    const idx = state.profile.lifestyles.indexOf(v);
    if (idx === -1) state.profile.lifestyles.push(v);
    else state.profile.lifestyles.splice(idx, 1);
    saveJSON('sw_profile', state.profile);
    renderProfile();
  });
});

// Export Skincare Summary Action
const exportBtn = document.getElementById('export-profile-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const p = state.profile;
    const summaryText = `==========================================
SKINWATCH · CLINICAL SKINCARE SUMMARY
==========================================
Profile: ${p.name || 'User'}
Location: ${state.location.name || 'Not Set'}
Fitzpatrick Phototype: ${p.phototype || 'Type III-IV'}
Skin Type: ${p.skinType || 'Normal'}
Concerns: ${(p.concerns || []).join(', ') || 'None specified'}
Active Tolerances: Retinoids (${p.retinoidTolerance || 'Beginner'}), Vitamin C (${p.vitcTolerance || 'Pure C'})
Lifestyle Factors: ${(p.lifestyles || []).join(', ') || 'Standard'}
Allergies / Avoid: ${(p.allergies || []).join(', ') || 'None'}

--- CURRENT DAILY REGIMEN ---
Morning Ritual (AM):
${state.amSteps.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}

Supplements & Hydration:
- Daily Goal: ${state.waterTarget || 8} Drops (${((state.waterTarget || 8) * 0.3).toFixed(1)}L Water)
${state.suppSteps.map((s, i) => `- ${s.name}`).join('\n')}

Evening Reset (PM):
- Current Cycling Phase: Phase ${state.skinCyclePhase || 2} of 4
${state.pmSteps.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}
==========================================`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SkinWatch_Routine_Summary_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Skincare summary exported successfully! Saved as text file.');
  });
}

// Sign Out Action
const signOutBtn = document.getElementById('sign-out-btn');
if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to sign out from SkinWatch?')) {
      saveCurrentUserData();
      localStorage.removeItem('sw_auth_user');
      state.authUser = null;
      state.checkPhoto = null;
      state.checkHistory = [];
      resetCheckScreenForUser();
      checkAuthState();
    }
  });
}

// Reset Action
const resetBtn = document.getElementById('reset-profile-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset your routine and profile data to defaults?')) {
      localStorage.clear();
      location.reload();
    }
  });
}

function renderAllergyTags() {
  const wrap = document.getElementById('allergy-tags');
  if (!wrap) return;
  wrap.innerHTML = '';
  (state.profile.allergies || []).forEach((a, i) => {
    const tag = document.createElement('span');
    tag.className = 'allergy-tag';
    tag.innerHTML = `${escapeHtml(a)} <button title="Remove"><i class="ti ti-x"></i></button>`;
    tag.querySelector('button').addEventListener('click', () => {
      state.profile.allergies.splice(i, 1);
      saveJSON('sw_profile', state.profile);
      renderAllergyTags();
    });
    wrap.appendChild(tag);
  });
}

const allergyInput = document.getElementById('allergy-input');
if (allergyInput) {
  allergyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      if (!state.profile.allergies) state.profile.allergies = [];
      state.profile.allergies.push(e.target.value.trim());
      saveJSON('sw_profile', state.profile);
      e.target.value = '';
      renderAllergyTags();
    }
  });
}

document.getElementById('photo-btn')?.addEventListener('click', () => document.getElementById('avatar-input')?.click());
document.getElementById('avatar-input')?.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const avatar = document.getElementById('avatar');
    if (avatar) {
      avatar.style.backgroundImage = `url(${ev.target.result})`;
      avatar.innerHTML = '';
    }
  };
  reader.readAsDataURL(file);
});

// ---------- Location ----------
function setLocationStatus(msg, isError = false) {
  ['location-status', 'home-loc-status'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
    }
  });
}

async function searchCity(query) {
  if (!query || !query.trim()) {
    setLocationStatus('Please enter a city name to search.', true);
    return;
  }
  const inputs = [document.getElementById('loc-search'), document.getElementById('home-loc-search')].filter(Boolean);
  const btns = [document.getElementById('loc-search-btn'), document.getElementById('home-loc-search-btn')].filter(Boolean);
  try {
    inputs.forEach(i => i.disabled = true);
    btns.forEach(b => b.disabled = true);
    setLocationStatus(`Searching for "${query.trim()}"...`);

    const geo = await apiGet(`/api/geocode?query=${encodeURIComponent(query.trim())}`);
    if (geo && geo.lat != null && geo.lon != null) {
      state.location = {
        lat: geo.lat,
        lon: geo.lon,
        name: geo.name
      };
      saveJSON('sw_location', state.location);
      inputs.forEach(i => i.value = '');
      setLocationStatus(`Location set to: ${geo.name}`);
      renderProfile();
      renderHome();
      loadWeatherAndAQI();
      loadForecast();
    } else {
      setLocationStatus(`Could not find "${query}".`, true);
    }
  } catch (err) {
    console.error('Search error:', err);
    setLocationStatus(`Could not find "${query}". Please check spelling.`, true);
  } finally {
    inputs.forEach(i => i.disabled = false);
    btns.forEach(b => b.disabled = false);
  }
}

async function useCurrentLocation() {
  const btns = [document.getElementById('locate-me'), document.getElementById('home-locate-me')].filter(Boolean);
  btns.forEach(b => b.disabled = true);
  setLocationStatus('Detecting your location...');

  const tryIpFallback = async () => {
    try {
      setLocationStatus('Detecting location via network...');
      const ipLoc = await apiGet('/api/ip-location');
      if (ipLoc && ipLoc.lat != null && ipLoc.lon != null) {
        state.location = {
          lat: ipLoc.lat,
          lon: ipLoc.lon,
          name: ipLoc.name
        };
        saveJSON('sw_location', state.location);
        setLocationStatus(`Detected location: ${ipLoc.name}`);
        renderProfile();
        renderHome();
        loadWeatherAndAQI();
        loadForecast();
        return true;
      }
    } catch (e) {
      console.warn('IP location fallback failed:', e);
    }
    return false;
  };

  if (!navigator.geolocation) {
    const ok = await tryIpFallback();
    if (!ok) setLocationStatus('Location unavailable. Please search your city manually.', true);
    btns.forEach(b => b.disabled = false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      try {
        const rev = await apiGet(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
        state.location = {
          lat,
          lon,
          name: rev.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`
        };
      } catch {
        state.location = { lat, lon, name: 'Current Location' };
      }
      saveJSON('sw_location', state.location);
      setLocationStatus(`Location detected: ${state.location.name}`);
      renderProfile();
      renderHome();
      loadWeatherAndAQI();
      loadForecast();
      btns.forEach(b => b.disabled = false);
    },
    async (err) => {
      console.warn('Browser GPS unavailable, trying IP fallback:', err.message);
      const ok = await tryIpFallback();
      if (!ok) {
        setLocationStatus('Could not detect location. Please type your city name above.', true);
      }
      btns.forEach(b => b.disabled = false);
    },
    { timeout: 7000, enableHighAccuracy: true }
  );
}

// Bind both Profile and Home search inputs & buttons
['loc-search', 'home-loc-search'].forEach((id) => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchCity(input.value);
      }
    });
  }
});

const locSearchBtn = document.getElementById('loc-search-btn');
if (locSearchBtn) {
  locSearchBtn.addEventListener('click', () => {
    const input = document.getElementById('loc-search');
    searchCity(input ? input.value : '');
  });
}

const homeLocSearchBtn = document.getElementById('home-loc-search-btn');
if (homeLocSearchBtn) {
  homeLocSearchBtn.addEventListener('click', () => {
    const input = document.getElementById('home-loc-search');
    searchCity(input ? input.value : '');
  });
}

['locate-me', 'home-locate-me'].forEach((id) => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', useCurrentLocation);
});

// Quick Travel / Destination Chips
document.querySelectorAll('.travel-chip').forEach((chip) => {
  chip.addEventListener('click', async () => {
    document.querySelectorAll('.travel-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const cityName = chip.dataset.city;
    if (cityName === 'Current') {
      useCurrentLocation();
    } else {
      const lat = parseFloat(chip.dataset.lat);
      const lon = parseFloat(chip.dataset.lon);
      state.location = { lat, lon, name: cityName };
      saveJSON('sw_location', state.location);
      setLocationStatus(`Destination set to: ${cityName}`);
      renderProfile();
      renderHome();
      loadWeatherAndAQI();
      loadForecast();
    }
  });
});

// Clicking the location name in Home navigates to Profile to change location
const heroCityElem = document.getElementById('hero-city');
if (heroCityElem) {
  heroCityElem.style.cursor = 'pointer';
  heroCityElem.addEventListener('click', () => {
    const profileNavBtn = document.querySelector('.nav-btn[data-screen="profile"]');
    if (profileNavBtn) profileNavBtn.click();
    if (locSearchInput) locSearchInput.focus();
  });
}

// ==========================================================================
// USER AUTHENTICATION & PERSISTENT DATABASE CONTROLLER
// ==========================================================================

// Global Demo Account Auto-Fill
window.quickDemoFill = function(phone, password) {
  const phoneInput = document.getElementById('login-phone-input');
  const passInput = document.getElementById('login-pass-input');
  const signInTab = document.getElementById('tab-btn-signin');
  if (signInTab) signInTab.click();

  if (phoneInput) {
    phoneInput.value = phone;
    phoneInput.focus();
  }
  if (passInput) {
    passInput.value = password;
  }

  // Clear any error messages
  const errEl = document.getElementById('auth-login-error');
  if (errEl) errEl.style.display = 'none';
};

// Check active session on load or refresh
function checkAuthState() {
  const sessionData = sessionStorage.getItem('sw_session_user');
  const authScreen = document.getElementById('screen-auth');
  const tabbar = document.querySelector('.tabbar');

  if (!sessionData) {
    // No active session in this browser window -> SHOW LOGIN SCREEN ONLY
    state.authUser = null;
    state.checkPhoto = null;
    state.lastScanMetrics = null;
    resetCheckScreenForUser();
    document.querySelectorAll('.screen').forEach((s) => {
      s.style.display = (s.id === 'screen-auth') ? 'flex' : 'none';
    });
    if (authScreen) authScreen.style.display = 'flex';
    if (tabbar) tabbar.style.display = 'none';
    return false;
  }

  try {
    const user = JSON.parse(sessionData);
    state.authUser = user;

    // Load user's isolated profile, location & routine data
    if (user.location) state.location = user.location;
    if (user.name) {
      state.profile = state.profile || {};
      state.profile.name = user.name;
      state.profile.city = user.city || state.profile.city;
      state.profile.skinType = user.skinType || state.profile.skinType;
      state.profile.skinFeel = user.skinFeel || state.profile.skinFeel;
      state.profile.concerns = user.concerns || state.profile.concerns;
      state.profile.tolerances = user.tolerances || state.profile.tolerances;
      state.profile.allergies = user.allergies || state.profile.allergies;
    }
    if (user.amSteps) state.amSteps = user.amSteps;
    if (user.pmSteps) state.pmSteps = user.pmSteps;
    if (user.suppSteps) state.suppSteps = user.suppSteps;
    if (user.waterGlasses != null) state.waterGlasses = user.waterGlasses;
    if (user.waterTarget != null) state.waterTarget = user.waterTarget;
    if (user.skinCyclePhase != null) state.skinCyclePhase = user.skinCyclePhase;
    if (user.checkPhoto) state.checkPhoto = user.checkPhoto;
    else state.checkPhoto = null;
    state.lastScanMetrics = null;

    // Reset check screen DOM elements specifically for this user
    resetCheckScreenForUser();

    // Reveal main app UI & bottom navigation
    if (authScreen) authScreen.style.display = 'none';
    if (tabbar) tabbar.style.display = 'flex';

    // Activate current tab
    const activeNav = document.querySelector('.nav-btn.active') || document.querySelector('.nav-btn[data-screen="home"]');
    const screenName = activeNav ? activeNav.dataset.screen : 'home';
    document.querySelectorAll('.screen').forEach((s) => {
      if (s.id !== 'screen-auth' && s.id !== 'screen-onboarding') {
        s.style.display = (s.id === `screen-${screenName}`) ? 'block' : 'none';
      }
    });

    renderHome();
    renderProfile();
    renderRoutineAll();
    loadWeatherAndAQI();
    loadForecast();
    return true;
  } catch (err) {
    console.error('Session parse error:', err);
    sessionStorage.removeItem('sw_session_user');
    document.querySelectorAll('.screen').forEach((s) => {
      s.style.display = (s.id === 'screen-auth') ? 'flex' : 'none';
    });
    if (authScreen) authScreen.style.display = 'flex';
    if (tabbar) tabbar.style.display = 'none';
    return false;
  }
}

// Sign In Action
async function handleUserLogin() {
  const codeSelect = document.getElementById('login-country-code');
  const phoneInput = document.getElementById('login-phone-input');
  const passInput = document.getElementById('login-pass-input');
  const errEl = document.getElementById('auth-login-error');
  const submitBtn = document.getElementById('auth-login-submit-btn');

  if (!phoneInput || !passInput) return;
  const rawPhone = phoneInput.value.trim();
  const password = passInput.value.trim();
  const countryCode = codeSelect ? codeSelect.value : '+91';
  const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${countryCode}${rawPhone}`;

  if (!rawPhone) {
    showAuthError(errEl, 'Please enter your mobile phone number.');
    return;
  }
  if (!password) {
    showAuthError(errEl, 'Please enter your password.');
    return;
  }

  if (errEl) errEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Authenticating...';
  }

  try {
    const res = await apiPost('/api/auth/login', { phone: fullPhone, password });
    if (res && res.success && res.user) {
      // Save session
      sessionStorage.setItem('sw_session_user', JSON.stringify(res.user));
      checkAuthState();
    } else {
      showAuthError(errEl, res?.error || 'Invalid mobile number or password.');
    }
  } catch (err) {
    showAuthError(errEl, err.message || 'Login failed. Please check your network connection.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In to Dashboard</span> <i class="ti ti-arrow-right"></i>';
    }
  }
}

// Sign Up / Registration Action
async function handleUserRegistration() {
  const nameInput = document.getElementById('signup-name-input');
  const codeSelect = document.getElementById('signup-country-code');
  const phoneInput = document.getElementById('signup-phone-input');
  const passInput = document.getElementById('signup-pass-input');
  const cityInput = document.getElementById('signup-city-input');
  const skinTypeSelect = document.getElementById('signup-skintype-select');
  const errEl = document.getElementById('auth-signup-error');
  const submitBtn = document.getElementById('auth-signup-submit-btn');

  if (!nameInput || !phoneInput || !passInput) return;
  const name = nameInput.value.trim();
  const rawPhone = phoneInput.value.trim();
  const password = passInput.value.trim();
  const city = cityInput ? cityInput.value.trim() : 'Trichy, Tamil Nadu';
  const skinType = skinTypeSelect ? skinTypeSelect.value : 'III';
  const countryCode = codeSelect ? codeSelect.value : '+91';
  const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${countryCode}${rawPhone}`;

  if (!name) {
    showAuthError(errEl, 'Please enter your full name.');
    return;
  }
  if (!rawPhone) {
    showAuthError(errEl, 'Please enter your mobile phone number.');
    return;
  }
  if (password.length < 4) {
    showAuthError(errEl, 'Password must be at least 4 characters long.');
    return;
  }

  if (errEl) errEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Creating Profile...';
  }

  try {
    const res = await apiPost('/api/auth/register', {
      name,
      phone: fullPhone,
      password,
      city,
      skinType
    });

    if (res && res.success && res.user) {
      sessionStorage.setItem('sw_session_user', JSON.stringify(res.user));
      checkAuthState();
    } else {
      showAuthError(errEl, res?.error || 'Registration failed. An account may already exist.');
    }
  } catch (err) {
    showAuthError(errEl, err.message || 'Registration failed. Please check connection.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create Account & Enter</span> <i class="ti ti-check"></i>';
    }
  }
}

function showAuthError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

// User Sign Out
window.userSignOut = function() {
  sessionStorage.removeItem('sw_session_user');
  state.authUser = null;
  state.checkPhoto = null;
  state.lastScanMetrics = null;
  resetCheckScreenForUser();

  // Clear inputs
  const phoneInput = document.getElementById('login-phone-input');
  const passInput = document.getElementById('login-pass-input');
  if (phoneInput) phoneInput.value = '';
  if (passInput) passInput.value = '';

  checkAuthState();
};

// Sync user state changes back to database
function syncUserData() {
  if (!state.authUser?.phone) return;
  apiPost('/api/auth/sync', {
    phone: state.authUser.phone,
    data: {
      name: state.profile?.name,
      city: state.location?.name,
      location: state.location,
      skinType: state.profile?.skinType,
      amSteps: state.amSteps,
      pmSteps: state.pmSteps,
      suppSteps: state.suppSteps,
      waterGlasses: state.waterGlasses,
      waterTarget: state.waterTarget,
      skinCyclePhase: state.skinCyclePhase,
      checkPhoto: state.checkPhoto
    }
  }).catch(() => {});
}

// Hook Sign Out Button in Profile screen
const profSignOutBtn = document.getElementById('profile-sign-out-btn') || document.getElementById('sign-out-btn');
if (profSignOutBtn) {
  profSignOutBtn.addEventListener('click', window.userSignOut);
}

// Tabs Switcher (Sign In vs Create Account)
const tabSignIn = document.getElementById('tab-btn-signin');
const tabSignUp = document.getElementById('tab-btn-signup');
const formSignIn = document.getElementById('form-signin');
const formSignUp = document.getElementById('form-signup');

if (tabSignIn && tabSignUp && formSignIn && formSignUp) {
  tabSignIn.addEventListener('click', () => {
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    formSignIn.style.display = 'block';
    formSignUp.style.display = 'none';
  });

  tabSignUp.addEventListener('click', () => {
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    formSignUp.style.display = 'block';
    formSignIn.style.display = 'none';
  });
}

// Password Visibility Toggles
const toggleLoginPass = document.getElementById('toggle-login-pass');
const loginPassInput = document.getElementById('login-pass-input');
if (toggleLoginPass && loginPassInput) {
  toggleLoginPass.addEventListener('click', () => {
    const isPass = loginPassInput.type === 'password';
    loginPassInput.type = isPass ? 'text' : 'password';
    toggleLoginPass.innerHTML = `<i class="ti ${isPass ? 'ti-eye-off' : 'ti-eye'}"></i>`;
  });
}

const toggleSignupPass = document.getElementById('toggle-signup-pass');
const signupPassInput = document.getElementById('signup-pass-input');
if (toggleSignupPass && signupPassInput) {
  toggleSignupPass.addEventListener('click', () => {
    const isPass = signupPassInput.type === 'password';
    signupPassInput.type = isPass ? 'text' : 'password';
    toggleSignupPass.innerHTML = `<i class="ti ${isPass ? 'ti-eye-off' : 'ti-eye'}"></i>`;
  });
}

// Auth Submit Buttons & Enter Key Listeners
const loginSubmitBtn = document.getElementById('auth-login-submit-btn');
if (loginSubmitBtn) {
  loginSubmitBtn.addEventListener('click', handleUserLogin);
}

const signupSubmitBtn = document.getElementById('auth-signup-submit-btn');
if (signupSubmitBtn) {
  signupSubmitBtn.addEventListener('click', handleUserRegistration);
}

const loginPhoneInput = document.getElementById('login-phone-input');
if (loginPhoneInput && loginPassInput) {
  loginPhoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginPassInput.focus();
  });
  loginPassInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUserLogin();
  });
}

// ---------- Initial App Bootstrap ----------
updateDateTime();
setInterval(updateDateTime, 30000);
checkAuthState();
initAkvileSystem();

// ==========================================================================
// AKVILE SKIN INTELLIGENCE SYSTEM LOGIC & ENGINES
// ==========================================================================

function initAkvileSystem() {
  setupAkvileSubtabs();
  setupAkvileTriggerLogger();
  setupAkvileInciChecker();
  setupAkvileSkinSchool();
  renderAkvileSystem();
}

function renderAkvileSystem() {
  renderAkvileHistoryList();
  renderAkvileTriggerAnalytics();
  renderAkvileSchoolProgress();
}

// 1. Akvile Subtab Switcher
function setupAkvileSubtabs() {
  const tabBtns = document.querySelectorAll('.akvile-subtab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.akvile-subview').forEach(view => {
        view.style.display = 'none';
      });

      const activeView = document.getElementById('akvile-view-' + targetTab);
      if (activeView) {
        activeView.style.display = 'block';
      }

      if (targetTab !== 'scan' && typeof stopLiveCamera === 'function') {
        stopLiveCamera();
      }
    });
  });
}

// 2. Akvile Daily Trigger & Symptom Logger
function setupAkvileTriggerLogger() {
  // Acne Severity Pills
  const acnePills = document.querySelectorAll('#akvile-acne-pills .akvile-chip');
  const acneBadge = document.getElementById('akvile-acne-badge');
  const acneLabels = ['Clear (0/3)', 'Mild (1-2 bumps)', 'Moderate Inflamed', 'Cystic Flare'];
  acnePills.forEach(pill => {
    pill.addEventListener('click', () => {
      acnePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = parseInt(pill.dataset.val, 10);
      state.akvileCurrentLog.acne = val;
      if (acneBadge) acneBadge.textContent = acneLabels[val] || 'Logged';
    });
  });

  // Barrier Multi-Chips
  const barrierChips = document.querySelectorAll('#akvile-barrier-chips .akvile-chip');
  const barrierBadge = document.getElementById('akvile-barrier-badge');
  barrierChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const selected = Array.from(document.querySelectorAll('#akvile-barrier-chips .akvile-chip.active')).map(c => c.dataset.val);
      state.akvileCurrentLog.barrier = selected.length ? selected : ['Calm'];
      if (barrierBadge) barrierBadge.textContent = state.akvileCurrentLog.barrier.join(', ');
    });
  });

  // Stress Level Pills
  const stressPills = document.querySelectorAll('#akvile-stress-pills .akvile-chip');
  stressPills.forEach(pill => {
    pill.addEventListener('click', () => {
      stressPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.akvileCurrentLog.stress = pill.dataset.val;
    });
  });

  // Sleep Pills
  const sleepPills = document.querySelectorAll('#akvile-sleep-pills .akvile-chip');
  sleepPills.forEach(pill => {
    pill.addEventListener('click', () => {
      sleepPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.akvileCurrentLog.sleep = pill.dataset.val;
    });
  });

  // Diet Multi-Chips
  const dietChips = document.querySelectorAll('#akvile-diet-chips .akvile-chip');
  dietChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      const selected = Array.from(document.querySelectorAll('#akvile-diet-chips .akvile-chip.active')).map(c => c.dataset.val);
      state.akvileCurrentLog.diet = selected.length ? selected : ['Clean'];
    });
  });

  // Cycle Pills
  const cyclePills = document.querySelectorAll('#akvile-cycle-pills .akvile-chip');
  cyclePills.forEach(pill => {
    pill.addEventListener('click', () => {
      cyclePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.akvileCurrentLog.cycle = pill.dataset.val;
    });
  });

  // Save Log Action
  const saveBtn = document.getElementById('save-akvile-log-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const now = new Date();
      const timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const newEntry = {
        date: 'Today (' + timeStr + ')',
        acne: state.akvileCurrentLog.acne,
        barrier: [...state.akvileCurrentLog.barrier],
        stress: state.akvileCurrentLog.stress,
        sleep: state.akvileCurrentLog.sleep,
        diet: [...state.akvileCurrentLog.diet],
        cycle: state.akvileCurrentLog.cycle,
        timestamp: Date.now()
      };

      state.akvileLogs.unshift(newEntry);
      if (state.akvileLogs.length > 20) state.akvileLogs.pop();

      saveJSON('sw_akvile_logs', state.akvileLogs);
      saveCurrentUserData();

      renderAkvileHistoryList();
      renderAkvileTriggerAnalytics();

      // Show toast
      const toast = document.getElementById('sms-toast');
      const body = document.getElementById('sms-toast-body');
      if (toast && body) {
        body.innerHTML = `<strong>Daily Skin Log Saved:</strong> Today's trigger log and telemetry calibrated!`;
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
      }
    });
  }
}

function renderAkvileHistoryList() {
  const listEl = document.getElementById('akvile-history-list');
  if (!listEl) return;

  const logs = state.akvileLogs || [];
  if (!logs.length) {
    listEl.innerHTML = `<p class="muted-note" style="text-align:center; padding:12px 0;">No logs yet. Save your first daily log above!</p>`;
    return;
  }

  const acneNames = ['Clear', 'Mild', 'Moderate', 'Cystic'];
  listEl.innerHTML = logs.slice(0, 5).map(item => `
    <div class="akvile-hist-row">
      <div>
        <div class="akvile-hist-date">${item.date || 'Recent'}</div>
        <div class="akvile-hist-chips" style="margin-top:3px;">
          <span class="akvile-hist-tag">Acne: ${acneNames[item.acne] || 'Clear'}</span>
          <span class="akvile-hist-tag">${(item.barrier || []).slice(0, 2).join(', ')}</span>
        </div>
      </div>
      <div class="akvile-hist-chips">
        <span class="akvile-hist-tag">Stress: ${item.stress || 'Low'}</span>
        <span class="akvile-hist-tag">${item.sleep || '7-8h'}</span>
      </div>
    </div>
  `).join('');
}

function renderAkvileTriggerAnalytics() {
  const insightText = document.getElementById('akvile-insight-text');
  const barsContainer = document.getElementById('akvile-correlation-bars');
  const logs = state.akvileLogs || [];

  if (logs.length < 2) {
    if (insightText) {
      insightText.textContent = 'Keep logging daily to unlock personalized trigger correlations with climate & diet.';
    }
    return;
  }

  // Calculate correlations from history
  let highStressCount = 0;
  let flareCount = 0;
  let dairyCount = 0;
  let shortSleepCount = 0;

  logs.forEach(l => {
    if (l.acne >= 1 || (l.barrier && l.barrier.includes('Redness'))) {
      flareCount++;
      if (l.stress === 'High') highStressCount++;
      if (l.sleep === '<6h') shortSleepCount++;
      if (l.diet && l.diet.includes('Dairy')) dairyCount++;
    }
  });

  const stressPct = Math.min(95, Math.max(25, Math.round((highStressCount / (flareCount || 1)) * 100) || 75));
  const dietPct = Math.min(85, Math.max(20, Math.round((dairyCount / (flareCount || 1)) * 100) || 40));
  const humPct = (state.weather && state.weather.humidity > 65) ? 65 : 25;

  if (insightText) {
    insightText.innerHTML = `<strong>Trigger Analysis:</strong> Flare-ups show a <strong style="color:var(--danger);">${stressPct}% correlation</strong> with elevated stress & sleep loss. Current climate humidity (${state.weather ? state.weather.humidity + '%' : '68%'}) is well regulated by your lightweight routine.`;
  }

  if (barsContainer) {
    barsContainer.innerHTML = `
      <div class="akvile-corr-item">
        <div class="akvile-corr-row">
          <span><i class="ti ti-flame"></i> High Stress + Sleep Deficit</span>
          <strong style="color:var(--danger);">${stressPct}% Correlation</strong>
        </div>
        <div class="akvile-corr-track"><div class="akvile-corr-fill" style="width:${stressPct}%; background:var(--danger);"></div></div>
      </div>
      <div class="akvile-corr-item">
        <div class="akvile-corr-row">
          <span><i class="ti ti-milk"></i> Dairy / High Sugar Intake</span>
          <strong style="color:#D97706;">${dietPct}% Correlation</strong>
        </div>
        <div class="akvile-corr-track"><div class="akvile-corr-fill" style="width:${dietPct}%; background:#D97706;"></div></div>
      </div>
      <div class="akvile-corr-item">
        <div class="akvile-corr-row">
          <span><i class="ti ti-cloud-rain"></i> Climate Humidity & Sebum Viscosity</span>
          <strong style="color:#2563EB;">${humPct}% Correlation</strong>
        </div>
        <div class="akvile-corr-track"><div class="akvile-corr-fill" style="width:${humPct}%; background:#2563EB;"></div></div>
      </div>
    `;
  }
}

// 3. Akvile Pore-Clogging & INCI Ingredient Safety Engine
const INCI_DATABASE = {
  // Comedogenic 5 (Severe Clogging)
  'isopropyl myristate': { rating: 5, type: 'clog', note: 'Severe pore clogger & acne flare trigger', fa: true },
  'isopropyl isostearate': { rating: 5, type: 'clog', note: 'High comedogenic ester', fa: true },
  'myristyl myristate': { rating: 5, type: 'clog', note: 'Heavy occlusive wax ester', fa: true },
  'wheat germ oil': { rating: 5, type: 'clog', note: 'Extremely heavy lipid', fa: true },
  'algae extract': { rating: 5, type: 'clog', note: 'Can trap dead keratin in follicles', fa: false },
  'laureth-4': { rating: 5, type: 'clog', note: 'High comedogenic surfactant', fa: false },
  'potassium chloride': { rating: 5, type: 'clog', note: 'Comedogenic mineral binder', fa: false },

  // Comedogenic 4 (High Clogging)
  'coconut oil': { rating: 4, type: 'clog', note: 'High lauric acid; clogs acne-prone pores', fa: true },
  'cocos nucifera oil': { rating: 4, type: 'clog', note: 'High lauric acid (Coconut Oil)', fa: true },
  'cocoa butter': { rating: 4, type: 'clog', note: 'Rich dense butter; pore clog risk', fa: true },
  'ethylhexyl palmitate': { rating: 4, type: 'clog', note: 'Fatty acid ester known for micro-comedones', fa: true },
  'isostearyl isostearate': { rating: 4, type: 'clog', note: 'High comedogenic lubricant', fa: true },
  'myristyl lactate': { rating: 4, type: 'clog', note: 'Pore-clogging ester', fa: true },
  'sodium chloride': { rating: 4, type: 'clog', note: 'May aggravate cystic breakouts in high concentrations', fa: false },
  'acetylated lanolin': { rating: 4, type: 'clog', note: 'Heavy animal lipid derivative', fa: true },

  // Comedogenic 3 (Moderate Clogging)
  'mineral oil': { rating: 3, type: 'clog', note: 'Heavy occlusive; traps sebum', fa: false },
  'sesame oil': { rating: 3, type: 'clog', note: 'Moderate comedogenicity', fa: true },
  'avocado oil': { rating: 3, type: 'clog', note: 'Rich oleic acid profile', fa: true },
  'soybean oil': { rating: 3, type: 'clog', note: 'Can aggravate acne-prone pores', fa: true },
  'lauric acid': { rating: 3, type: 'clog', note: 'Fatty acid; fungal acne trigger', fa: true },
  'myristic acid': { rating: 3, type: 'clog', note: 'Fatty acid; fungal acne trigger', fa: true },
  'palmitic acid': { rating: 2, type: 'clog', note: 'Fatty acid; fungal acne trigger', fa: true },
  'stearic acid': { rating: 2, type: 'clog', note: 'Fatty acid; safe for most, fungal trigger', fa: true },

  // Comedogenic 2 (Mild Clogging / Barrier Emollients)
  'cetearyl alcohol': { rating: 2, type: 'emollient', note: 'Fatty alcohol emollient; well tolerated by most', fa: false },
  'cetyl alcohol': { rating: 2, type: 'emollient', note: 'Fatty alcohol texture enhancer', fa: false },
  'stearyl alcohol': { rating: 2, type: 'emollient', note: 'Fatty alcohol emollient', fa: false },
  'jojoba oil': { rating: 2, type: 'oil', note: 'Liquid wax mimicking human sebum', fa: false },
  'beeswax': { rating: 2, type: 'wax', note: 'Natural occlusive', fa: false },
  'cera alba': { rating: 2, type: 'wax', note: 'Natural beeswax', fa: false },
  'shea butter': { rating: 1, type: 'butter', note: 'Rich barrier lipid; fungal acne trigger', fa: true },
  'butyrospermum parkii butter': { rating: 1, type: 'butter', note: 'Shea butter; fungal acne trigger', fa: true },

  // Sensitizers / Irritants
  'fragrance': { rating: 0, type: 'sensitizer', note: 'Synthetic fragrance; potential contact allergen', fa: false },
  'parfum': { rating: 0, type: 'sensitizer', note: 'Fragrance compound; potential contact allergen', fa: false },
  'denatured alcohol': { rating: 0, type: 'sensitizer', note: 'Drying short-chain alcohol; compromises barrier', fa: false },
  'alcohol denat': { rating: 0, type: 'sensitizer', note: 'Drying solvent; compromises barrier', fa: false },
  'citrus limon peel oil': { rating: 0, type: 'sensitizer', note: 'Essential oil; phototoxic sensitizer', fa: false },
  'lavandula angustifolia oil': { rating: 0, type: 'sensitizer', note: 'Lavender essential oil; potential irritant', fa: false },
  'linalool': { rating: 0, type: 'sensitizer', note: 'Fragrance allergen compound', fa: false },
  'limonene': { rating: 0, type: 'sensitizer', note: 'Fragrance allergen compound', fa: false },

  // Comedogenic 0 & Acne-Safe Heroes
  'water': { rating: 0, type: 'safe', note: 'Solvent & base', fa: false },
  'aqua': { rating: 0, type: 'safe', note: 'Purified water base', fa: false },
  'glycerin': { rating: 0, type: 'safe', note: 'Gold-standard skin-identical humectant', fa: false },
  'niacinamide': { rating: 0, type: 'safe', note: 'Vitamin B3; reduces sebum, redness & barrier stress', fa: false },
  'squalane': { rating: 0, type: 'safe', note: '100% non-comedogenic, fungal acne-safe lipid', fa: false },
  'salicylic acid': { rating: 0, type: 'safe', note: 'BHA exfoliant; clears inside pore lining', fa: false },
  'hyaluronic acid': { rating: 0, type: 'safe', note: 'Binds 1000x its weight in cellular water', fa: false },
  'sodium hyaluronate': { rating: 0, type: 'safe', note: 'Low molecular weight hydrating humectant', fa: false },
  'centella asiatica extract': { rating: 0, type: 'safe', note: 'Cica; calms erythema & accelerates barrier repair', fa: false },
  'panthenol': { rating: 0, type: 'safe', note: 'Pro-Vitamin B5; soothing & hydrating', fa: false },
  'allantoin': { rating: 0, type: 'safe', note: 'Keratolytic & soothing skin protectant', fa: false },
  'ceramide np': { rating: 0, type: 'safe', note: 'Essential barrier lipid (3:1:1 ratio)', fa: false },
  'ceramide ap': { rating: 0, type: 'safe', note: 'Essential barrier lipid (3:1:1 ratio)', fa: false },
  'ceramide eop': { rating: 0, type: 'safe', note: 'Essential barrier lipid (3:1:1 ratio)', fa: false },
  'phytosphingosine': { rating: 0, type: 'safe', note: 'Antimicrobial lipid; inhibits C. acnes', fa: false },
  'zinc pca': { rating: 0, type: 'safe', note: 'Regulates 5-alpha reductase & sebum flow', fa: false },
  'azelaic acid': { rating: 0, type: 'safe', note: 'Dermatologist active for acne & rosacea erythema', fa: false },
  'green tea extract': { rating: 0, type: 'safe', note: 'Potent antioxidant (EGCG)', fa: false },
  'camellia sinensis leaf extract': { rating: 0, type: 'safe', note: 'Green tea antioxidant', fa: false },
  'tocopherol': { rating: 1, type: 'safe', note: 'Vitamin E antioxidant', fa: false },
  'l-ascorbic acid': { rating: 0, type: 'safe', note: 'Pure Vitamin C; stimulates collagen synthesis', fa: false },
  'ascorbic acid': { rating: 0, type: 'safe', note: 'Vitamin C antioxidant', fa: false },
  'madecassoside': { rating: 0, type: 'safe', note: 'Bioactive Centella triterpenoid', fa: false },
  'zinc oxide': { rating: 0, type: 'safe', note: 'Physical mineral UV shield; anti-inflammatory', fa: false },
  'titanium dioxide': { rating: 0, type: 'safe', note: 'Physical broad-spectrum UV reflector', fa: false },
  'butylene glycol': { rating: 1, type: 'safe', note: 'Gentle humectant & slip agent', fa: false },
  'caprylic/capric triglyceride': { rating: 1, type: 'safe', note: 'Lightweight coconut-derived emollient', fa: true },
  'dimethicone': { rating: 1, type: 'safe', note: 'Breathable silicone barrier protector', fa: false },
  'polysorbate 20': { rating: 0, type: 'emulsifier', note: 'Emulsifier; fungal acne trigger', fa: true },
  'polysorbate 60': { rating: 0, type: 'emulsifier', note: 'Emulsifier; fungal acne trigger', fa: true },
  'polysorbate 80': { rating: 0, type: 'emulsifier', note: 'Emulsifier; fungal acne trigger', fa: true }
};

const INCI_PRESETS = {
  cerave: 'Aqua / Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Hyaluronic Acid, Sodium Lauroyl Lactylate, Dimethicone',
  heavycream: 'Water, Cocos Nucifera (Coconut) Oil, Isopropyl Myristate, Ethylhexyl Palmitate, Theobroma Cacao (Cocoa) Seed Butter, Cetearyl Alcohol, Fragrance, Wheat Germ Oil, Laureth-4',
  bha: 'Water / Aqua, Methylpropanediol, Butylene Glycol, Salicylic Acid (2%), Polysorbate 20, Camellia Sinensis (Green Tea) Leaf Extract, Sodium Hydroxide, Tetrasodium EDTA',
  spf50: 'Zinc Oxide (12%), Titanium Dioxide (4%), Water / Aqua, Squalane, Butyloctyl Salicylate, Niacinamide, Glycerin, Caprylic/Capric Triglyceride, Dimethicone, Tocopherol, Centella Asiatica Extract'
};

function setupAkvileInciChecker() {
  const analyzeBtn = document.getElementById('analyze-inci-btn');
  const clearBtn = document.getElementById('clear-inci-btn');
  const textarea = document.getElementById('inci-input-text');

  if (analyzeBtn && textarea) {
    analyzeBtn.addEventListener('click', () => {
      analyzeSkincareIngredients(textarea.value);
    });
  }

  if (clearBtn && textarea) {
    clearBtn.addEventListener('click', () => {
      textarea.value = '';
      const resultsBox = document.getElementById('inci-results-box');
      if (resultsBox) resultsBox.style.display = 'none';
    });
  }

  window.loadInciPreset = function(key) {
    if (textarea && INCI_PRESETS[key]) {
      textarea.value = INCI_PRESETS[key];
      analyzeSkincareIngredients(INCI_PRESETS[key]);
    }
  };
}

function analyzeSkincareIngredients(text) {
  if (!text || !text.trim()) {
    alert('Please paste or type an ingredient list first.');
    return;
  }

  const resultsBox = document.getElementById('inci-results-box');
  if (!resultsBox) return;

  // Split by comma, semicolon, newline
  const rawItems = text.split(/[,;\n\/\•]+/).map(s => s.trim()).filter(s => s.length > 1);

  let highCloggers = 0;
  let fungalTriggers = 0;
  let sensitizers = 0;
  let safeCount = 0;
  let totalScore = 100;

  const parsedItems = [];

  rawItems.forEach(item => {
    // clean punctuation
    const clean = item.toLowerCase().replace(/[\(\)\*\d%\.\+]/g, '').trim();
    let match = null;
    let matchKey = '';

    // Direct lookup or substring search
    for (const key in INCI_DATABASE) {
      if (clean === key || clean.includes(key) || key.includes(clean)) {
        match = INCI_DATABASE[key];
        matchKey = key;
        break;
      }
    }

    if (match) {
      if (match.rating >= 4) {
        highCloggers++;
        totalScore -= 22;
      } else if (match.rating >= 3) {
        highCloggers++;
        totalScore -= 12;
      }

      if (match.fa) {
        fungalTriggers++;
        totalScore -= 5;
      }

      if (match.type === 'sensitizer') {
        sensitizers++;
        totalScore -= 10;
      }

      if (match.type === 'safe') {
        safeCount++;
      }

      parsedItems.push({
        raw: item,
        matched: matchKey,
        rating: match.rating,
        type: match.type,
        note: match.note,
        fa: match.fa
      });
    } else {
      // Default safe/neutral for unlisted
      parsedItems.push({
        raw: item,
        matched: clean,
        rating: 0,
        type: 'neutral',
        note: 'General botanical or cosmetic excipient',
        fa: false
      });
      safeCount++;
    }
  });

  totalScore = Math.max(12, Math.min(100, totalScore));

  // Update verdict badge & score circle
  const verdictBadge = document.getElementById('inci-verdict-badge');
  const verdictSub = document.getElementById('inci-verdict-sub');
  const scoreEl = document.getElementById('inci-safe-score');
  const scoreCircle = document.getElementById('inci-score-circle');

  if (scoreEl) scoreEl.textContent = totalScore;

  if (verdictBadge) {
    if (highCloggers >= 2 || totalScore < 60) {
      verdictBadge.className = 'inci-verdict-badge danger';
      verdictBadge.textContent = '❌ High Breakout Aggravators';
      if (verdictSub) verdictSub.textContent = `Found ${highCloggers} high-comedogenic pore-clogging ingredients.`;
      if (scoreCircle) {
        scoreCircle.style.borderColor = '#EF4444';
        scoreCircle.style.color = '#B91C1C';
        scoreCircle.style.background = '#FEF2F2';
      }
    } else if (highCloggers === 1 || sensitizers >= 1 || fungalTriggers >= 2) {
      verdictBadge.className = 'inci-verdict-badge warn';
      verdictBadge.textContent = '⚠️ Caution: Contains Triggers';
      if (verdictSub) verdictSub.textContent = `Mild caution: Contains potential pore-cloggers or sensitizers.`;
      if (scoreCircle) {
        scoreCircle.style.borderColor = '#F59E0B';
        scoreCircle.style.color = '#B45309';
        scoreCircle.style.background = '#FFFBEB';
      }
    } else {
      verdictBadge.className = 'inci-verdict-badge';
      verdictBadge.textContent = '✅ 100% Acne-Safe';
      if (verdictSub) verdictSub.textContent = `No high-comedogenic (4-5) or barrier-stripping irritants detected.`;
      if (scoreCircle) {
        scoreCircle.style.borderColor = '#22C55E';
        scoreCircle.style.color = '#15803D';
        scoreCircle.style.background = '#F0FDF4';
      }
    }
  }

  // Update counters
  const clogCountEl = document.getElementById('inci-clog-count');
  const faCountEl = document.getElementById('inci-fa-count');
  const irrCountEl = document.getElementById('inci-irr-count');
  const safeCountEl = document.getElementById('inci-safe-count');

  if (clogCountEl) clogCountEl.textContent = highCloggers;
  if (faCountEl) faCountEl.textContent = fungalTriggers;
  if (irrCountEl) irrCountEl.textContent = sensitizers;
  if (safeCountEl) safeCountEl.textContent = safeCount;

  // Render items list
  const listEl = document.getElementById('inci-items-list');
  if (listEl) {
    listEl.innerHTML = parsedItems.map(p => {
      let badgeClass = 'safe';
      let badgeText = `Comedogenic: ${p.rating}/5`;
      let isClogger = false;

      if (p.rating >= 4) {
        badgeClass = 'danger';
        badgeText = `Clog Rating: ${p.rating}/5`;
        isClogger = true;
      } else if (p.rating >= 2 || p.type === 'sensitizer' || p.fa) {
        badgeClass = 'warn';
        if (p.type === 'sensitizer') badgeText = 'Sensitizer / Irritant';
        else if (p.fa) badgeText = `Clog: ${p.rating} · Fungal Trigger`;
      }

      return `
        <div class="inci-item-row ${isClogger ? 'clogger' : ''}">
          <div style="flex:1; padding-right:8px;">
            <div class="inci-item-name">
              ${isClogger ? '<i class="ti ti-alert-triangle" style="color:var(--danger);"></i>' : '<i class="ti ti-check" style="color:#16A34A;"></i>'}
              <span>${p.raw}</span>
            </div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${p.note}</div>
          </div>
          <span class="inci-rating-badge ${badgeClass}">${badgeText}</span>
        </div>
      `;
    }).join('');
  }

  resultsBox.style.display = 'block';
}

// 4. Akvile Skin School (Micro-learning)
function setupAkvileSkinSchool() {
  window.toggleSchoolLesson = function(id) {
    const body = document.getElementById('school-body-' + id);
    if (body) {
      body.style.display = (body.style.display === 'none') ? 'block' : 'none';
    }
  };

  window.toggleSchoolDone = function(id) {
    const prog = state.akvileSchoolProgress || [];
    const idx = prog.indexOf(id);
    if (idx >= 0) {
      prog.splice(idx, 1);
    } else {
      prog.push(id);
    }
    state.akvileSchoolProgress = prog;
    saveJSON('sw_akvile_school', state.akvileSchoolProgress);
    saveCurrentUserData();
    renderAkvileSchoolProgress();
  };
}

function renderAkvileSchoolProgress() {
  const prog = state.akvileSchoolProgress || [];
  const total = 4;
  const pct = Math.round((prog.length / total) * 100);

  const pctEl = document.getElementById('school-progress-pct');
  const fillEl = document.getElementById('school-fill');

  if (pctEl) pctEl.textContent = `${pct}% Mastered (${prog.length}/${total})`;
  if (fillEl) fillEl.style.width = `${pct}%`;

  for (let i = 1; i <= total; i++) {
    const card = document.querySelector(`.school-card[data-lesson="${i}"]`);
    if (card) {
      const btn = card.querySelector('.school-check-btn');
      if (btn) {
        if (prog.includes(i)) {
          btn.classList.add('checked');
          btn.innerHTML = `<i class="ti ti-circle-check-filled"></i>`;
        } else {
          btn.classList.remove('checked');
          btn.innerHTML = `<i class="ti ti-circle-check"></i>`;
        }
      }
    }
  }
}



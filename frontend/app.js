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
  authUser: loadJSON('sw_auth_user', { phone: '+91 98765 43210', name: 'Balaji', verified: true }),
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
    ]
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
    checkHistory: state.checkHistory || []
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

  resetCheckScreenForUser();
  return true;
}

function resetCheckScreenForUser() {
  const uploadZone = document.getElementById('upload-zone');
  const uploadContent = document.getElementById('upload-zone-content');
  const diagnosticResults = document.getElementById('diagnostic-results');
  const photoActions = document.getElementById('photo-actions');
  const cameraContainer = document.getElementById('camera-container');

  if (typeof activeCameraStream !== 'undefined' && activeCameraStream) {
    activeCameraStream.getTracks().forEach(t => t.stop());
    activeCameraStream = null;
  }
  if (cameraContainer) cameraContainer.style.display = 'none';

  if (state.checkPhoto) {
    if (uploadZone) {
      uploadZone.style.display = 'block';
      uploadZone.style.backgroundImage = `url('${state.checkPhoto}')`;
    }
    if (uploadContent) uploadContent.style.display = 'none';
    if (photoActions) photoActions.style.display = 'flex';
    if (diagnosticResults) diagnosticResults.style.display = 'block';
  } else {
    if (uploadZone) {
      uploadZone.style.display = 'block';
      uploadZone.style.backgroundImage = '';
    }
    if (uploadContent) uploadContent.style.display = 'flex';
    if (photoActions) photoActions.style.display = 'none';
    if (diagnosticResults) diagnosticResults.style.display = 'none';
  }

  if (typeof renderPastWeekComparison === 'function') {
    renderPastWeekComparison();
  }
}

// ---------- Authentication & Phone Login Flow ----------
let otpCountdownTimer = null;
let currentPendingPhone = '';
let currentGeneratedOtp = '1234';

function checkAuthState() {
  const authScreen = document.getElementById('screen-auth');
  const onboardScreen = document.getElementById('screen-onboarding');
  const tabbar = document.querySelector('.tabbar');
  const homeScreen = document.getElementById('screen-home');

  if (!state.authUser) {
    // Show Auth Screen, Hide Tabbar & App Screens
    document.querySelectorAll('.screen').forEach((s) => (s.style.display = 'none'));
    if (authScreen) authScreen.style.display = 'flex';
    if (onboardScreen) onboardScreen.style.display = 'none';
    if (tabbar) tabbar.style.display = 'none';
    resetAuthScreen();
  } else if (state.authUser.isNewUser) {
    // New User: Show Onboarding Wizard
    document.querySelectorAll('.screen').forEach((s) => (s.style.display = 'none'));
    if (onboardScreen) onboardScreen.style.display = 'block';
    if (tabbar) tabbar.style.display = 'none';
    startOnboardingWizard();
  } else {
    // Verified User: Show Tabbar & App Screens
    if (authScreen) authScreen.style.display = 'none';
    if (onboardScreen) onboardScreen.style.display = 'none';
    if (tabbar) tabbar.style.display = 'flex';

    if (state.authUser && state.authUser.phone) {
      loadUserDataForPhone(state.authUser.phone);
    }

    // Select active nav
    const activeNav = document.querySelector('.nav-btn.active') || document.querySelector('.nav-btn[data-screen="home"]');
    const screenId = activeNav ? 'screen-' + activeNav.dataset.screen : 'screen-home';
    const activeScreen = document.getElementById(screenId) || homeScreen;
    if (activeScreen) activeScreen.style.display = 'block';

    renderHome();
    renderProfile();
    renderRoutineAll();
  }
}

function resetAuthScreen() {
  const phoneStep = document.getElementById('auth-step-phone');
  const otpStep = document.getElementById('auth-step-otp');
  const phoneInput = document.getElementById('auth-phone-input');
  const phoneError = document.getElementById('auth-phone-error');
  const otpError = document.getElementById('auth-otp-error');

  if (phoneStep) phoneStep.style.display = 'block';
  if (otpStep) otpStep.style.display = 'none';
  if (phoneError) phoneError.style.display = 'none';
  if (otpError) otpError.style.display = 'none';
  if (phoneInput) {
    phoneInput.value = '';
    phoneInput.focus();
  }
  document.querySelectorAll('.otp-box').forEach(b => b.value = '');
}

async function requestPhoneOtp(phone) {
  const phoneError = document.getElementById('auth-phone-error');
  const sendBtn = document.getElementById('auth-send-otp-btn');
  if (phoneError) phoneError.style.display = 'none';

  if (!phone || phone.length < 8) {
    if (phoneError) {
      phoneError.textContent = 'Please enter a valid 10-digit mobile number.';
      phoneError.style.display = 'block';
    }
    return;
  }

  currentPendingPhone = phone;
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="ti ti-loader-2 rotate"></i> Sending code...';
  }

  try {
    const res = await apiPost('/api/auth/send-otp', { phone });
    currentGeneratedOtp = res.code || '1234';

    // Transition to OTP step
    document.getElementById('auth-step-phone').style.display = 'none';
    document.getElementById('auth-step-otp').style.display = 'block';
    document.getElementById('auth-display-phone').textContent = currentPendingPhone;

    // Focus 1st OTP Box
    const firstOtp = document.getElementById('otp-1');
    if (firstOtp) firstOtp.focus();

    // Trigger SMS Notification Toast
    showSmsToast(currentGeneratedOtp);

    // Start 30s Countdown
    startOtpCountdown();
  } catch (err) {
    if (phoneError) {
      phoneError.textContent = err.message || 'Failed to send OTP code. Please check connection.';
      phoneError.style.display = 'block';
    }
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>Send Verification Code</span> <i class="ti ti-arrow-right"></i>';
    }
  }
}

async function submitOtpVerification(code) {
  const otpError = document.getElementById('auth-otp-error');
  const verifyBtn = document.getElementById('auth-verify-btn');
  if (otpError) otpError.style.display = 'none';

  if (!code || code.length < 4) {
    if (otpError) {
      otpError.textContent = 'Please enter the complete 4-digit code.';
      otpError.style.display = 'block';
    }
    return;
  }

  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="ti ti-loader-2 rotate"></i> Verifying...';
  }

  try {
    const phone = currentPendingPhone || '+91 98765 43210';
    const isExisting = Boolean(usersDb[phone]);

    if (isExisting) {
      // Existing User: load their isolated profile
      loadUserDataForPhone(phone);
      state.authUser = {
        phone,
        name: usersDb[phone].profile?.name || 'Balaji',
        verified: true,
        isNewUser: false
      };
    } else {
      // New User: trigger First-Time Onboarding
      state.authUser = {
        phone,
        name: '',
        verified: true,
        isNewUser: true
      };
    }

    saveJSON('sw_auth_user', state.authUser);

    // Hide SMS Toast
    const toast = document.getElementById('sms-toast');
    if (toast) toast.style.display = 'none';

    checkAuthState();
  } catch (err) {
    if (otpError) {
      otpError.textContent = err.message || 'Invalid code. Use demo code 1234.';
      otpError.style.display = 'block';
    }
  } finally {
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<span>Verify & Enter Dashboard</span> <i class="ti ti-check"></i>';
    }
  }
}

function showSmsToast(code) {
  const toast = document.getElementById('sms-toast');
  const body = document.getElementById('sms-toast-body');
  if (!toast) return;

  if (body) {
    body.innerHTML = `SkinWatch: Your login code is <strong>${code}</strong>. Tap to autofill.`;
  }
  toast.style.display = 'flex';

  setTimeout(() => {
    if (toast) toast.style.display = 'none';
  }, 8000);
}

function startOtpCountdown() {
  let seconds = 30;
  const countLbl = document.getElementById('auth-countdown-lbl');
  const resendBtn = document.getElementById('auth-resend-btn');

  if (resendBtn) resendBtn.style.display = 'none';
  if (countLbl) {
    countLbl.style.display = 'inline';
    countLbl.innerHTML = `Resend code in <strong>0:${seconds < 10 ? '0' : ''}${seconds}</strong>`;
  }

  if (otpCountdownTimer) clearInterval(otpCountdownTimer);

  otpCountdownTimer = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      if (countLbl) countLbl.innerHTML = `Resend code in <strong>0:${seconds < 10 ? '0' : ''}${seconds}</strong>`;
    } else {
      clearInterval(otpCountdownTimer);
      if (countLbl) countLbl.style.display = 'none';
      if (resendBtn) resendBtn.style.display = 'inline';
    }
  }, 1000);
}

// ---------- First-Time Onboarding Wizard Controller ----------
let onboardState = {
  step: 1,
  name: '',
  city: 'Trichy, Tamil Nadu',
  phototype: 'Type III-IV',
  skinType: 'Normal',
  concerns: ['Dryness'],
  lifestyles: ['AC Office', 'Blue Light', 'Sleep 7h']
};

function startOnboardingWizard() {
  onboardState.step = 1;
  renderOnboardStep(1);
  const nameInp = document.getElementById('onboard-name-input');
  if (nameInp) {
    nameInp.value = '';
    nameInp.focus();
  }
}

function renderOnboardStep(stepNum) {
  onboardState.step = stepNum;
  const stepLbl = document.getElementById('onboard-step-lbl');
  const fill = document.getElementById('onboard-progress-fill');
  if (stepLbl) stepLbl.textContent = `Step ${stepNum} of 4`;
  if (fill) fill.style.width = `${stepNum * 25}%`;

  for (let i = 1; i <= 4; i++) {
    const card = document.getElementById(`onboard-step-${i}`);
    if (card) card.style.display = i === stepNum ? 'block' : 'none';
  }

  if (stepNum === 4) {
    generateAndRenderRegimenSummary();
  }
}

function generateAndRenderRegimenSummary() {
  const amSummary = document.getElementById('onboard-am-summary');
  const pmSummary = document.getElementById('onboard-pm-summary');
  const suppSummary = document.getElementById('onboard-supp-summary');

  let amText = 'Gentle Hydrating Cleanser · Vitamin C Antioxidant Serum · SPF 50+ Broad Spectrum Sunscreen';
  let pmText = 'Double Cleansing · Micro-Encapsulated Retinol 0.2% · Barrier Ceramide Moisturizer';

  if (onboardState.skinType === 'Oily' || onboardState.concerns.includes('Acne')) {
    amText = 'Salicylic Acid Purifying Cleanser · Niacinamide 10% + Zinc Serum · Oil-Free Gel Moisturizer · Matte SPF 50+';
    pmText = 'Gentle Micellar Prep · Retinoid Treatment (Gentle 0.1%) · Lightweight Soothing Gel';
  } else if (onboardState.skinType === 'Dry') {
    amText = 'Cream Cleanser · Multi-Molecular Hyaluronic Acid · Deep Ceramide Cream · Dewy SPF 50+';
    pmText = 'Nourishing Oil Cleanser · Peptide Recovery Elixir · Rich Lipid Barrier Balm';
  } else if (onboardState.skinType === 'Sensitive') {
    amText = 'Ultra-Calming Cleansing Milk · Centella Asiatica Serum · Barrier Repair Emulsion · Mineral Zinc SPF 50+';
    pmText = 'Gentle Soothing Wash · Bakuchiol Botanical Retinol Alt · Calming Oat Barrier Cream';
  }

  if (amSummary) amSummary.textContent = amText;
  if (pmSummary) pmSummary.textContent = pmText;
  if (suppSummary) suppSummary.textContent = '8 Drops (2.4L Water / Day) · Omega-3 Fish Oil · Vitamin C & Collagen Defense';
}

function finishOnboarding() {
  const phone = state.authUser?.phone || '+91 98765 43210';
  const name = onboardState.name.trim() || 'Balaji';

  // Build calibrated starter steps
  let starterAm = [
    { id: 'a1', name: 'Gentle Cleanser', done: false },
    { id: 'a2', name: 'Vitamin C Antioxidant Serum', done: false },
    { id: 'a3', name: 'Broad Spectrum SPF 50+ Sunscreen', done: false }
  ];
  if (onboardState.skinType === 'Oily') {
    starterAm = [
      { id: 'a1', name: 'Clarifying Cleanser', done: false },
      { id: 'a2', name: 'Niacinamide Serum', done: false },
      { id: 'a3', name: 'Matte Oil-Free SPF 50+', done: false }
    ];
  }

  let starterPm = [
    { id: 'p1', name: 'Gentle Cleanser', done: false },
    { id: 'p2', name: 'Retinol 0.2%', done: false },
    { id: 'p3', name: 'Night Barrier Moisturizer', done: false }
  ];

  const starterSupp = [
    { id: 's1', name: 'Omega-3 Fish Oil (Lipid Barrier Support)', done: false },
    { id: 's2', name: 'Vitamin C & Bioflavonoids (Collagen Defense)', done: false },
    { id: 's3', name: 'Zinc & Vitamin D3 (Skin Immunity)', done: false }
  ];

  state.profile = {
    name,
    skinType: onboardState.skinType,
    phototype: onboardState.phototype,
    retinoidTolerance: 'Beginner',
    vitcTolerance: 'Pure C',
    concerns: onboardState.concerns,
    lifestyles: onboardState.lifestyles,
    allergies: []
  };

  state.location = {
    lat: 10.299423,
    lon: 79.074082,
    name: onboardState.city || 'Trichy, Tamil Nadu'
  };

  state.amSteps = starterAm;
  state.pmSteps = starterPm;
  state.suppSteps = starterSupp;
  state.waterGlasses = 4;
  state.waterTarget = 8;
  state.checkPhoto = null;
  state.checkHistory = [];

  state.authUser = {
    phone,
    name,
    verified: true,
    isNewUser: false
  };

  saveJSON('sw_check_photo', null);
  saveJSON('sw_check_history', []);
  saveCurrentUserData();
  saveJSON('sw_auth_user', state.authUser);

  resetCheckScreenForUser();
  checkAuthState();
}

// Onboarding Step 1 Event Listeners
const onboardNext1 = document.getElementById('onboard-next-1');
if (onboardNext1) {
  onboardNext1.addEventListener('click', () => {
    const nameVal = document.getElementById('onboard-name-input')?.value.trim();
    const cityVal = document.getElementById('onboard-city-input')?.value.trim();
    if (!nameVal) {
      alert('Please enter your name to personalize your skincare journey.');
      return;
    }
    onboardState.name = nameVal;
    onboardState.city = cityVal || 'Trichy, Tamil Nadu';
    renderOnboardStep(2);
  });
}

document.getElementById('onboard-locate-btn')?.addEventListener('click', async () => {
  const cityInp = document.getElementById('onboard-city-input');
  if (cityInp) cityInp.value = 'Detecting...';
  try {
    const ipLoc = await apiGet('/api/ip-location');
    if (ipLoc && ipLoc.name) {
      if (cityInp) cityInp.value = ipLoc.name;
      onboardState.city = ipLoc.name;
    } else {
      if (cityInp) cityInp.value = 'Trichy, Tamil Nadu';
    }
  } catch {
    if (cityInp) cityInp.value = 'Trichy, Tamil Nadu';
  }
});

// Onboarding Step 2 Event Listeners
document.querySelectorAll('#onboard-phototype-pills .onboard-pill-card').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#onboard-phototype-pills .onboard-pill-card').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    onboardState.phototype = btn.dataset.val;
  });
});

document.querySelectorAll('#onboard-skintype-pills .pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#onboard-skintype-pills .pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    onboardState.skinType = btn.dataset.val;
  });
});

document.getElementById('onboard-back-2')?.addEventListener('click', () => renderOnboardStep(1));
document.getElementById('onboard-next-2')?.addEventListener('click', () => renderOnboardStep(3));

// Onboarding Step 3 Event Listeners
document.querySelectorAll('#onboard-concern-pills .cpill').forEach((btn) => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.val;
    const idx = onboardState.concerns.indexOf(val);
    if (idx === -1) {
      onboardState.concerns.push(val);
      btn.classList.add('active');
    } else {
      onboardState.concerns.splice(idx, 1);
      btn.classList.remove('active');
    }
  });
});

document.querySelectorAll('#onboard-lifestyle-pills .lpill').forEach((btn) => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.val;
    const idx = onboardState.lifestyles.indexOf(val);
    if (idx === -1) {
      onboardState.lifestyles.push(val);
      btn.classList.add('active');
    } else {
      onboardState.lifestyles.splice(idx, 1);
      btn.classList.remove('active');
    }
  });
});

document.getElementById('onboard-back-3')?.addEventListener('click', () => renderOnboardStep(2));
document.getElementById('onboard-next-3')?.addEventListener('click', () => renderOnboardStep(4));
document.getElementById('onboard-finish-btn')?.addEventListener('click', finishOnboarding);

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

    if (btn.dataset.screen !== 'check' && typeof stopLiveCamera === 'function') {
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

function initOrUpdateMap(lat, lon) {
  if (typeof L === 'undefined') return;
  const mapElem = document.getElementById('home-map');
  if (!mapElem) return;

  if (!homeMapInstance) {
    homeMapInstance = L.map('home-map', {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false
    }).setView([lat, lon], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(homeMapInstance);
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
  homeMapMarker = L.marker([lat, lon], { icon: pinIcon }).addTo(homeMapInstance);
}

function renderHourlyForecast(currentTemp) {
  const now = new Date();
  const currentHour = now.getHours();
  const base = currentTemp != null ? Math.round(currentTemp) : 28;
  const hourlyTemps = state.weather?.hourlyTemps || [];

  const hourNowElem = document.getElementById('hour-now');
  if (hourNowElem) hourNowElem.textContent = `${hourlyTemps[0] != null ? hourlyTemps[0] : base}°`;

  for (let i = 1; i <= 4; i++) {
    const nextHour = (currentHour + i) % 24;
    const period = nextHour >= 12 ? 'PM' : 'AM';
    const displayHour = nextHour % 12 === 0 ? 12 : nextHour % 12;

    const timeElem = document.getElementById(`hour-${i}-time`);
    const tempElem = document.getElementById(`hour-${i}-temp`);

    if (timeElem) timeElem.textContent = `${displayHour}${period}`;
    const tVal = hourlyTemps[i] != null ? hourlyTemps[i] : base;
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
        temperature: 31,
        condition: 'Warm & Sunny',
        humidity: 68,
        uv: 8,
        wind: 14
      };
    }
    if (!state.airQuality) {
      state.airQuality = {
        aqi: 72,
        category: 'Moderate'
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
        aqi: state.airQuality?.aqi ?? 72
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error loading weather/AQI:', err);
    state.weather = state.weather || { temperature: 31, condition: 'Warm & Sunny', humidity: 68, uv: 8, wind: 14 };
    state.airQuality = state.airQuality || { aqi: 72, category: 'Moderate' };
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
  const w = state.weather || { temperature: 31, condition: 'Warm & Sunny', humidity: 68, uv: 8, wind: 14 };
  const aqi = state.airQuality || { aqi: 72, category: 'Moderate' };
  const locName = state.location?.name || 'Trichy, Tamil Nadu';

  const heroCity = document.getElementById('hero-city');
  const profLoc = document.getElementById('profile-location');
  if (heroCity) heroCity.textContent = locName;
  if (profLoc) profLoc.textContent = locName;

  document.getElementById('hero-temp').textContent = Math.round(w.temperature) + '°';
  document.getElementById('hero-cond').textContent = w.condition || 'Warm & Sunny';
  document.getElementById('stat-hum').textContent = w.humidity + '% humidity';
  document.getElementById('stat-uv').textContent = 'UV ' + w.uv;
  document.getElementById('stat-aqi').textContent = 'AQI ' + aqi.aqi;
  document.getElementById('stat-wind').textContent = 'Wind ' + Math.round(w.wind) + ' km/h';

  renderHourlyForecast(w.temperature);
  if (state.location?.lat != null && state.location?.lon != null) {
    initOrUpdateMap(state.location.lat, state.location.lon);
  }

  const alertBanner = document.getElementById('alert-banner');
  if (w.uv >= 8) {
    document.getElementById('alert-text').textContent = 'Heat/UV advisory — UV Index is very high today.';
    alertBanner.style.display = 'flex';
  } else {
    alertBanner.style.display = 'none';
  }
}
document.getElementById('dismiss-alert').addEventListener('click', () => {
  document.getElementById('alert-banner').style.display = 'none';
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

document.getElementById('mode-upcoming').addEventListener('click', () => setForecastMode('upcoming'));
document.getElementById('mode-past').addEventListener('click', () => setForecastMode('past'));
function setForecastMode(mode) {
  state.forecastMode = mode;
  document.getElementById('mode-upcoming').classList.toggle('active', mode === 'upcoming');
  document.getElementById('mode-past').classList.toggle('active', mode === 'past');
  document.getElementById('view-upcoming').style.display = mode === 'upcoming' ? 'block' : 'none';
  document.getElementById('view-past').style.display = mode === 'past' ? 'block' : 'none';
  if (mode === 'past') loadHistory();
}

async function loadHistory() {
  const { lat, lon } = state.location;
  try {
    const data = await apiGet(`/api/history?lat=${lat}&lon=${lon}&range=${state.historyRange}`);
    renderHistory(data);
  } catch (err) {
    document.getElementById('past-note').textContent = 'Could not load history.';
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

document.getElementById('range-week').addEventListener('click', () => setHistoryRange('week'));
document.getElementById('range-month').addEventListener('click', () => setHistoryRange('month'));
function setHistoryRange(range) {
  state.historyRange = range;
  document.getElementById('range-week').classList.toggle('active', range === 'week');
  document.getElementById('range-month').classList.toggle('active', range === 'month');
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

document.getElementById('edit-toggle').addEventListener('click', () => {
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

document.getElementById('am-add').addEventListener('click', () => {
  state.amSteps.push({ id: 'a' + Date.now(), name: '', done: false });
  renderRoutineAll();
});
document.getElementById('supp-add').addEventListener('click', () => {
  state.suppSteps.push({ id: 's' + Date.now(), name: '', done: false });
  renderRoutineAll();
});
document.getElementById('pm-add').addEventListener('click', () => {
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
    const { flags } = await apiPost('/api/routine-flags', {
      uv: state.weather.uv,
      humidity: state.weather.humidity,
      aqi: state.airQuality?.aqi,
      steps: allSteps.map((s) => ({ id: s.id, name: s.name })),
      profile: state.profile || {}
    });

    if (flags.length === 0) {
      homeFlagsEl.innerHTML = '<p class="muted-note">Your routine is balanced for today\'s climate.</p>';
    } else {
      homeFlagsEl.innerHTML = flags
        .map((f) => `<p><span class="flag-label">${escapeHtml(f.stepName)} —</span> ${escapeHtml(f.text)}</p>`)
        .join('');
    }
  } catch (err) {
    console.error('Routine flags failed:', err);
  }
}

// ---------- Check / AI Skin Diagnostics ----------
const sampleFaceSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='%23FDFBF7'/><circle cx='200' cy='190' r='100' fill='%23EAD8C3'/><ellipse cx='170' cy='175' rx='10' ry='6' fill='%235A4526'/><ellipse cx='230' cy='175' rx='10' ry='6' fill='%235A4526'/><path d='M195 190 L190 210 L205 210' stroke='%23C4A580' stroke-width='3' fill='none' stroke-linecap='round'/><path d='M175 240 Q200 258 225 240' stroke='%23B86E56' stroke-width='4' fill='none' stroke-linecap='round'/></svg>";

const zoneInsights = {
  tzone: 'T-Zone (Forehead & Nose): Sebum production is balanced (78%). Current climate humidity is well-regulated by your morning cleanser.',
  cheeks: 'Cheeks (U-Zone): Cellular hydration is strong (82%). Barrier lipid matrix intact; minimal redness observed.',
  eyes: 'Eye Contour: Delicate periorbital zone shows mild fatigue. Peptide eye cream and antioxidant protection recommended.',
  chin: 'Jaw & Chin: Clear pore structure (81%). No active inflammatory blemishes detected.'
};

function renderZoneInsight(zoneKey) {
  const textEl = document.getElementById('zone-insight-text');
  if (textEl && zoneInsights[zoneKey]) {
    textEl.textContent = zoneInsights[zoneKey];
  }
}

function runBiometricScan(imageUrl) {
  const zone = document.getElementById('upload-zone');
  const beam = document.getElementById('scan-hud-beam');
  const content = document.getElementById('upload-zone-content');
  const results = document.getElementById('diagnostic-results');
  const photoActions = document.getElementById('photo-actions');

  if (zone) {
    zone.style.backgroundImage = `url('${imageUrl || sampleFaceSvg}')`;
  }
  if (content) content.style.display = 'none';
  if (beam) beam.style.display = 'block';
  if (results) results.style.display = 'none';

  setTimeout(() => {
    if (beam) beam.style.display = 'none';
    if (photoActions) photoActions.style.display = 'flex';
    if (results) {
      results.style.display = 'block';
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Dynamic diagnostic scores calibrated to user weather + profile
    const w = state.weather || {};
    const hum = w.humidity ?? 65;
    const uv = w.uv ?? 8;
    const hydVal = Math.min(94, Math.max(65, Math.round(hum * 0.9 + 20)));
    const redVal = Math.max(12, Math.min(38, Math.round(uv * 2.5 + 5)));
    const poreVal = 79;
    const uvShieldVal = Math.min(95, 88 + (state.amSteps.some(s => s.name.toLowerCase().includes('sunscreen') && s.done) ? 7 : 0));
    const overallScore = Math.round((hydVal + (100 - redVal) + poreVal + uvShieldVal) / 4);

    const scoreEl = document.getElementById('diag-score');
    if (scoreEl) scoreEl.innerHTML = `${overallScore} <span class="diag-max">/ 100</span>`;

    const hydEl = document.getElementById('metric-hyd');
    const hydBar = document.getElementById('metric-hyd-bar');
    if (hydEl && hydBar) {
      hydEl.textContent = `${hydVal}%`;
      hydBar.style.width = `${hydVal}%`;
    }

    const redEl = document.getElementById('metric-red');
    const redBar = document.getElementById('metric-red-bar');
    if (redEl && redBar) {
      redEl.textContent = `${redVal}% (${redVal < 25 ? 'Low' : 'Moderate'})`;
      redBar.style.width = `${redVal}%`;
    }

    const poreEl = document.getElementById('metric-pore');
    const poreBar = document.getElementById('metric-pore-bar');
    if (poreEl && poreBar) {
      poreEl.textContent = `${poreVal}%`;
      poreBar.style.width = `${poreVal}%`;
    }

    const uvEl = document.getElementById('metric-uv');
    const uvBar = document.getElementById('metric-uv-bar');
    if (uvEl && uvBar) {
      uvEl.textContent = `${uvShieldVal}% (Optimal)`;
      uvBar.style.width = `${uvShieldVal}%`;
    }

    // Save snapshot in history
    state.checkPhoto = imageUrl || sampleFaceSvg;
    saveJSON('sw_check_photo', state.checkPhoto);
    renderPastWeekComparison();
  }, 1400);
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
  if (!video || !canvas) return;

  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Mirror selfie capture if user-facing
  if (currentFacingMode === 'user') {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  stopLiveCamera();
  runBiometricScan(dataUrl);
}

// Live Camera UI Event Listeners
const startLiveCamBtn = document.getElementById('start-live-cam-btn');
if (startLiveCamBtn) {
  startLiveCamBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startLiveCamera();
  });
}

const retakeLiveBtn = document.getElementById('retake-live-btn');
if (retakeLiveBtn) {
  retakeLiveBtn.addEventListener('click', () => {
    startLiveCamera();
  });
}

const closeCamBtn = document.getElementById('close-cam-btn');
if (closeCamBtn) {
  closeCamBtn.addEventListener('click', () => {
    stopLiveCamera();
  });
}

const captureSnapBtn = document.getElementById('capture-snap-btn');
if (captureSnapBtn) {
  captureSnapBtn.addEventListener('click', () => {
    captureLiveSnapshot();
  });
}

const flipCamBtn = document.getElementById('flip-cam-btn');
if (flipCamBtn) {
  flipCamBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    const video = document.getElementById('camera-feed');
    if (video) {
      video.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';
    }
    startLiveCamera();
  });
}

const openGalleryBtn = document.getElementById('open-gallery-btn');
const photoInput = document.getElementById('photo-input');
if (openGalleryBtn && photoInput) {
  openGalleryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    photoInput.click();
  });
}

// Upload & Demo Buttons
const demoScanBtn = document.getElementById('demo-scan-btn');
if (demoScanBtn) {
  demoScanBtn.addEventListener('click', () => {
    stopLiveCamera();
    runBiometricScan(sampleFaceSvg);
  });
}

const uploadZone = document.getElementById('upload-zone');
if (uploadZone && photoInput) {
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      runBiometricScan(ev.target.result);
    };
    reader.readAsDataURL(file);
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

// Zone Selector Pills
document.querySelectorAll('#zone-pills .zone-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#zone-pills .zone-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderZoneInsight(btn.dataset.zone);
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

document.getElementById('photo-btn').addEventListener('click', () => document.getElementById('avatar-input').click());
document.getElementById('avatar-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const avatar = document.getElementById('avatar');
    avatar.style.backgroundImage = `url(${ev.target.result})`;
    avatar.innerHTML = '';
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

// ---------- Auth UI Event Listeners ----------
const sendOtpBtn = document.getElementById('auth-send-otp-btn');
const phoneInput = document.getElementById('auth-phone-input');
const countrySelect = document.getElementById('auth-country-code');

if (sendOtpBtn && phoneInput && countrySelect) {
  sendOtpBtn.addEventListener('click', () => {
    const fullPhone = `${countrySelect.value} ${phoneInput.value.trim()}`;
    requestPhoneOtp(fullPhone);
  });

  phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const fullPhone = `${countrySelect.value} ${phoneInput.value.trim()}`;
      requestPhoneOtp(fullPhone);
    }
  });
}

// 1-Tap Quick Demo Login
const demoLoginBtn = document.getElementById('auth-demo-login-btn');
if (demoLoginBtn) {
  demoLoginBtn.addEventListener('click', () => {
    state.authUser = {
      phone: '+91 98765 43210',
      name: state.profile?.name || 'Balaji',
      verified: true,
      authenticatedAt: new Date().toISOString()
    };
    saveJSON('sw_auth_user', state.authUser);
    checkAuthState();
  });
}

// Change Phone Link
const changePhoneBtn = document.getElementById('auth-change-phone-btn');
if (changePhoneBtn) {
  changePhoneBtn.addEventListener('click', () => {
    resetAuthScreen();
  });
}

// Resend OTP Link
const resendBtn = document.getElementById('auth-resend-btn');
if (resendBtn) {
  resendBtn.addEventListener('click', () => {
    requestPhoneOtp(currentPendingPhone || '+91 98765 43210');
  });
}

// OTP Input Auto-Advancing
const otpBoxes = [
  document.getElementById('otp-1'),
  document.getElementById('otp-2'),
  document.getElementById('otp-3'),
  document.getElementById('otp-4')
].filter(Boolean);

otpBoxes.forEach((box, index) => {
  box.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val && index < otpBoxes.length - 1) {
      otpBoxes[index + 1].focus();
    }
    // Check if all 4 boxes are filled
    const fullCode = otpBoxes.map(b => b.value).join('');
    if (fullCode.length === 4) {
      submitOtpVerification(fullCode);
    }
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && index > 0) {
      otpBoxes[index - 1].focus();
    }
  });
});

// Verify Button
const verifyOtpBtn = document.getElementById('auth-verify-btn');
if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener('click', () => {
    const code = otpBoxes.map(b => b.value).join('');
    submitOtpVerification(code);
  });
}

// SMS Notification Toast Click to Autofill
const smsToast = document.getElementById('sms-toast');
if (smsToast) {
  smsToast.addEventListener('click', () => {
    const codeChars = (currentGeneratedOtp || '1234').split('');
    otpBoxes.forEach((box, i) => {
      if (box && codeChars[i]) box.value = codeChars[i];
    });
    submitOtpVerification(currentGeneratedOtp || '1234');
  });
}

// ---------- Init ----------
renderHome();
checkAuthState();
updateDateTime();
setInterval(updateDateTime, 30000);
renderProfile();
renderRoutineAll();
loadWeatherAndAQI();
loadForecast();

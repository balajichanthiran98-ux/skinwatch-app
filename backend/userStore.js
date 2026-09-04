// SkinWatch Isolated Per-User Database Architecture
// Each registered user has their own dedicated database file in /data/users/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const AUTH_REGISTRY_FILE = path.join(DATA_DIR, 'auth_registry.json');

// Ensure database directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

// Helper to hash password with salt
function hashPassword(password, salt) {
  const userSalt = salt || 'skinwatch_secure_salt_2026';
  return crypto.createHash('sha256').update(String(password).trim() + userSalt).digest('hex');
}

// Normalize phone / username
function normalizePhone(phone) {
  return String(phone || '').replace(/[\s\-\(\)]/g, '').trim();
}

// Safe file name for user database
function getUserDbFilename(phone) {
  const safe = normalizePhone(phone).replace(/[^a-zA-Z0-9_+]/g, '_');
  return path.join(USERS_DIR, `user_${safe}.json`);
}

// Default initial pre-seeded profiles
const INITIAL_PROFILES = [
  {
    phone: "+919876543210",
    displayPhone: "+91 98765 43210",
    password: "password123",
    name: "Balaji",
    city: "Trichy, Tamil Nadu",
    location: { name: "Trichy, Tamil Nadu", lat: 10.7905, lon: 78.7047 },
    skinType: "III",
    skinTypeName: "Type III (Medium / Olive)",
    skinFeel: "Combination / TEWL Prone",
    concerns: ["UV Barrier Defense", "Sebum Balance", "Pigmentation"],
    tolerances: ["Vitamin C", "Niacinamide", "Centella Asiatica"],
    allergies: ["Fragrance", "Essential Oils"],
    amSteps: [
      { id: "a1", name: "Gentle Foaming Cleanser", done: true },
      { id: "a2", name: "15% Vitamin C Antioxidant Serum", done: true },
      { id: "a3", name: "Ceramide Barrier Hydration Cream", done: false },
      { id: "a4", name: "SPF 50+ PA++++ Fluid Sunscreen", done: false }
    ],
    suppSteps: [
      { id: "s1", name: "Omega-3 Fatty Acids (1000mg)", done: true },
      { id: "s2", name: "Zinc & Copper Skin Defense", done: false }
    ],
    pmSteps: [
      { id: "p1", name: "Double Cleanse Oil & Foam", done: false },
      { id: "p2", name: "0.3% Retinol Night Serum", done: false },
      { id: "p3", name: "Centella Soothing Recovery Cream", done: false }
    ],
    waterGlasses: 5,
    waterTarget: 8,
    skinCyclePhase: 2,
    checkPhoto: null,
    scanHistory: [],
    createdAt: "2026-08-20T00:00:00.000Z",
    lastLoginAt: new Date().toISOString()
  },
  {
    phone: "+919123456789",
    displayPhone: "+91 91234 56789",
    password: "password123",
    name: "Priya",
    city: "Paris, France",
    location: { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
    skinType: "II",
    skinTypeName: "Type II (Fair / Sensitive)",
    skinFeel: "Dry / Sensitive",
    concerns: ["Deep Hydration", "Erythema Calming", "Anti-Pollution"],
    tolerances: ["Hyaluronic Acid", "Squalane", "Panthenol"],
    allergies: ["AHA Glycolic", "Salicylic Acid"],
    amSteps: [
      { id: "a1", name: "Milky Hydrating Cleanser", done: true },
      { id: "a2", name: "Hyaluronic Acid Multi-Weight Essence", done: true },
      { id: "a3", name: "Squalane Moisture Shield", done: true },
      { id: "a4", name: "Mineral SPF 50 Sensitive Sunscreen", done: true }
    ],
    suppSteps: [
      { id: "s1", name: "Marine Collagen Peptides", done: true }
    ],
    pmSteps: [
      { id: "p1", name: "Gentle Micellar Water Rinse", done: false },
      { id: "p2", name: "Peptide Repair Ampoule", done: false },
      { id: "p3", name: "Rich Ceramide Overnight Balm", done: false }
    ],
    waterGlasses: 7,
    waterTarget: 8,
    skinCyclePhase: 3,
    checkPhoto: null,
    scanHistory: [],
    createdAt: "2026-08-20T00:00:00.000Z",
    lastLoginAt: new Date().toISOString()
  }
];

class UserStore {
  constructor() {
    this.authRegistry = {};
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(AUTH_REGISTRY_FILE)) {
        const raw = fs.readFileSync(AUTH_REGISTRY_FILE, 'utf8');
        this.authRegistry = JSON.parse(raw);
      } else {
        this.authRegistry = {};
      }

      // Seed initial demo users if not present
      INITIAL_PROFILES.forEach(profile => {
        const norm = normalizePhone(profile.phone);
        const userDbFile = getUserDbFilename(norm);

        if (!this.authRegistry[norm] || !fs.existsSync(userDbFile)) {
          const salt = 'salt_' + norm;
          const passwordHash = hashPassword(profile.password, salt);

          this.authRegistry[norm] = {
            phone: profile.phone,
            normalizedPhone: norm,
            passwordHash,
            salt,
            name: profile.name,
            city: profile.city,
            skinType: profile.skinType,
            dbFile: path.basename(userDbFile),
            createdAt: profile.createdAt,
            lastLoginAt: profile.lastLoginAt
          };

          // Write isolated user database file
          const userCopy = { ...profile };
          delete userCopy.password;
          fs.writeFileSync(userDbFile, JSON.stringify(userCopy, null, 2), 'utf8');
        }
      });

      this.saveRegistry();
    } catch (err) {
      console.error('Error initializing UserStore:', err);
    }
  }

  saveRegistry() {
    try {
      fs.writeFileSync(AUTH_REGISTRY_FILE, JSON.stringify(this.authRegistry, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving auth registry:', err);
    }
  }

  // Load a user's isolated database file
  loadUserDb(phone) {
    const norm = normalizePhone(phone);
    const registryEntry = this.findRegistryEntry(norm);
    if (!registryEntry) return null;

    const userDbFile = getUserDbFilename(norm);
    if (fs.existsSync(userDbFile)) {
      try {
        const raw = fs.readFileSync(userDbFile, 'utf8');
        return JSON.parse(raw);
      } catch (err) {
        console.error(`Error reading isolated DB for ${norm}:`, err);
      }
    }
    return null;
  }

  // Save changes strictly to that user's isolated database file
  saveUserDb(phone, userData) {
    const norm = normalizePhone(phone);
    const userDbFile = getUserDbFilename(norm);
    try {
      fs.writeFileSync(userDbFile, JSON.stringify(userData, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error(`Error writing isolated DB for ${norm}:`, err);
      return false;
    }
  }

  findRegistryEntry(phone) {
    const norm = normalizePhone(phone);
    for (const key in this.authRegistry) {
      if (key === norm || key.endsWith(norm) || norm.endsWith(key)) {
        return this.authRegistry[key];
      }
    }
    return null;
  }

  findByPhone(phone) {
    return this.loadUserDb(phone);
  }

  // Authenticate user against auth registry and load their dedicated database
  authenticate(phone, password) {
    const norm = normalizePhone(phone);
    const entry = this.findRegistryEntry(norm);
    if (!entry) {
      return { success: false, error: 'No account found with this phone/username. Please sign up.' };
    }

    const testHash = hashPassword(password, entry.salt);
    if (entry.passwordHash !== testHash) {
      return { success: false, error: 'Incorrect password. Please verify and try again.' };
    }

    entry.lastLoginAt = new Date().toISOString();
    this.saveRegistry();

    const user = this.loadUserDb(entry.normalizedPhone);
    if (!user) {
      return { success: false, error: 'User database partition could not be loaded.' };
    }

    user.lastLoginAt = entry.lastLoginAt;
    this.saveUserDb(entry.normalizedPhone, user);

    // Generate session token
    const sessionToken = crypto.createHash('sha256').update(norm + entry.lastLoginAt).digest('hex');

    return {
      success: true,
      token: sessionToken,
      user: this.sanitizeUser(user),
      databasePartition: path.basename(getUserDbFilename(norm))
    };
  }

  // Register a new user and create their own dedicated database
  register(userData) {
    const rawPhone = String(userData.phone || '').trim();
    const norm = normalizePhone(rawPhone);

    if (!norm || norm.length < 6) {
      return { success: false, error: 'Please enter a valid phone number or username (at least 6 characters).' };
    }

    if (!userData.password || userData.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    const fullPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone}`;
    const userDbFile = getUserDbFilename(norm);

    // If user already exists, update credentials and log in seamlessly
    const existing = this.findRegistryEntry(norm);
    if (existing) {
      existing.salt = 'salt_' + norm + '_' + Date.now();
      existing.passwordHash = hashPassword(userData.password, existing.salt);
      if (userData.name) existing.name = userData.name;
      if (userData.city) existing.city = userData.city;
      if (userData.skinType) existing.skinType = userData.skinType;
      existing.lastLoginAt = new Date().toISOString();
      this.saveRegistry();

      let user = this.loadUserDb(existing.normalizedPhone);
      if (!user) {
        user = {
          phone: fullPhone,
          displayPhone: rawPhone,
          name: userData.name || existing.name || 'User',
          city: userData.city || existing.city || 'Trichy, Tamil Nadu',
          location: userData.location || { name: userData.city || 'Trichy, Tamil Nadu', lat: 10.7905, lon: 78.7047 },
          skinType: userData.skinType || 'III',
          skinTypeName: userData.skinTypeName || 'Type III (Medium / Olive)',
          skinFeel: 'Normal / Balanced',
          concerns: ['Daily UV Protection', 'Moisture Retention'],
          tolerances: ['Hyaluronic Acid', 'Niacinamide'],
          allergies: [],
          amSteps: [
            { id: 'a1', name: 'Hydrating Cleanser', done: false },
            { id: 'a2', name: 'Antioxidant Day Serum', done: false },
            { id: 'a3', name: 'Barrier Moisturizer', done: false },
            { id: 'a4', name: 'SPF 50+ Sunscreen', done: false }
          ],
          suppSteps: [{ id: 's1', name: 'Omega-3 Fatty Acids', done: false }],
          pmSteps: [
            { id: 'p1', name: 'Gentle Evening Cleanser', done: false },
            { id: 'p2', name: 'Night Repair Serum', done: false },
            { id: 'p3', name: 'Nourishing Ceramide Cream', done: false }
          ],
          waterGlasses: 4,
          waterTarget: 8,
          skinCyclePhase: 1,
          checkPhoto: null,
          scanHistory: [],
          createdAt: existing.createdAt || new Date().toISOString(),
          lastLoginAt: existing.lastLoginAt
        };
      } else {
        if (userData.name) user.name = userData.name;
        if (userData.city) user.city = userData.city;
        if (userData.skinType) user.skinType = userData.skinType;
        user.lastLoginAt = existing.lastLoginAt;
      }

      this.saveUserDb(existing.normalizedPhone, user);
      const sessionToken = crypto.createHash('sha256').update(norm + existing.lastLoginAt).digest('hex');

      return {
        success: true,
        token: sessionToken,
        user: this.sanitizeUser(user),
        databasePartition: path.basename(userDbFile)
      };
    }

    const salt = 'salt_' + norm + '_' + Date.now();
    const passwordHash = hashPassword(userData.password, salt);

    const newUser = {
      phone: fullPhone,
      displayPhone: rawPhone,
      name: userData.name || 'User',
      city: userData.city || 'Trichy, Tamil Nadu',
      location: userData.location || { name: userData.city || 'Trichy, Tamil Nadu', lat: 10.7905, lon: 78.7047 },
      skinType: userData.skinType || 'III',
      skinTypeName: userData.skinTypeName || 'Type III (Medium / Olive)',
      skinFeel: userData.skinFeel || 'Normal / Balanced',
      concerns: userData.concerns || ['Daily UV Protection', 'Moisture Retention'],
      tolerances: userData.tolerances || ['Hyaluronic Acid', 'Niacinamide'],
      allergies: userData.allergies || [],
      amSteps: [
        { id: 'a1', name: 'Hydrating Cleanser', done: false },
        { id: 'a2', name: 'Antioxidant Day Serum', done: false },
        { id: 'a3', name: 'Barrier Moisturizer', done: false },
        { id: 'a4', name: 'SPF 50+ Sunscreen', done: false }
      ],
      suppSteps: [
        { id: 's1', name: 'Omega-3 Fatty Acids', done: false }
      ],
      pmSteps: [
        { id: 'p1', name: 'Gentle Evening Cleanser', done: false },
        { id: 'p2', name: 'Night Repair Serum', done: false },
        { id: 'p3', name: 'Nourishing Ceramide Cream', done: false }
      ],
      waterGlasses: 0,
      waterTarget: 8,
      skinCyclePhase: 1,
      checkPhoto: null,
      scanHistory: [],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    // 1. Create the dedicated user database file
    this.saveUserDb(norm, newUser);

    // 2. Add to central auth registry
    this.authRegistry[norm] = {
      phone: fullPhone,
      normalizedPhone: norm,
      passwordHash,
      salt,
      name: newUser.name,
      city: newUser.city,
      skinType: newUser.skinType,
      dbFile: path.basename(userDbFile),
      createdAt: newUser.createdAt,
      lastLoginAt: newUser.lastLoginAt
    };
    this.saveRegistry();

    const sessionToken = crypto.createHash('sha256').update(norm + newUser.lastLoginAt).digest('hex');

    return {
      success: true,
      token: sessionToken,
      user: this.sanitizeUser(newUser),
      databasePartition: path.basename(userDbFile)
    };
  }

  // Update user data in their isolated database
  updateUserData(phone, data) {
    const user = this.loadUserDb(phone);
    if (!user) return { success: false, error: 'User not found' };

    if (data.name) user.name = data.name;
    if (data.city) user.city = data.city;
    if (data.location) user.location = data.location;
    if (data.skinType) user.skinType = data.skinType;
    if (data.skinTypeName) user.skinTypeName = data.skinTypeName;
    if (data.skinFeel) user.skinFeel = data.skinFeel;
    if (data.concerns) user.concerns = data.concerns;
    if (data.tolerances) user.tolerances = data.tolerances;
    if (data.allergies) user.allergies = data.allergies;
    if (data.amSteps) user.amSteps = data.amSteps;
    if (data.suppSteps) user.suppSteps = data.suppSteps;
    if (data.pmSteps) user.pmSteps = data.pmSteps;
    if (data.facialExercises) user.facialExercises = data.facialExercises;
    if (data.waterGlasses != null) user.waterGlasses = data.waterGlasses;
    if (data.waterTarget != null) user.waterTarget = data.waterTarget;
    if (data.skinCyclePhase != null) user.skinCyclePhase = data.skinCyclePhase;
    if (data.checkPhoto !== undefined) user.checkPhoto = data.checkPhoto;
    if (data.scanHistory) {
      if (typeof data.scanHistory === 'object' && !Array.isArray(data.scanHistory)) {
        const existing = (typeof user.scanHistory === 'object' && !Array.isArray(user.scanHistory)) ? user.scanHistory : {};
        user.scanHistory = { ...existing, ...data.scanHistory };
      } else if (Array.isArray(data.scanHistory) && data.scanHistory.length > 0) {
        user.scanHistory = data.scanHistory;
      }
    }
    if (data.akvileSchoolProgress) user.akvileSchoolProgress = data.akvileSchoolProgress;

    this.saveUserDb(phone, user);

    // Sync registry overview if name or city changed
    const norm = normalizePhone(phone);
    if (this.authRegistry[norm]) {
      if (data.name) this.authRegistry[norm].name = data.name;
      if (data.city) this.authRegistry[norm].city = data.city;
      if (data.skinType) this.authRegistry[norm].skinType = data.skinType;
      this.saveRegistry();
    }

    return { success: true, user: this.sanitizeUser(user) };
  }

  sanitizeUser(user) {
    const clone = { ...user };
    delete clone.passwordHash;
    delete clone.password;
    delete clone.salt;
    return clone;
  }

  getDemoAccounts() {
    return Object.values(this.authRegistry).map(u => ({
      phone: u.phone,
      name: u.name,
      city: u.city,
      skinType: u.skinType,
      dbFile: u.dbFile
    }));
  }
}

module.exports = new UserStore();

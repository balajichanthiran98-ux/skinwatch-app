// SkinWatch Persistent User Database Store
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'users_db.json');

// Helper to hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password).trim()).digest('hex');
}

// Normalize phone number (removes spaces, dashes, parentheses)
function normalizePhone(phone) {
  return String(phone || '').replace(/[\s\-\(\)]/g, '').trim();
}

// Default initial pre-seeded users
const INITIAL_USERS = {
  "+919876543210": {
    phone: "+919876543210",
    displayPhone: "+91 98765 43210",
    passwordHash: hashPassword("password123"),
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
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  "+919123456789": {
    phone: "+919123456789",
    displayPhone: "+91 91234 56789",
    passwordHash: hashPassword("password123"),
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
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
};

class UserStore {
  constructor() {
    this.users = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.users = JSON.parse(raw);
      } else {
        this.users = { ...INITIAL_USERS };
        this.save();
      }
    } catch (err) {
      console.error('Error loading users DB:', err);
      this.users = { ...INITIAL_USERS };
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.users, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving users DB:', err);
    }
  }

  findByPhone(phone) {
    const norm = normalizePhone(phone);
    for (const key in this.users) {
      if (normalizePhone(key) === norm || normalizePhone(key).endsWith(norm) || norm.endsWith(normalizePhone(key))) {
        return this.users[key];
      }
    }
    return null;
  }

  authenticate(phone, password) {
    const user = this.findByPhone(phone);
    if (!user) {
      return { success: false, error: 'No account found with this phone number. Please sign up.' };
    }
    const hash = hashPassword(password);
    if (user.passwordHash !== hash) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
    user.lastLoginAt = new Date().toISOString();
    this.save();
    return { success: true, user: this.sanitizeUser(user) };
  }

  register(userData) {
    const normPhone = normalizePhone(userData.phone);
    if (!normPhone || normPhone.length < 7) {
      return { success: false, error: 'Please enter a valid phone number.' };
    }
    if (this.findByPhone(normPhone)) {
      return { success: false, error: 'An account with this phone number already exists. Please sign in.' };
    }
    if (!userData.password || userData.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }

    const fullPhone = userData.phone.startsWith('+') ? userData.phone : `+91${userData.phone}`;
    const newUser = {
      phone: fullPhone,
      displayPhone: userData.phone,
      passwordHash: hashPassword(userData.password),
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
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.users[fullPhone] = newUser;
    this.save();
    return { success: true, user: this.sanitizeUser(newUser) };
  }

  updateUserData(phone, data) {
    const user = this.findByPhone(phone);
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
    if (data.waterGlasses != null) user.waterGlasses = data.waterGlasses;
    if (data.waterTarget != null) user.waterTarget = data.waterTarget;
    if (data.skinCyclePhase != null) user.skinCyclePhase = data.skinCyclePhase;
    if (data.checkPhoto !== undefined) user.checkPhoto = data.checkPhoto;

    this.save();
    return { success: true, user: this.sanitizeUser(user) };
  }

  sanitizeUser(user) {
    const clone = { ...user };
    delete clone.passwordHash;
    return clone;
  }

  getDemoAccounts() {
    return Object.values(this.users).map(u => ({
      phone: u.displayPhone || u.phone,
      name: u.name,
      city: u.city,
      skinType: u.skinType
    }));
  }
}

module.exports = new UserStore();

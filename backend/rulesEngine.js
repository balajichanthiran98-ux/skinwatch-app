// SkinWatch rules engine
// Implements the logic documented in skinwatch-rules-engine-spec.md
// Each function notes its evidence level in a comment — see the spec for full detail.

// [STANDARD] WHO/EPA Global Solar UV Index scale.
function uvAdvice(uv) {
  if (uv >= 8) {
    return {
      level: 'high',
      text: 'SPF 50+, reapply every 2 hours, avoid direct sun 11am-3pm.'
    };
  }
  if (uv >= 6) {
    return {
      level: 'medium',
      text: 'SPF 30-50, seek shade during midday hours.'
    };
  }
  if (uv >= 3) {
    return {
      level: 'low',
      text: 'SPF 30, reapply every 3 hours if outdoors for long periods.'
    };
  }
  return { level: 'none', text: 'Minimal UV today, standard protection is enough.' };
}

// [DIRECTIONALLY SUPPORTED] Direction (low humidity -> richer moisturizer,
// high humidity -> lighter formula) is dermatologist-confirmed. Exact
// percentage cutoffs below are an app design choice, not a cited clinical
// threshold. Have a dermatologist confirm these numbers before launch.
function humidityAdvice(humidityPct) {
  if (humidityPct < 30) {
    return {
      level: 'medium',
      text: 'Low humidity today. Consider a richer, ceramide-based moisturizer.'
    };
  }
  if (humidityPct > 70) {
    return {
      level: 'low',
      text: 'High humidity today. A lightweight, oil-free gel moisturizer may suit better.'
    };
  }
  return null;
}

// [DIRECTIONALLY SUPPORTED] PM2.5/pollution's link to oxidative skin stress
// is research-backed. The AQI > 100 cutoff below borrows the EPA's general
// public-health AQI category ("Unhealthy for Sensitive Groups") as a proxy —
// it is not itself a skin-specific validated threshold.
function aqiAdvice(aqi) {
  if (aqi > 100) {
    return {
      level: 'medium',
      text: 'Air quality is reduced today. Consider an antioxidant serum step and double-cleanse in the evening.'
    };
  }
  return null;
}

// [NEEDS DERM REVIEW] Retinoids are well documented to increase
// photosensitivity, but the specific "skip on UV 8+" trigger here is an app
// design choice, not a cited clinical guideline. Flag for dermatologist
// review before this ships as real advice — see the spec, Section 5.
function retinolFlag(uv) {
  if (uv >= 8) {
    return {
      level: 'high',
      text: 'Very high UV today. Consider setting retinol aside tonight, and always pair retinol use with daily sunscreen.'
    };
  }
  return null;
}

// Maps a free-text routine step name to a category, so flags can attach to
// whatever the user actually typed (e.g. "Sunblock" still matches sunscreen).
function categorize(stepName) {
  const n = stepName.toLowerCase();
  if (n.includes('sunscreen') || n.includes('spf') || n.includes('sunblock')) return 'sunscreen';
  if (n.includes('retinol') || n.includes('retinoid') || n.includes('tretinoin')) return 'retinol';
  if (n.includes('moistur') || n.includes('cream') || n.includes('lotion')) return 'moisturizer';
  if (n.includes('vitamin c') || n.includes('antioxidant') || n.includes('serum')) return 'antioxidant_serum';
  return 'other';
}

// Given the day's weather and the user's routine steps & profile, returns a flag for
// each step that needs attention today, dynamically blending climate + skin profile.
function computeRoutineFlags(steps, weather, profile = {}) {
  const { uv = 0, humidity = 50, aqi = 50 } = weather;
  const {
    phototype = 'Type III-IV',
    skinType = 'Normal',
    retinoidTolerance = 'Beginner',
    vitcTolerance = 'Pure C',
    concerns = [],
    lifestyles = []
  } = profile;

  return steps
    .map((step) => {
      const category = categorize(step.name);
      let level = 'low';
      let text = null;

      // 1. Sunscreen Flags (Climate UV + Fitzpatrick Phototype)
      if (category === 'sunscreen') {
        if (uv >= 8) {
          level = 'high';
          if (phototype === 'Type I-II') {
            text = `Type I–II (High Sunburn Risk) · Extreme UV (${uv}): Immediate sunburn risk. Use SPF 50+, reapply strictly every 2 hours, and seek shade 11 AM–3 PM.`;
          } else if (phototype === 'Type V-VI') {
            text = `Type V–VI (Melanin-Rich) · Extreme UV (${uv}): Strict broad-spectrum SPF 50+ needed to prevent deep pigmentation and melasma flare-ups.`;
          } else {
            text = `Extreme UV (${uv}) today: Broad-spectrum SPF 50+ required; reapply every 2 hours if outdoors.`;
          }
        } else if (uv >= 6) {
          level = 'medium';
          text = `High UV (${uv}) today: SPF 30–50 recommended with midday sun protection.`;
        } else if (uv >= 3) {
          level = 'low';
          text = `Moderate UV (${uv}): Daily broad-spectrum SPF 30 protects against premature photo-aging.`;
        }
      }

      // 2. Moisturizer Flags (Climate Humidity + Skin Type + AC Lifestyle)
      else if (category === 'moisturizer') {
        if (humidity > 70) {
          level = 'low';
          if (skinType === 'Oily' || concerns.includes('Acne')) {
            text = `Oily/Acne-Prone + High Humidity (${humidity}%): Switch to an oil-free, non-comedogenic gel moisturizer to prevent clogged pores.`;
          } else if (lifestyles.includes('AC Office')) {
            text = `High outdoor humidity (${humidity}%), but indoor AC dehydrates skin. Use a lightweight barrier lotion rather than heavy butter.`;
          } else {
            text = `High ambient humidity (${humidity}%): A lightweight, oil-free gel moisturizer will keep skin balanced without congestion.`;
          }
        } else if (humidity < 35) {
          level = 'medium';
          if (skinType === 'Dry' || concerns.includes('Dryness')) {
            text = `Dry Skin + Low Humidity (${humidity}%): Critical TEWL risk. Apply a rich ceramide-rich cream immediately over damp skin.`;
          } else {
            text = `Low atmospheric humidity (${humidity}%): Moisture evaporates quickly; consider a ceramide-based barrier seal.`;
          }
        }
      }

      // 3. Retinoid Flags (Climate UV + Retinoid Tolerance)
      else if (category === 'retinol') {
        if (uv >= 8) {
          level = 'high';
          if (retinoidTolerance === 'Beginner') {
            text = `Beginner Retinoid User · High UV (${uv}): Elevated risk of photosensitization. Skip retinol tonight or sandwich between barrier creams.`;
          } else {
            text = `Very high UV (${uv}) today: Photosensitivity increased. Ensure gentle nighttime hydration and strict SPF tomorrow.`;
          }
        }
      }

      // 4. Antioxidant Serums (AQI Pollution + Blue Light)
      else if (category === 'antioxidant_serum') {
        if (aqi > 90 || lifestyles.includes('Blue Light')) {
          level = 'medium';
          if (vitcTolerance === 'Gentle') {
            text = `Elevated AQI (${aqi}) / Screen exposure: Use a gentle antioxidant ester (or Niacinamide) to neutralize free radicals without irritation.`;
          } else {
            text = `Elevated oxidative stress today (AQI ${aqi} + blue light). Vitamin C serum provides crucial cellular defense.`;
          }
        }
      }

      if (!text) return null;
      return { stepId: step.id, stepName: step.name, level, text };
    })
    .filter(Boolean);
}

module.exports = {
  uvAdvice,
  humidityAdvice,
  aqiAdvice,
  retinolFlag,
  categorize,
  computeRoutineFlags
};

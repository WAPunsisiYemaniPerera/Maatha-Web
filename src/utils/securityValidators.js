import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Validates whether an email address adheres to proper RFC email format.
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(email).trim());
};

/**
 * Validates Sri Lankan National Identity Card (NIC) format:
 * - Old format: 9 numerical digits followed by 'V' or 'X' / 'v' or 'x' (e.g. 901234567V)
 * - New format: 12 numerical digits, generally starting with birth year (e.g. 199012345678)
 */
export const isValidNIC = (nic) => {
  if (!nic) return false;
  const cleanNIC = String(nic).trim().toUpperCase();
  const oldNicRegex = /^[0-9]{9}[VX]$/;
  const newNicRegex = /^(?:19|20)?[0-9]{12}$/;
  return oldNicRegex.test(cleanNIC) || newNicRegex.test(cleanNIC);
};

/**
 * Parses and returns metadata about a Sri Lankan NIC (Old vs New format, birth year).
 */
export const getNICDetails = (nic) => {
  if (!nic) return { isValid: false, message: 'හැඳුනුම්පත් අංකය ඇතුළත් කර නොමැත (NIC is required)' };
  const clean = String(nic).trim().toUpperCase();
  
  if (/^[0-9]{9}[VX]$/.test(clean)) {
    return {
      isValid: true,
      type: 'Old NIC',
      label: 'පැරණි හැඳුනුම්පත (Old NIC)',
      format: '9 Digits + V/X',
      cleanNIC: clean,
      birthYear: `19${clean.substring(0, 2)}`
    };
  }

  if (/^[0-9]{12}$/.test(clean)) {
    return {
      isValid: true,
      type: 'New NIC',
      label: 'නව හැඳුනුම්පත (New NIC)',
      format: '12 Digits',
      cleanNIC: clean,
      birthYear: clean.substring(0, 4)
    };
  }

  return {
    isValid: false,
    message: 'වලංගු ශ්‍රී ලාංකික හැඳුනුම්පත් අංකයක් නොවේ. (පැරණි NIC: 901234567V / නව NIC: 199012345678)'
  };
};

/**
 * Cleans phone number string (removes spaces, hyphens, and brackets)
 */
export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return String(phone).trim().replace(/[\s\-()]/g, '');
};

/**
 * Validates Sri Lankan Mobile phone numbers:
 * - 10 numerical digits starting with '07'
 * - Format: 07XXXXXXXX (e.g. 0712345678, 0771234567, 0701234567, 074..., 075..., 076..., 078..., 072...)
 * - Regex: ^07\d{8}$
 */
export const isValidMobileNumber = (phone) => {
  if (!phone) return false;
  const clean = cleanPhoneNumber(phone);
  return /^07\d{8}$/.test(clean);
};

/**
 * Validates Sri Lankan Fixed-Line / Landline phone numbers:
 * - TRCSL standard geographical area codes (011 - 091) + 7 digits subscriber number
 * - Total 10 numerical digits starting with geographical area code:
 *   011 (Colombo), 021 (Jaffna), 023 (Mannar), 024 (Vavuniya), 025 (Anuradhapura), 026 (Trincomalee), 027 (Polonnaruwa),
 *   031 (Negombo), 032 (Chilaw), 033 (Gampaha), 034 (Kalutara), 035 (Kegalle), 036 (Avissawella), 037 (Kurunegala),
 *   038 (Panadura), 041 (Matara), 045 (Ratnapura), 047 (Hambantota), 051 (Hatton), 052 (Nuwara Eliya), 054 (Nawalapitiya),
 *   055 (Badulla), 057 (Bandarawela), 063 (Ampara), 065 (Batticaloa), 066 (Matale), 067 (Kalmunai), 081 (Kandy), 091 (Galle)
 * - Regex: ^0(?:11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)\d{7}$
 */
export const isValidLandlineNumber = (phone) => {
  if (!phone) return false;
  const clean = cleanPhoneNumber(phone);
  return /^0(?:11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)\d{7}$/.test(clean);
};

/**
 * Validates any valid Sri Lankan Phone Number (either 10-digit Mobile '07XXXXXXXX' OR 10-digit Landline '0XXXXXXXXX')
 */
export const isValidSLPhone = (phone) => {
  return isValidMobileNumber(phone) || isValidLandlineNumber(phone);
};

/**
 * Sanitizes NIC input value on keystroke:
 * - Allows only numbers 0-9 and letters V, X, v, x
 * - Max length: 12 characters
 * - Converts to uppercase
 */
export const sanitizeNICInput = (val) => {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/[^0-9VX]/g, '')
    .slice(0, 12);
};

/**
 * Sanitizes Sri Lankan Phone number input on keystroke:
 * - Allows only numerical digits 0-9
 * - Max length: 10 digits
 */
export const sanitizePhoneInput = (val) => {
  if (!val) return '';
  return String(val)
    .replace(/[^0-9]/g, '')
    .slice(0, 10);
};



/**
 * Checks if an email is already in use across Firestore `users`, `moh_admins`, `hospital_admins`, or `midwives`.
 * Supports excludeId for edit operations.
 */
export const checkEmailUniqueness = async (db, email, excludeId = null) => {
  if (!email || !isValidEmail(email)) return false;
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    const collectionsToCheck = [
      { name: "users", field: "email" },
      { name: "moh_admins", field: "email" },
      { name: "hospital_admins", field: "email" },
      { name: "midwives", field: "email" }
    ];

    for (const col of collectionsToCheck) {
      const q = query(collection(db, col.name), where(col.field, "==", normalizedEmail));
      const querySnapshot = await getDocs(q);
      for (const doc of querySnapshot.docs) {
        if (!excludeId || doc.id !== excludeId) {
          return false; // Already taken
        }
      }
    }

    return true; // Unique
  } catch (error) {
    console.error("Email uniqueness check error:", error);
    return true; // Fallback to Firebase Auth's internal email uniqueness check
  }
};

/**
 * Checks if a National Identity Card (NIC) is already registered across:
 * - `moh_admins` (field `nic`)
 * - `hospital_admins` (field `adminNic`)
 * - `midwives` (field `nic`)
 * - `mothers` (field `nic`)
 * 
 * Supports excludeId for edit operations.
 */
export const checkNICUniqueness = async (db, nic, excludeId = null) => {
  if (!nic) return false;
  const normalizedNIC = String(nic).trim().toUpperCase();

  try {
    const checks = [
      { col: "moh_admins", field: "nic", role: "MOH Officer (සෞඛ්‍ය වෛද්‍ය නිලධාරී)" },
      { col: "hospital_admins", field: "adminNic", role: "Hospital Administrator (රෝහල් පාලක)" },
      { col: "midwives", field: "nic", role: "Public Health Midwife (පවුල් සෞඛ්‍ය නිලධාරිනී)" },
      { col: "mothers", field: "nic", role: "Registered Mother (ලියාපදිංචි මව)" }
    ];

    for (const check of checks) {
      const q = query(collection(db, check.col), where(check.field, "==", normalizedNIC));
      const snapshot = await getDocs(q);
      for (const doc of snapshot.docs) {
        if (!excludeId || doc.id !== excludeId) {
          return {
            isUnique: false,
            role: check.role,
            id: doc.id
          };
        }
      }
    }

    return { isUnique: true };
  } catch (error) {
    console.error("NIC uniqueness check error:", error);
    return { isUnique: true };
  }
};

/**
 * Evaluates password strength against stringent security guidelines:
 * - Minimum 8 characters
 * - Uppercase & Lowercase letters
 * - Numeric digits
 * - Special characters / symbols
 */
export const evaluatePasswordStrength = (password) => {
  if (!password) {
    return {
      score: 0,
      label: 'ඇතුළත් කර නොමැත (Empty)',
      color: 'bg-gray-200 text-gray-400',
      progressColor: 'bg-gray-200',
      percentage: 0,
      isValid: false,
      checks: {
        length: false,
        lowercase: false,
        uppercase: false,
        number: false,
        special: false
      },
      criteria: {
        hasMinLength: false,
        hasLowercase: false,
        hasUppercase: false,
        hasNumber: false,
        hasSpecial: false
      }
    };
  }

  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)
  };

  const criteria = {
    hasMinLength: checks.length,
    hasLowercase: checks.lowercase,
    hasUppercase: checks.uppercase,
    hasNumber: checks.number,
    hasSpecial: checks.special
  };

  const passedCount = Object.values(checks).filter(Boolean).length;

  let score = 0;
  let label = 'ඉතා දුර්වල (Very Weak)';
  let color = 'text-red-500';
  let progressColor = 'bg-red-500';

  if (checks.length && passedCount >= 5) {
    score = 4;
    label = 'ඉතා ශක්තිමත් (Very Strong)';
    color = 'text-emerald-600';
    progressColor = 'bg-emerald-500';
  } else if (checks.length && passedCount >= 4) {
    score = 3;
    label = 'ශක්තිමත් (Strong)';
    color = 'text-teal-600';
    progressColor = 'bg-teal-500';
  } else if (checks.length && passedCount >= 3) {
    score = 2;
    label = 'මධ්‍යස්ථ (Medium)';
    color = 'text-amber-500';
    progressColor = 'bg-amber-500';
  } else if (passedCount >= 2) {
    score = 1;
    label = 'දුර්වල (Weak)';
    color = 'text-orange-500';
    progressColor = 'bg-orange-500';
  }

  const percentage = Math.min((passedCount / 5) * 100, 100);
  const isValid = checks.length && passedCount >= 3; // Minimum acceptable threshold

  return {
    score,
    label,
    color,
    progressColor,
    percentage,
    isValid,
    checks,
    criteria
  };
};

/**
 * Translates Firebase Authentication error codes into professional Sinhala & English error descriptions.
 */
export const formatAuthError = (error) => {
  if (!error) return "නොදන්නා දෝෂයක් සිදු විය (Unknown error occurred)";
  
  const code = error.code || error.message || '';

  if (code.includes('auth/email-already-in-use')) {
    return "මෙම ඊමේල් ලිපිනය දැනටමත් වෙනත් ගිණුමක් සඳහා ලියාපදිංචි කර ඇත. කරුණාකර වෙනත් ඊමේල් ලිපිනයක් භාවිතා කරන්න. (This email is already registered to another account)";
  }
  if (code.includes('auth/weak-password')) {
    return "මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත. කරුණාකර අවම වශයෙන් අකුරු 8ක්, අංක සහ විශේෂ සංකේත යොදන්න. (Password is too weak. Please use at least 8 characters with letters, numbers and symbols)";
  }
  if (code.includes('auth/invalid-email')) {
    return "වලංගු නොවන ඊමේල් ලිපිනයකි. කරුණාකර නිවැරදි ඊමේල් ලිපිනයක් ඇතුළත් කරන්න. (Invalid email address format)";
  }
  if (code.includes('auth/network-request-failed')) {
    return "ජාල සම්බන්ධතාවයේ දෝෂයකි. ඔබගේ අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න. (Network connection failed. Please check your internet)";
  }
  if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
    return "ඊමේල් ලිපිනය හෝ මුරපදය වැරදියි. (Invalid email or password credentials)";
  }

  return `දෝෂයක් සිදු විය: ${error.message || code}`;
};

/**
 * Safely formats any date-like value (Date, ISO string, Firestore Timestamp {seconds, nanoseconds}) to a displayable string.
 */
export const formatDisplayDate = (val, fallback = '—') => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return new Date(val).toLocaleDateString();
  if (val instanceof Date) return val.toLocaleDateString();
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toLocaleDateString();
      } catch (e) {
        return fallback;
      }
    }
    if ('seconds' in val && typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toLocaleDateString();
    }
    if ('_seconds' in val && typeof val._seconds === 'number') {
      return new Date(val._seconds * 1000).toLocaleDateString();
    }
  }
  return String(val);
};

/**
 * Safely formats any value for direct rendering in React JSX to prevent "Objects are not valid as a React child" errors.
 */
export const safeRenderText = (val, fallback = '—') => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toLocaleDateString();
      } catch (e) {
        return fallback;
      }
    }
    if ('seconds' in val && typeof val.seconds === 'number') {
      return new Date(val.seconds * 1000).toLocaleDateString();
    }
    if ('_seconds' in val && typeof val._seconds === 'number') {
      return new Date(val._seconds * 1000).toLocaleDateString();
    }
    if (Array.isArray(val)) {
      return val.map(item => safeRenderText(item, '')).filter(Boolean).join(', ');
    }
    // Unknown object structure - return fallback to prevent React crash
    return fallback;
  }
  return String(val);
};

/**
 * Universal High-Risk Evaluator
 * Checks all possible field variations, boolean flags, Sinhala/English text and casing
 */
export const isHighRiskMother = (mother) => {
  if (!mother) return false;
  if (typeof mother !== 'object') {
    const s = String(mother).trim().toLowerCase();
    return s.includes('high') || s.includes('critical') || s.includes('alert') || s.includes('අධි');
  }

  // Check boolean flags
  if (mother.isHighRisk === true || mother.isHighRisk === 'true' || mother.isHighRisk === 1 || mother.isHighRisk === 'yes' || mother.isHighRisk === 'Yes') {
    return true;
  }
  if (mother.highRisk === true || mother.highRisk === 'true' || mother.highRisk === 1) {
    return true;
  }

  // Check all possible field names where risk might be stored
  const candidates = [
    mother.riskStatus,
    mother.risk,
    mother.riskLevel,
    mother.riskCategory,
    mother.risk_status,
    mother.risk_level,
    mother.status,
    mother.clinicalRisk
  ];

  for (const cand of candidates) {
    if (cand !== null && cand !== undefined && cand !== '') {
      const s = String(cand).trim().toLowerCase();
      if (
        s.includes('high') ||
        s.includes('critical') ||
        s.includes('alert') ||
        s.includes('severe') ||
        s.includes('අධි') ||
        s === 'high-risk' ||
        s === 'high risk' ||
        s === 'high'
      ) {
        return true;
      }
    }
  }

  // Also check if risk notes indicate high risk
  const notes = String(mother.notes || mother.riskNotes || mother.riskReason || '').toLowerCase();
  if (notes.includes('high risk') || notes.includes('high-risk') || notes.includes('අධි අවදානම්')) {
    return true;
  }

  return false;
};

/**
 * Normalizes risk status to standard 'High-Risk' or 'Normal'
 */
export const normalizeRiskStatus = (mother) => {
  if (isHighRiskMother(mother)) {
    return 'High-Risk';
  }
  const raw = String(mother?.riskStatus || mother?.risk || mother?.riskLevel || '').trim();
  if (raw && !raw.toLowerCase().includes('normal') && !raw.toLowerCase().includes('low') && raw !== '—' && raw !== '') {
    return raw;
  }
  return 'Normal';
};


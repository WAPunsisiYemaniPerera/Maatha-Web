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
 * - Old format: 9 digits followed by 'V' or 'X' (e.g. 851234567V)
 * - New format: 12 digits (e.g. 198512345678)
 */
export const isValidNIC = (nic) => {
  if (!nic) return false;
  const cleanNIC = String(nic).trim().toUpperCase();
  const oldNicRegex = /^[0-9]{9}[VX]$/;
  const newNicRegex = /^[0-9]{12}$/;
  return oldNicRegex.test(cleanNIC) || newNicRegex.test(cleanNIC);
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
    checks
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


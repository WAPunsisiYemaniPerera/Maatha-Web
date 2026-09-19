import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Validates whether an email address adheres to proper RFC email format.
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(String(email).trim());
};

/**
 * Checks if an email is already in use across Firestore `users` collection.
 */
export const checkEmailUniqueness = async (db, email) => {
  if (!email || !isValidEmail(email)) return false;
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty; // true if email is unique (not taken)
  } catch (error) {
    console.error("Email uniqueness check error:", error);
    return true; // Fallback to Firebase Auth's internal email uniqueness check
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

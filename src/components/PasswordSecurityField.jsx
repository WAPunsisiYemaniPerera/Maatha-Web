import React, { useState } from 'react';
import { evaluatePasswordStrength } from '../utils/securityValidators';

const PasswordSecurityField = ({
  value,
  onChange,
  name = 'password',
  placeholder = '••••••••',
  required = true,
  showRequirements = true,
  label = 'පද්ධති පිවිසුම් මුරපදය (Security Password)',
  sub = 'Encrypted & Salted with scrypt via Firebase Authentication'
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const strength = evaluatePasswordStrength(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700">
          {label} <span className="text-red-500">*</span>
        </label>
        {value && (
          <span className={`text-[11px] font-black uppercase ${strength.color}`}>
            {strength.label}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full p-3 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          tabIndex={-1}
        >
          {showPassword ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Strength Progress Bar */}
      {value && (
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full ${strength.progressColor} transition-all duration-300`}
            style={{ width: `${strength.percentage}%` }}
          ></div>
        </div>
      )}

      {/* Security Requirements Checklist */}
      {showRequirements && value && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] space-y-1 mt-2">
          <div className="font-bold text-gray-600 mb-1">මුරපද ආරක්ෂණ නිර්ණායක (Security Requirements):</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <span className={strength.checks.length ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-gray-400 flex items-center gap-1'}>
              {strength.checks.length ? '✓' : '○'} අවම අකුරු 8ක් (Min 8 characters)
            </span>
            <span className={strength.checks.uppercase ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-gray-400 flex items-center gap-1'}>
              {strength.checks.uppercase ? '✓' : '○'} ලොකු අකුරක් (Uppercase A-Z)
            </span>
            <span className={strength.checks.lowercase ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-gray-400 flex items-center gap-1'}>
              {strength.checks.lowercase ? '✓' : '○'} කුඩා අකුරක් (Lowercase a-z)
            </span>
            <span className={strength.checks.number ? 'text-emerald-700 font-bold flex items-center gap-1' : 'text-gray-400 flex items-center gap-1'}>
              {strength.checks.number ? '✓' : '○'} අංකයක් (Number 0-9)
            </span>
            <span className={strength.checks.special ? 'text-emerald-700 font-bold flex items-center gap-1 col-span-2' : 'text-gray-400 flex items-center gap-1 col-span-2'}>
              {strength.checks.special ? '✓' : '○'} විශේෂ සංකේතයක් (Symbol e.g. @, #, $, !)
            </span>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 font-medium">
        🔒 {sub}
      </p>
    </div>
  );
};

export default PasswordSecurityField;

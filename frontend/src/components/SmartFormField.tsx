'use client';

import { useRef, useState, useEffect } from 'react';
import { formatMoney, parseMoney, numberToVietnameseWords, getMoneyWordsKey } from '@/lib/format-utils';

// ====================== Extended field definition ======================
export type FieldDef = {
  key: string;
  label: string;
  type?: 'textarea' | 'date' | 'money' | 'money-words';
  textarea?: boolean; // legacy compat – treated as type: 'textarea'
  linkedTo?: string;  // for money-words: key of the money field it auto-fills from
  group?: 'cdt' | 'nt' | 'chung'; // grouping: chủ đầu tư, nhà thầu, or common
};

// ====================== DatePicker Component ======================
function DatePickerInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert dd/MM/yyyy display to yyyy-MM-dd for native input
  const toNativeDate = (display: string): string => {
    if (!display) return '';
    const m = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    // Try if already yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(display)) return display;
    return '';
  };

  // Convert yyyy-MM-dd native back to dd/MM/yyyy
  const toDisplay = (native: string): string => {
    if (!native) return '';
    const [y, m, d] = native.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <input
      ref={inputRef}
      type="date"
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
      value={toNativeDate(value)}
      onChange={e => onChange(toDisplay(e.target.value))}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}

// ====================== MoneyInput Component ======================
function MoneyInput({
  value,
  onChange,
  onMoneyChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  onMoneyChange?: (rawDigits: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseMoney(e.target.value);
    const formatted = formatMoney(raw);
    onChange(formatted);
    onMoneyChange?.(raw);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
      value={formatMoney(parseMoney(value))}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder || 'VD: 600.000'}
    />
  );
}

// ====================== SmartFormField Component ======================
/**
 * Renders the appropriate input control based on field type.
 * Handles: text, textarea, date (calendar picker), money (formatted), money-words (auto-generated).
 */
export function SmartFormField({
  field,
  value,
  onChange,
  disabled,
  isAutoFilled,
  formData,
  onFormDataChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (key: string, val: string) => void;
  disabled?: boolean;
  isAutoFilled?: boolean;
  formData?: Record<string, string>;
  onFormDataChange?: (data: Record<string, string>) => void;
}) {
  const effectiveType = field.type || (field.textarea ? 'textarea' : 'text');
  const autoPlaceholder = isAutoFilled ? '(Tự động điền)' : '';

  // Determine col-span
  const isWide = effectiveType === 'textarea';
  const handleMoneyChange = (rawDigits: string) => {
    // Also auto-fill the corresponding "bằng chữ" field
    const wordsKey = field.linkedTo || getMoneyWordsKey(field.key);
    if (wordsKey && formData && onFormDataChange) {
      const words = rawDigits ? numberToVietnameseWords(rawDigits) : '';
      onFormDataChange({ ...formData, [field.key]: formatMoney(rawDigits), [wordsKey]: words });
      return;
    }
  };

  // Auto-update money words value when the numerical field changes
  useEffect(() => {
    if (effectiveType === 'money-words' && formData && onFormDataChange) {
      const numericKey = field.linkedTo || field.key.replace('BangChu', 'BangSo');
      const numericVal = formData[numericKey] || '';
      const currentWords = formData[field.key] || '';
      const computedWords = numericVal ? numberToVietnameseWords(numericVal) : '';
      if (computedWords !== currentWords) {
        onFormDataChange({
          ...formData,
          [field.key]: computedWords,
        });
      }
    }
  }, [effectiveType, field.key, field.linkedTo, formData, onFormDataChange]);

  return (
    <div className={isWide ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {isAutoFilled && <span className="ml-1 text-xs text-blue-500 font-normal">(tự động)</span>}
        {effectiveType === 'money-words' && <span className="ml-1 text-xs text-green-500 font-normal">(tự động từ số)</span>}
      </label>

      {effectiveType === 'textarea' ? (
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-y min-h-[60px]"
          value={value || ''}
          onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled}
          placeholder={autoPlaceholder}
        />
      ) : effectiveType === 'date' ? (
        <DatePickerInput
          value={value || ''}
          onChange={val => onChange(field.key, val)}
          disabled={disabled}
          placeholder={autoPlaceholder}
        />
      ) : effectiveType === 'money' ? (
        <MoneyInput
          value={value || ''}
          onChange={val => onChange(field.key, val)}
          onMoneyChange={handleMoneyChange}
          disabled={disabled}
          placeholder={autoPlaceholder}
        />
      ) : effectiveType === 'money-words' ? (
        <input
          type="text"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 bg-green-50"
          value={value || ''}
          onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled}
          placeholder="Tự động tạo từ số..."
          readOnly
        />
      ) : (
        <input
          type="text"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
          value={value || ''}
          onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled}
          placeholder={autoPlaceholder}
        />
      )}
    </div>
  );
}

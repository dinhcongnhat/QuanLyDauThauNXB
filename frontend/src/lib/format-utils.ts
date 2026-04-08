/**
 * Shared utility functions for money formatting and Vietnamese number-to-words conversion.
 */

/** Format raw number string to Vietnamese money format: 600000 → 600.000 */
export function formatMoney(value: string): string {
  // Strip non-digit characters
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  // Insert dots every 3 digits from right
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Parse formatted money back to raw digits: 600.000 → 600000 */
export function parseMoney(formatted: string): string {
  return formatted.replace(/\./g, '');
}

// ====================== Vietnamese number-to-words ======================

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readGroup2(n: number): string {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens === 0) return DIGITS[ones];
  if (tens === 1) {
    if (ones === 0) return 'mười';
    if (ones === 5) return 'mười lăm';
    return 'mười ' + DIGITS[ones];
  }
  let result = DIGITS[tens] + ' mươi';
  if (ones === 0) return result;
  if (ones === 1) return result + ' mốt';
  if (ones === 4) return result + ' tư';
  if (ones === 5) return result + ' lăm';
  return result + ' ' + DIGITS[ones];
}

function readGroup3(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundreds === 0) {
    if (remainder === 0) return '';
    if (remainder < 10) return 'không trăm lẻ ' + DIGITS[remainder];
    return 'không trăm ' + readGroup2(remainder);
  }
  let result = DIGITS[hundreds] + ' trăm';
  if (remainder === 0) return result;
  if (remainder < 10) return result + ' lẻ ' + DIGITS[remainder];
  return result + ' ' + readGroup2(remainder);
}

const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

/**
 * Convert a number to Vietnamese words.
 * E.g. 600000 → "sáu trăm nghìn đồng"
 */
export function numberToVietnameseWords(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(parseMoney(num), 10) : num;
  if (isNaN(n) || n === 0) return 'không đồng';
  if (n < 0) return 'âm ' + numberToVietnameseWords(-n);

  // Split into groups of 3 from right
  const groups: number[] = [];
  let temp = n;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0 && groups.length > 1) continue;
    const text = i === groups.length - 1 ? readGroup3(g).replace(/^không trăm /, '') : readGroup3(g);
    if (!text) continue;
    const unit = UNITS[i] || '';
    parts.push(text + (unit ? ' ' + unit : ''));
  }

  const result = parts.join(' ').replace(/\s+/g, ' ').trim();
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}

/**
 * Check if a field key represents a money-number field.
 * Pattern: key contains "BangSo" or specific money suffixes.
 */
export function isMoneyField(key: string): boolean {
  return /BangSo|GiaTri(?:TruocThue|SauThue)|ThueGTGT\d|DuToanBangSo|ChiPhi\dBangSo|GiaTriThanhToan|SoDeNghi|SoDuTamUng|DonGiaHD/i.test(key);
}

/**
 * Get the corresponding "bằng chữ" key for a "bằng số" key.
 * Returns null if no pair exists.
 */
export function getMoneyWordsKey(bangSoKey: string): string | null {
  if (bangSoKey.includes('BangSo')) {
    return bangSoKey.replace('BangSo', 'BangChu');
  }
  return null;
}

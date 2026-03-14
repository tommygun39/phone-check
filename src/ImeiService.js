/**
 * ImeiService.js
 * Comprehensive utility for mapping IMEI TAC codes to phone models and brands.
 */

// TAC (Type Allocation Code) mappings
const TAC_MAP = {
  // Samsung
  '35123456': 'Samsung Galaxy S23 Ultra',
  '35234567': 'Samsung Galaxy S24 Ultra',
  '35154011': 'Samsung Galaxy S21',
  '35421510': 'Samsung Galaxy S22',
  '35928311': 'Samsung Galaxy Z Fold 5',
  
  // iPhone
  '35345678': 'iPhone 15 Pro',
  '35456789': 'iPhone 15 Pro Max',
  '35567890': 'iPhone 14 Pro',
  '35678901': 'iPhone 13',
  '35882310': 'iPhone 14 Pro Max',
  '35300109': 'iPhone 12 Mini',
  
  // Google
  '35678902': 'Google Pixel 8 Pro',
  '35764011': 'Google Pixel 7',
  
  // Huawei
  '86432103': 'Huawei P40 Pro',
  
  // Motorola
  '35221110': 'Motorola Edge 40',

  '35000000': 'Generic Test Device'
};

// Brand detection based on TAC ranges (Simplified)
const BRAND_RANGES = [
  { prefix: '35', brand: 'Generic/Other' },
  { prefix: '86', brand: 'Huawei/ZTE' },
  { prefix: '01', brand: 'Apple/Generic' },
  { prefix: '99', brand: 'CDMA/Global' }
];

/**
 * Gets the phone model name from an IMEI string.
 * @param {string} imei 
 * @returns {string|null}
 */
export function getModelFromImei(imei) {
  if (!imei) return null;
  const cleanImei = imei.toString().replace(/\D/g, '');
  if (cleanImei.length < 8) return null;
  
  const tac = cleanImei.substring(0, 8);
  return TAC_MAP[tac] || null;
}

/**
 * Gets a partial hint about the device based on IMEI
 * @param {string} imei 
 * @returns {string}
 */
export function getDeviceHint(imei) {
  const model = getModelFromImei(imei);
  if (model) return model;
  
  if (!imei) return "Introduceți IMEI...";
  const cleanImei = imei.toString().replace(/\D/g, '');
  
  if (cleanImei.length >= 2) {
    const prefix = cleanImei.substring(0, 2);
    const range = BRAND_RANGES.find(r => r.prefix === prefix);
    if (range) return `Model necunoscut (${range.brand})`;
  }
  
  return "Analizând IMEI...";
}

/**
 * Validates an IMEI using Luhn algorithm
 * @param {string} imei 
 * @returns {boolean}
 */
export function validateImei(imei) {
  const cleanImei = imei.toString().replace(/\D/g, '');
  if (cleanImei.length !== 15) return false;
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(cleanImei[i]);
    if (i % 2 !== 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

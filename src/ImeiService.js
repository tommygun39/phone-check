/**
 * ImeiService.js
 * Comprehensive utility for mapping IMEI TAC codes to phone models and brands.
 */

// TAC (Type Allocation Code) mappings
const TAC_MAP = {
  // Samsung S Series
  '35421510': 'Samsung Galaxy S22',
  '35521510': 'Samsung Galaxy S22+',
  '35621510': 'Samsung Galaxy S22 Ultra',
  '35123456': 'Samsung Galaxy S23 Ultra',
  '35154011': 'Samsung Galaxy S21',
  '35234567': 'Samsung Galaxy S24 Ultra',
  
  // Samsung Z Series
  '35928311': 'Samsung Galaxy Z Fold 5',
  '35828311': 'Samsung Galaxy Z Fold 4',
  '35728311': 'Samsung Galaxy Z Fold 3',
  '35918311': 'Samsung Galaxy Z Flip 5',
  
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

// Keyword based TAC selection (Priority)
const MODEL_TACS = [
  { keywords: ['s24 ultra'], tac: '35234567' },
  { keywords: ['s23 ultra'], tac: '35123456' },
  { keywords: ['s22 ultra'], tac: '35621510' },
  { keywords: ['s22+'], tac: '35521510' },
  { keywords: ['s22'], tac: '35421510' },
  { keywords: ['s21'], tac: '35154011' },
  { keywords: ['fold 5'], tac: '35928311' },
  { keywords: ['fold 4'], tac: '35828311' },
  { keywords: ['fold 3'], tac: '35728311' },
  { keywords: ['flip 5'], tac: '35918311' },
  { keywords: ['iphone 15 pro max'], tac: '35456789' },
  { keywords: ['iphone 15 pro'], tac: '35345678' },
  { keywords: ['iphone 14 pro max'], tac: '35882310' },
  { keywords: ['iphone 14 pro'], tac: '35567890' },
  { keywords: ['pixel 8 pro'], tac: '35678902' },
];

const BRAND_TACS = {
  'samsung': ['35123456', '35234567', '35154011', '35421510', '35928311'],
  'apple': ['35345678', '35456789', '35567890', '35678901', '35882310', '35300109'],
  'iphone': ['35345678', '35456789', '35567890', '35678901', '35882310', '35300109'],
  'google': ['35678902', '35764011'],
  'huawei': ['86432103'],
  'motorola': ['35221110']
};

/**
 * Generates a valid 15-digit IMEI with Luhn checksum based on product name.
 * @param {string} productName 
 * @returns {string}
 */
export function generateSimulatedImei(productName) {
  let tac = '35000000';
  const lowerName = productName ? productName.toLowerCase() : '';

  // 1. Try precise model match
  const modelMatch = MODEL_TACS.find(m => m.keywords.some(k => lowerName.includes(k)));
  if (modelMatch) {
    tac = modelMatch.tac;
  } else {
    // 2. Try brand match
    for (const [brand, tacs] of Object.entries(BRAND_TACS)) {
      if (lowerName.includes(brand)) {
        tac = tacs[Math.floor(Math.random() * tacs.length)];
        break;
      }
    }
  }

  // Generate 6 random digits + 1 checksum digit
  let imei = tac + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  // Calculate Luhn checksum
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(imei[i]);
    if (i % 2 !== 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return imei + checkDigit;
}

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
 */
export function getDeviceHint(imei) {
  const model = getModelFromImei(imei);
  if (model) return model;
  if (!imei) return "Introduceți IMEI...";
  return "Analizând IMEI...";
}

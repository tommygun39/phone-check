/**
 * ImeiService.js
 * Utility for mapping IMEI/SN and Product Names to phone models.
 */

// TAC (Type Allocation Code) mappings for manual entry or scan
const TAC_MAP = {
  // Samsung S Series
  '35421510': 'Samsung Galaxy S22',
  '35521510': 'Samsung Galaxy S22+',
  '35621510': 'Samsung Galaxy S22 Ultra',
  '35123456': 'Samsung Galaxy S23 Ultra',
  '35154011': 'Samsung Galaxy S21',
  '35234567': 'Samsung Galaxy S24 Ultra',
  '35928311': 'Samsung Galaxy Z Fold 5',
  '35345678': 'iPhone 15 Pro',
  '35456789': 'iPhone 15 Pro Max',
};

// Precise keyword mapping for USB Product Names
const PRODUCT_NAME_KEYWORDS = [
  { keywords: ['s24 ultra'], model: 'Samsung Galaxy S24 Ultra' },
  { keywords: ['s23 ultra'], model: 'Samsung Galaxy S23 Ultra' },
  { keywords: ['s22 ultra'], model: 'Samsung Galaxy S22 Ultra' },
  { keywords: ['s22+', 's22 plus'], model: 'Samsung Galaxy S22+' },
  { keywords: ['s22'], model: 'Samsung Galaxy S22' },
  { keywords: ['s21'], model: 'Samsung Galaxy S21' },
  { keywords: ['fold 5'], model: 'Samsung Galaxy Z Fold 5' },
  { keywords: ['fold 4'], model: 'Samsung Galaxy Z Fold 4' },
  { keywords: ['fold 3'], model: 'Samsung Galaxy Z Fold 3' },
  { keywords: ['flip 5'], model: 'Samsung Galaxy Z Flip 5' },
  { keywords: ['iphone 15 pro max'], model: 'iPhone 15 Pro Max' },
  { keywords: ['iphone 15 pro'], model: 'iPhone 15 Pro' },
  { keywords: ['iphone 14 pro max'], model: 'iPhone 14 Pro Max' },
  { keywords: ['iphone 14 pro'], model: 'iPhone 14 Pro' },
  { keywords: ['pixel 8 pro'], model: 'Google Pixel 8 Pro' },
];

/**
 * Tries to identify a model name from the USB product name string.
 * @param {string} productName 
 * @returns {string|null}
 */
export function getModelFromProductName(productName) {
  if (!productName) return null;
  const lowerName = productName.toLowerCase();
  const match = PRODUCT_NAME_KEYWORDS.find(m => m.keywords.some(k => lowerName.includes(k)));
  return match ? match.model : null;
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
 * Gets a hint about the device.
 */
export function getDeviceHint(id) {
  if (!id) return "Așteptare dispozitiv...";
  
  // If it's a numeric IMEI, try to get model
  const cleanId = id.toString().replace(/\D/g, '');
  if (cleanId.length >= 8) {
    const model = getModelFromImei(cleanId);
    if (model) return model;
  }

  return "ID Hardware Real";
}

/**
 * Validates an IMEI (standard Luhn)
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

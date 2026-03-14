/**
 * ImeiService.js
 * Utility for mapping IMEI TAC codes to phone models.
 */

// TAC is the first 8 digits of an IMEI
const TAC_MAP = {
  '35123456': 'Samsung Galaxy S23 Ultra',
  '35234567': 'Samsung Galaxy S24 Ultra',
  '35345678': 'iPhone 15 Pro',
  '35456789': 'iPhone 15 Pro Max',
  '35567890': 'iPhone 14 Pro',
  '35678901': 'Google Pixel 8 Pro',
  '35000000': 'Generic Test Device',
  // You can expand this mapping with a larger database
};

/**
 * Gets the phone model name from an IMEI string.
 * @param {string} imei 
 * @returns {string|null}
 */
export function getModelFromImei(imei) {
  if (!imei || imei.length < 8) return null;
  
  const tac = imei.substring(0, 8);
  return TAC_MAP[tac] || null;
}

/**
 * Validates an IMEI using Luhn algorithm (simplified check)
 * @param {string} imei 
 * @returns {boolean}
 */
export function validateImei(imei) {
  return /^\d{15}$/.test(imei);
}

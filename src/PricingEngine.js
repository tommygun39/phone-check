/**
 * Pricing Engine for Phone Check Pro
 * Based on second-hand market trends (OLX.ro, Facebook Marketplace)
 */

const MARKET_DATA = {
  "Samsung Galaxy S23 Ultra": { basePrice: 3200, minPrice: 2800, maxPrice: 3800 },
  "Samsung Galaxy S24 Ultra": { basePrice: 4500, minPrice: 4000, maxPrice: 5200 },
  "iPhone 15 Pro": { basePrice: 4200, minPrice: 3800, maxPrice: 4800 },
  "iPhone 15 Pro Max": { basePrice: 4800, minPrice: 4400, maxPrice: 5500 },
  "iPhone 14 Pro": { basePrice: 3500, minPrice: 3100, maxPrice: 4000 },
  "Google Pixel 8 Pro": { basePrice: 2800, minPrice: 2400, maxPrice: 3300 },
  "Generic": { basePrice: 1500, minPrice: 800, maxPrice: 2500 }
};

export function estimatePrice(model, condition, riskScore) {
  // If no model is provided, return nulled pricing
  if (!model) {
    return {
        min: 0,
        avg: 0,
        max: 0,
        currency: "RON",
        isPending: true
    };
  }

  // Find model data or use Generic
  const modelKey = Object.keys(MARKET_DATA).find(m => model.toLowerCase().includes(m.toLowerCase())) || "Generic";
  const data = MARKET_DATA[modelKey];

  let estimatedPrice = data.basePrice;

  // Age/Condition adjustment
  if (condition === 'Mint') estimatedPrice = data.maxPrice;
  else if (condition === 'Good' || !condition) estimatedPrice = data.basePrice; // Default if empty
  else if (condition === 'Fair') estimatedPrice = (data.minPrice + data.basePrice) / 2;
  else if (condition === 'Poor') estimatedPrice = data.minPrice;

  // RISK ADJUSTMENT
  if (riskScore >= 80) {
    estimatedPrice = estimatedPrice * 0.2; // Value for parts
  } else if (riskScore > 0) {
    estimatedPrice = estimatedPrice * (1 - (riskScore / 100));
  }

  return {
    min: Math.round(estimatedPrice * 0.9),
    avg: Math.round(estimatedPrice),
    max: Math.round(estimatedPrice * 1.1),
    currency: "RON",
    isCriticalRisk: riskScore >= 80,
    isPending: false
  };
}

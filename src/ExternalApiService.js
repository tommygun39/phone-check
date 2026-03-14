/**
 * ExternalApiService.js
 * Utility for interacting with third-party IMEI and Device Status APIs.
 */

const API_PROVIDERS = {
  IMEI_INFO: 'https://api.imei.info/v1',
  IMEICHECK: 'https://imeicheck.com/api',
};

/**
 * Performs an external cloud verification for a device.
 * @param {string} imei - The 15-digit IMEI or Serial Number.
 * @param {string} apiKey - The user's credential.
 * @param {string} provider - The chosen service provider.
 */
export async function performCloudCheck(imei, apiKey, provider = 'IMEI_INFO') {
  if (!apiKey || apiKey === 'DEMO_MODE') {
    return simulateCloudResponse(imei);
  }

  try {
    // Note: Actual implementation would require specific API documentation for each provider.
    // This is a generic fetch structure for IMEI.info as an example.
    const response = await fetch(`${API_PROVIDERS[provider]}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ imei })
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    
    const data = await response.json();
    return formatApiResponse(data, provider);
  } catch (error) {
    console.error('Cloud Check Failed:', error);
    throw error;
  }
}

/**
 * Simulates an API response for testing/demo purposes.
 */
function simulateCloudResponse(imei) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // If it ends with "000" simulate a block
      const isBlacklisted = imei.endsWith('000');
      const isSamsung = imei.includes('35421510') || imei.includes('R5C');
      
      resolve({
        source: 'Simulated Cloud API',
        blacklistStatus: isBlacklisted ? 'BLACKLISTED' : 'CLEAN',
        warrantyStatus: isBlacklisted ? 'Void (Reported)' : 'Active (Official)',
        kgStatus: isSamsung && isBlacklisted ? 'Locked' : 'Normal',
        activationDate: '2024-03-10',
        modelConfirmed: isSamsung ? 'Samsung Galaxy S22' : 'Unknown Hardware',
        raw: { simulated: true, timestamp: new Date().toISOString() }
      });
    }, 1500);
  });
}

/**
 * Normalizes different API formats into a unified internal format.
 */
function formatApiResponse(data, provider) {
  return {
    source: provider,
    blacklistStatus: data.blacklist || data.status || 'CLEAN',
    warrantyStatus: data.warranty || data.warranty_date || 'Unknown',
    kgStatus: data.kg_status || data.mdm || 'Normal',
    activationDate: data.activation_date || 'N/A',
    modelConfirmed: data.model || 'Unknown',
    raw: data
  };
}

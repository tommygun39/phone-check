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
      resolve({
        source: 'Simulated Cloud API',
        blacklistStatus: isBlacklisted ? 'BLACKLISTED' : 'CLEAN',
        warrantyStatus: 'Active',
        kgStatus: 'Normal',
        activationDate: '2024-01-15',
        raw: { simulated: true }
      });
    }, 1500);
  });
}

/**
 * Normalizes different API formats into a unified internal format.
 */
function formatApiResponse(data, provider) {
  // Logic to map IMEI.info or IMEICheck responses to our format
  return {
    source: provider,
    blacklistStatus: data.blacklist || 'CLEAN',
    warrantyStatus: data.warranty || 'Unknown',
    kgStatus: data.kg_status || 'Normal',
    raw: data
  };
}

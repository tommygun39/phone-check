export function calculateRiskScore(data) {
  let score = 0;
  let reasons = [];

  // 1. KG State check
  if (data.kgState === 'Locked' || data.kgState === 'Active') {
    score += 100;
    reasons.push(`KG Status critic: ${data.kgState}`);
  } else if (data.kgState === 'Prenormal') {
    score += 40;
    reasons.push(`KG Status suspect: Prenormal`);
  } else if (!data.kgState) {
    // Optionally add a note for missing data, but don't add score
  }

  // 2. IMEI DB Status
  if (data.imeiStatus === 'Stolen' || data.imeiStatus === 'Lost' || data.imeiStatus === 'Blacklisted') {
    score += 100;
    reasons.push(`IMEI înregistrat ca furat/pierdut/întârziere plată!`);
  } else if (data.imeiStatus === 'Unknown') {
    score += 15;
    reasons.push(`Status IMEI necunoscut.`);
  }

  // 3. CSC Code Mismatch
  if (data.cscMatch === 'No') {
    score += 25;
    reasons.push(`CSC Code diferit de regiunea așteptată (Posibil modificat / altă piață).`);
  }

  // 4. Time since activation
  const monthsActive = parseInt(data.activationMonths, 10);
  if (!isNaN(monthsActive)) {
    if (monthsActive < 1) {
      score += 20;
      reasons.push(`Telefon activat de foarte puțin timp (< 1 lună). Riscul de recâștigare / fraude by rată.`);
    }
  }

  // 5. Financing / MDM check (New)
  if (data.financingStatus === 'Unpaid' || data.financingStatus === 'Outstanding') {
    score += 100;
    reasons.push(`Dispozitivul are rate neplătite la operator! Va fi blocat (MDM/KG).`);
  }

  // 6. Carrier Lock (New)
  if (data.carrierLock === 'Locked') {
    score += 30;
    reasons.push(`Dispozitiv blocat în rețea (Sim Lock).`);
  }

  // 7. Bootloader status (New)
  if (data.bootloaderStatus === 'Unlocked') {
    score += 25;
    reasons.push(`Bootloader deblocat. Garanția Samsung Knox poate fi anulată (0x1).`);
  }

  // 8. Warranty (New)
  if (data.warrantyStatus === 'Expired') {
    score += 10;
    reasons.push(`Garanția producătorului a expirat.`);
  }

  // Final validation
  if (score > 100) score = 100;
  
  return { score, reasons };
}

import Dexie from 'dexie';

export const db = new Dexie('PhoneCheckHistoryDB');
db.version(2).stores({
  checks: '++id, imei, model, date, score, priceEstimation'
}).upgrade(tx => {
  // Upgrade logic if needed for existing records
});

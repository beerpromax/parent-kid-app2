import { onSnapshot } from 'firebase/firestore';
import { ledgerCol } from '../paths';
import { LedgerEntry } from '../types';
import { getStorageItem, subscribeToKey } from './localStorageDb';

const useLocalStorage = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';

export function subscribeLedger(
  familyId: string,
  kidId: string,
  cb: (e: LedgerEntry[]) => void
) {
  if (useLocalStorage) {
    const load = () => {
      const data = getStorageItem<LedgerEntry[]>(`ledger_${familyId}`, []);
      const filtered = data.filter((e) => e.kidId === kidId);
      // Sort by createdAt descending
      filtered.sort((a, b) => b.createdAt - a.createdAt);
      // Slice top 20
      cb(filtered.slice(0, 20));
    };
    load();
    return subscribeToKey(`ledger_${familyId}`, load);
  }

  const colRef = ledgerCol(familyId);
  return onSnapshot(colRef, (snapshot) => {
    const entries: LedgerEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as LedgerEntry;
      if (data.kidId === kidId) {
        entries.push({ id: doc.id, ...data });
      }
    });
    entries.sort((a, b) => b.createdAt - a.createdAt);
    const limited = entries.slice(0, 20);
    cb(limited);
  });
}

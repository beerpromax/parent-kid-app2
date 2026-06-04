import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

export const familyDoc = (familyId: string) => 
  doc(db, 'families', familyId);

export const profilesCol = (familyId: string) => 
  collection(db, 'families', familyId, 'profiles');

export const profileDoc = (familyId: string, profileId: string) => 
  doc(db, 'families', familyId, 'profiles', profileId);

export const activitiesCol = (familyId: string) => 
  collection(db, 'families', familyId, 'activities');

export const activityDoc = (familyId: string, activityId: string) => 
  doc(db, 'families', familyId, 'activities', activityId);

export const completionsCol = (familyId: string) => 
  collection(db, 'families', familyId, 'completions');

export const completionDoc = (familyId: string, completionId: string) => 
  doc(db, 'families', familyId, 'completions', completionId);

export const ledgerCol = (familyId: string) => 
  collection(db, 'families', familyId, 'ledger');

export const ledgerDoc = (familyId: string, entryId: string) => 
  doc(db, 'families', familyId, 'ledger', entryId);

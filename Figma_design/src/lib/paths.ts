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

export const rewardsCol = (familyId: string) => 
  collection(db, 'families', familyId, 'rewards');

export const rewardDoc = (familyId: string, rewardId: string) => 
  doc(db, 'families', familyId, 'rewards', rewardId);

export const redemptionsCol = (familyId: string) => 
  collection(db, 'families', familyId, 'redemptions');

export const redemptionDoc = (familyId: string, redemptionId: string) => 
  doc(db, 'families', familyId, 'redemptions', redemptionId);

export const negotiationsCol = (familyId: string) => 
  collection(db, 'families', familyId, 'negotiations');

export const negotiationDoc = (familyId: string, threadId: string) => 
  doc(db, 'families', familyId, 'negotiations', threadId);

export const offersCol = (familyId: string, threadId: string) => 
  collection(db, 'families', familyId, 'negotiations', threadId, 'offers');

export const offerDoc = (familyId: string, threadId: string, offerId: string) => 
  doc(db, 'families', familyId, 'negotiations', threadId, 'offers', offerId);

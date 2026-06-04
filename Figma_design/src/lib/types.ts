export type Role = 'parent' | 'kid';

export interface Profile {
  id: string;
  familyId: string;
  name: string;
  role: Role;
  color?: string;        // avatar accent (hex or tailwind token)
  emoji?: string;        // simple avatar
  tokenBalance: number;  // meaningful for kids; parents keep 0
  createdAt: number;     // epoch ms
}

export type ActivityStatus = 'active' | 'archived'; // 'negotiating' RESERVED for Phase 2 — do not use

export interface Activity {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  tokenValue: number;          // current live value
  assignedKidIds: string[];    // empty array => assigned to ALL kids
  status: ActivityStatus;
  createdByProfileId: string;
  createdAt: number;
  updatedAt: number;
}

export type CompletionStatus = 'pending' | 'approved' | 'rejected';

export interface Completion {
  id: string;
  familyId: string;
  activityId: string;
  activityTitleSnapshot: string; // denormalized for display/history
  tokenValueSnapshot: number;    // rate captured at submission (D7)
  kidId: string;
  status: CompletionStatus;
  note?: string;                 // optional kid note
  submittedAt: number;
  reviewedAt?: number;
  reviewedByProfileId?: string;
  settledTokens?: number;        // set on approval == tokenValueSnapshot in P1
}

export interface LedgerEntry {
  id: string;
  familyId: string;
  kidId: string;
  delta: number;                 // +tokens (P1 only ever credits)
  reason: 'activity_approved';   // 'reward_redeemed' RESERVED for Phase 2
  relatedCompletionId?: string;
  balanceAfter: number;
  createdAt: number;
}

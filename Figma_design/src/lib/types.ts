export type Role = 'parent' | 'kid';

export interface Profile {
  id: string;
  familyId: string;
  name: string;
  role: Role;
  color?: string;        // avatar accent (hex or tailwind token)
  emoji?: string;        // simple avatar
  tokenBalance: number;  // meaningful for kids; parents keep 0
  currentStreak?: number;    // consecutive days with >=1 approved completion
  longestStreak?: number;
  lastStreakDate?: string;   // 'YYYY-MM-DD' in family-local tz
}

export type ActivityStatus = 'active' | 'archived' | 'negotiating';

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

export type LedgerReason =
  | 'activity_approved'
  | 'streak_bonus'
  | 'reward_redeemed'   // delta < 0
  | 'reward_refunded';  // delta > 0

export interface LedgerEntry {
  id: string;
  familyId: string;
  kidId: string;
  delta: number;                 
  reason: LedgerReason;   
  relatedCompletionId?: string;
  relatedRedemptionId?: string;  // link to reward redemption
  balanceAfter: number;
  createdAt: number;
}

// --- Reward ---
export type RewardStatus = 'proposed' | 'active' | 'negotiating' | 'archived';
export interface Reward {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  tokenCost: number;            // 0 while 'proposed' until parent sets it
  forKidIds: string[];          // empty => all kids
  status: RewardStatus;
  proposedByProfileId: string;  // kid (proposal) or parent (direct create)
  createdAt: number;
  updatedAt: number;
}

// --- Redemption ---
export type RedemptionStatus = 'requested' | 'fulfilled' | 'refunded';
export interface RedemptionRecord {
  id: string;
  familyId: string;
  rewardId: string;
  rewardTitleSnapshot: string;
  tokenCostSnapshot: number;    // amount deducted at request
  kidId: string;
  status: RedemptionStatus;
  note?: string;
  requestedAt: number;
  resolvedAt?: number;
  resolvedByProfileId?: string;
}

// --- Negotiation ---
export type NegotiationTargetType = 'activity' | 'reward';
export type NegotiationStatus = 'open' | 'agreed' | 'rejected' | 'cancelled';
export interface NegotiationThread {
  id: string;
  familyId: string;
  targetType: NegotiationTargetType;
  targetId: string;
  targetTitleSnapshot: string;
  initiatedByProfileId: string;   // always a kid (PRD §3.1)
  status: NegotiationStatus;
  originalValue: number;          // value before negotiation (token value or cost)
  currentOfferValue: number;      // value currently on the table
  currentOfferByProfileId: string;// who made it (implicitly agrees to it)
  agreedValue?: number;           // set when status='agreed'
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
}
export type OfferKind = 'open' | 'counter' | 'accept' | 'reject' | 'cancel';
export interface NegotiationOffer {  // subcollection of a thread
  id: string;
  threadId: string;
  byProfileId: string;
  byRole: Role;
  value: number;                   // proposed value (for open/counter/accept echoes the agreed value)
  message?: string;
  kind: OfferKind;
  createdAt: number;
}

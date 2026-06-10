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
  uid?: string;          // bound Firebase Auth account (Phase 4); absent until claimed
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

export type MoodTag = 'joyful' | 'happy' | 'calm' | 'meh' | 'tired' | 'frustrated' | 'sad';
export type EnergyTag = 'low' | 'medium' | 'high';

export interface PhotoRef {
  id: string;
  storagePath: string;     // full path in Storage (for deletion)
  downloadURL: string;     // cached display URL
  thumbnailURL?: string;   // ~320px version
  width?: number;
  height?: number;
  sizeBytes?: number;
  uploadedAt: number;
}

// ---- Phase 4: auth & invites ----

// Maps a Firebase Auth user to exactly one profile in one family.
// Created once at signup (parent) or invite claim (kid); immutable per rules.
export interface UserMapping {
  uid: string;
  familyId: string;
  profileId: string;
  role: Role;
  email: string;         // real (parent) or synthesized from username (kid)
  inviteCode?: string;   // kid accounts only — rules validate the claim batch with it
  createdAt: number;
}

export type InviteStatus = 'pending' | 'claimed' | 'revoked';

export interface Invite {
  id: string;            // == doc ID == the code
  familyId: string;
  profileId: string;     // kid profile this invite binds
  kidName: string;       // display convenience for the claim screen
  status: InviteStatus;
  createdByUid: string;
  createdAt: number;
  expiresAt: number;     // ms epoch
  claimedByUid?: string;
}

export type GrowthEntryStatus = 'active' | 'trashed';

export interface GrowthLogEntry {
  id: string;
  familyId: string;
  kidId: string;                  // whose log
  date: string;                   // 'YYYY-MM-DD' family-local (D8) — drives ordering
  title?: string;
  activityContent: string;        // PRD "活动内容" — free text of what happened
  durationMinutes?: number;
  participantProfileIds: string[];// family members involved
  participantNames?: string[];    // free-text extras (e.g., "Grandma")
  moodTag?: MoodTag;
  energyTag?: EnergyTag;
  note?: string;                  // PRD "短文字备注"
  photos: PhotoRef[];
  // optional linkage to the activity system (set when created via the bridge, D2)
  linkedCompletionId?: string;
  linkedActivityId?: string;
  status: GrowthEntryStatus;
  createdByProfileId: string;
  createdAt: number;
  updatedAt: number;
}

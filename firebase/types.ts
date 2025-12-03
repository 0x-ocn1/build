import { Timestamp } from 'firebase/firestore';

// USER PROFILE DATA
export interface UserProfile {
  username: string;
  avatarUrl: string | null;
  referralCode: string;
  referredBy: string | null;
  createdAt: Timestamp;
}

// MINING DATA
export interface MiningData {
  miningActive: boolean;
  lastStart: Timestamp | null;
  lastClaim: Timestamp | null;
  balance: number;
}

// REFERRAL DATA
export interface ReferralData {
  totalReferred: number;
  referredUsers: string[];
}

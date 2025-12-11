import type { Timestamp, FieldValue } from "firebase/firestore";

// USER PROFILE DATA
export interface UserProfile {
  username: string;
  avatarUrl: string | null;
  referralCode: string;
  referredBy: string | null;
  createdAt: Timestamp | FieldValue;
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

// BOOST DATA
export interface BoostData {
  usedToday: number;
  lastReset: Timestamp | null;
  balance: number;
}

// DAILY CLAIM DATA
export interface DailyClaimData {
  lastClaim: Timestamp | null;
  streak: number;
  totalEarned: number;
}

// WATCH & EARN DATA
export interface WatchEarnData {
  totalWatched: number;
  totalEarned: number;
}

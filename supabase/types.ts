export interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;

  // ✅ NEW
  has_completed_onboarding: boolean;
}


export interface MiningData {
    user_id: string;
       mining_active: boolean;
         last_start: string | null;
           last_claim: string | null;
             balance: number; // server balance (base)
}

export interface ReferralData {
  user_id: string;
  total_referred: number;
  referred_users: string[];
}

export interface BoostData {
  user_id: string;
  used_today: number;
  last_reset: string | null;
  balance: number;
}

export interface DailyClaimData {
  user_id: string;
  last_claim: string | null;
  streak: number;
  total_earned: number;
}

export interface WatchEarnData {
  user_id: string;
  total_watched: number;
  total_earned: number;
}

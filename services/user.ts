// services/user.ts
import { supabase } from "../supabase/client";
import {
  UserProfile,
  MiningData,
  ReferralData,
  BoostData,
  DailyClaimData,
  WatchEarnData,
} from "../supabase/types";

/* -------------------------------------------------------------
   Generate referral code
------------------------------------------------------------- */
export const generateReferralCode = (uid: string) =>
  uid.slice(0, 6).toUpperCase();

/* -------------------------------------------------------------
   CREATE USER AFTER REGISTER
------------------------------------------------------------- */
export async function createUserInFirestore(referredBy: string | null = null) {
  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser?.user) {
    console.warn("No supabase auth user available.", authError);
    return null;
  }

  const uid = authUser.user.id;

  const profile: Partial<UserProfile> = {
    user_id: uid,
    username: "",
    avatar_url: null,
    referral_code: generateReferralCode(uid),
    referred_by: referredBy,
  };

  const mining: Partial<MiningData> = {
    user_id: uid,
    mining_active: false,
    last_start: null,
    last_claim: null,
    balance: 0,
  };

  const referrals: Partial<ReferralData> = {
    user_id: uid,
    total_referred: 0,
    referred_users: [],
  };

  const boost: Partial<BoostData> = {
    user_id: uid,
    used_today: 0,
    last_reset: null,
    balance: 0,
  };

  const dailyClaim: Partial<DailyClaimData> = {
    user_id: uid,
    last_claim: null,
    streak: 0,
    total_earned: 0,
  };

  const watchEarn: Partial<WatchEarnData> = {
    user_id: uid,
    total_watched: 0,
    total_earned: 0,
  };

  const inserts = [
    supabase.from("user_profiles").insert(profile),
    supabase.from("mining_data").insert(mining),
    supabase.from("referral_data").insert(referrals),
    supabase.from("boost_data").insert(boost),
    supabase.from("daily_claim_data").insert(dailyClaim),
    supabase.from("watch_earn_data").insert(watchEarn),
  ];

  const results = await Promise.all(inserts);

  for (const r of results) {
    // @ts-ignore
    if (r.error) console.error("Insert error:", r.error);
  }

  return true;
}

/* -------------------------------------------------------------
   GET USER DATA
------------------------------------------------------------- */
export async function getUserData(uid: string) {
  const [
    profileRes,
    miningRes,
    referralsRes,
    boostRes,
    dailyRes,
    watchRes,
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("user_id", uid).single(),
    supabase.from("mining_data").select("*").eq("user_id", uid).single(),
    supabase.from("referral_data").select("*").eq("user_id", uid).single(),
    supabase.from("boost_data").select("*").eq("user_id", uid).single(),
    supabase.from("daily_claim_data").select("*").eq("user_id", uid).single(),
    supabase.from("watch_earn_data").select("*").eq("user_id", uid).single(),
  ]);

  if (profileRes.error && profileRes.error.code === "PGRST116") {
    return null;
  }

  return {
    profile: profileRes.data,
    mining: miningRes.data,
    referrals: referralsRes.data,
    boost: boostRes.data,
    dailyClaim: dailyRes.data,
    watchEarn: watchRes.data,
  };
}

/* -------------------------------------------------------------
   START MINING
------------------------------------------------------------- */
export async function startMining(uid: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("mining_data")
    .update({
      mining_active: true,
      last_start: now,
    })
    .eq("user_id", uid);

  if (error) throw error;
  return data;
}

/* -------------------------------------------------------------
   STOP MINING
------------------------------------------------------------- */
export async function stopMining(uid: string) {
  const { data, error } = await supabase
    .from("mining_data")
    .update({ mining_active: false })
    .eq("user_id", uid);

  if (error) throw error;
  return data;
}

/* -------------------------------------------------------------
   CLAIM MINING REWARD
------------------------------------------------------------- */
export async function claimMiningReward(uid: string) {
  const fetch = await supabase
    .from("mining_data")
    .select("*")
    .eq("user_id", uid)
    .single();

  if (fetch.error || !fetch.data) return 0;

  const mining = fetch.data as any;

  if (!mining.last_start) return 0;

  const lastStart = new Date(mining.last_start);
  const now = new Date();

  const elapsedMs = now.getTime() - lastStart.getTime();
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  const MAX_SECONDS = 24 * 3600;
  const capped = Math.min(elapsedSeconds, MAX_SECONDS);

  const DAILY_MAX = 4.8;
  const rewardAmount = (capped / MAX_SECONDS) * DAILY_MAX;
  const normalizedReward = Number(rewardAmount);

  const update = await supabase
    .from("mining_data")
    .update({
      balance: (mining.balance ?? 0) + normalizedReward,
      last_claim: now.toISOString(),
      last_start: null,
      mining_active: false,
    })
    .eq("user_id", uid)
    .eq("last_start", mining.last_start);

  if (update.error) return 0;

  const rows = update.data as any[] | null;

  if (!rows || rows.length === 0) return 0;

  return normalizedReward;
}

/* -------------------------------------------------------------
   REGISTER REFERRAL
------------------------------------------------------------- */
export async function registerReferral(
  referrerCode: string,
  newUserUid: string
) {
  const ref = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("referral_code", referrerCode)
    .maybeSingle();

  if (ref.error || !ref.data) return null;

  const referrerUid = ref.data.user_id;

  const rfetch = await supabase
    .from("referral_data")
    .select("*")
    .eq("user_id", referrerUid)
    .single();

  if (rfetch.error || !rfetch.data) return null;

  const current = rfetch.data as any;
  const newReferred = [...(current.referred_users ?? []), newUserUid];

  const upd = await supabase
    .from("referral_data")
    .update({
      total_referred: newReferred.length,
      referred_users: newReferred,
    })
    .eq("user_id", referrerUid);

  if (upd.error) return null;
  return true;
}

/* -------------------------------------------------------------
   BOOST REWARD
------------------------------------------------------------- */
export async function claimBoostReward(uid: string) {
  const [bRes, mRes] = await Promise.all([
    supabase.from("boost_data").select("*").eq("user_id", uid).single(),
    supabase.from("mining_data").select("*").eq("user_id", uid).single(),
  ]);

  if (bRes.error || mRes.error) return 0;

  const boost = bRes.data as any;
  const mining = mRes.data as any;

  const now = new Date();
  const lastReset = boost.last_reset ? new Date(boost.last_reset) : null;

  if (!lastReset || now.getTime() - lastReset.getTime() >= 24 * 3600 * 1000) {
    const reset = await supabase
      .from("boost_data")
      .update({ used_today: 0, last_reset: now.toISOString() })
      .eq("user_id", uid);

    if (reset.error) return 0;

    boost.used_today = 0;
    boost.last_reset = now.toISOString();
  }

  if (boost.used_today >= 3) return 0;

  const REWARD = 0.5;

  const [updateMining, updateBoost] = await Promise.all([
    supabase
      .from("mining_data")
      .update({ balance: (mining.balance ?? 0) + REWARD })
      .eq("user_id", uid),
    supabase
      .from("boost_data")
      .update({
        used_today: boost.used_today + 1,
        last_reset: now.toISOString(),
        balance: (boost.balance ?? 0) + REWARD,
      })
      .eq("user_id", uid),
  ]);

  if (updateMining.error || updateBoost.error) return 0;

  return REWARD;
}

/* -------------------------------------------------------------
   DAILY CLAIM
------------------------------------------------------------- */
export async function claimDailyReward(uid: string) {
  const [dRes, mRes] = await Promise.all([
    supabase.from("daily_claim_data").select("*").eq("user_id", uid).single(),
    supabase.from("mining_data").select("*").eq("user_id", uid).single(),
  ]);

  if (dRes.error || mRes.error) return { reward: 0 };

  const daily = dRes.data as any;
  const mining = mRes.data as any;

  const now = new Date();
  const lastClaim = daily.last_claim ? new Date(daily.last_claim) : null;
  const DAY = 24 * 3600 * 1000;

  if (lastClaim && now.getTime() - lastClaim.getTime() < DAY)
    return { reward: 0 };

  if (lastClaim && now.getTime() - lastClaim.getTime() >= DAY * 2)
    daily.streak = 0;

  daily.streak = (daily.streak ?? 0) + 1;

  let REWARD = 0.1 * daily.streak;
  if (daily.streak === 7) REWARD = 2;

  const [uMining, uDaily] = await Promise.all([
    supabase
      .from("mining_data")
      .update({ balance: (mining.balance ?? 0) + REWARD })
      .eq("user_id", uid),
    supabase
      .from("daily_claim_data")
      .update({
        last_claim: now.toISOString(),
        streak: daily.streak,
        total_earned: (daily.total_earned ?? 0) + REWARD,
      })
      .eq("user_id", uid),
  ]);

  if (uMining.error || uDaily.error) return { reward: 0 };

  return {
    reward: REWARD,
    newStreak: daily.streak,
    newLastClaim: now.toISOString(),
    newBalance: (mining.balance ?? 0) + REWARD,
  };
}

/* -------------------------------------------------------------
   WATCH & EARN
------------------------------------------------------------- */
export async function claimWatchEarnReward(uid: string) {
  const [wRes, mRes] = await Promise.all([
    supabase.from("watch_earn_data").select("*").eq("user_id", uid).single(),
    supabase.from("mining_data").select("*").eq("user_id", uid).single(),
  ]);

  if (wRes.error || mRes.error) return 0;

  const watch = wRes.data as any;
  const mining = mRes.data as any;

  const REWARD = 0.25;

  const [uMining, uWatch] = await Promise.all([
    supabase
      .from("mining_data")
      .update({ balance: (mining.balance ?? 0) + REWARD })
      .eq("user_id", uid),
    supabase
      .from("watch_earn_data")
      .update({
        total_watched: (watch.total_watched ?? 0) + 1,
        total_earned: (watch.total_earned ?? 0) + REWARD,
      })
      .eq("user_id", uid),
  ]);

  if (uMining.error || uWatch.error) return 0;

  return REWARD;
}

// hooks/useMining.ts
// hooks/useMining.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { createUserInFirestore } from "../services/user";
import { supabase } from "../supabase/client";
import {
  startMining,
  stopMining,
  claimMiningReward,
  getUserData,
} from "../services/user";

/* ------------------------------------------------------------
   RAW DB TYPES
------------------------------------------------------------ */

type RawProfileRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

type RawMiningRow = {
  user_id: string;
  mining_active: boolean;
  last_start: string | null;
  last_claim: string | null;
  balance: number;
};

type RawDailyRow = {
  user_id: string;
  last_claim: string | null;
  streak: number;
  total_earned: number;
};

type RawBoostRow = {
  user_id: string;
  used_today: number;
  last_reset: string | null;
  balance: number;
};

type RawWatchRow = {
  user_id: string;
  total_watched: number;
  total_earned: number;
};

/* ------------------------------------------------------------
   FRONTEND TYPES
------------------------------------------------------------ */

export type MiningData = {
  miningActive: boolean;
  lastStart: string | null;
  lastClaim: string | null;
  balance: number; // authoritative server balance
};

export type UserProfile = {
  user_id: string;
  username: string;
  avatarUrl: string | null;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
};

/* ------------------------------------------------------------
   NORMALIZERS
------------------------------------------------------------ */

function normalizeProfile(p: RawProfileRow | null): UserProfile | null {
  if (!p) return null;
  return {
    user_id: p.user_id,
    username: p.username ?? "",
    avatarUrl: p.avatar_url ?? null,
    referralCode: p.referral_code ?? "",
    referredBy: p.referred_by ?? null,
    createdAt: p.created_at,
  };
}

function normalizeMining(m: RawMiningRow | null): MiningData | null {
  if (!m) return null;
  return {
    miningActive: !!m.mining_active,
    lastStart: m.last_start,
    lastClaim: m.last_claim,
    balance: Number(m.balance ?? 0),
  };
}

function normalizeBoost(b: RawBoostRow | null) {
  if (!b) return null;
  return {
    user_id: b.user_id,
    used_today: b.used_today,
    last_reset: b.last_reset,
    balance: b.balance,
  };
}

/* ------------------------------------------------------------
   LIVE BALANCE (SAFE)
------------------------------------------------------------ */

function computeDisplayBalanceFromMining(mining: MiningData | null) {
  if (!mining) return 0;

  const base = mining.balance;

  if (!mining.miningActive || !mining.lastStart) return base;

  const now = Date.now();
  const startMs = new Date(mining.lastStart).getTime();
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - startMs) / 1000)
  );

  const MAX_SECONDS = 24 * 3600;
  const DAILY_MAX = 4.8;

  const capped = Math.min(elapsedSeconds, MAX_SECONDS);
  const sessionGain = (capped / MAX_SECONDS) * DAILY_MAX;

  return base + sessionGain;
}

/* ------------------------------------------------------------
   HOOK
------------------------------------------------------------ */

export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyClaim, setDailyClaim] = useState<RawDailyRow | null>(null);
  const [boost, setBoost] = useState<ReturnType<typeof normalizeBoost> | null>(
    null
  );
  const [watchEarn, setWatchEarn] = useState<RawWatchRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const channelsRef = useRef<any[]>([]);

  /* ------------------------------------------------------------
     INITIAL LOAD + REALTIME
  ------------------------------------------------------------ */

useEffect(() => {
  let mounted = true;

  (async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      return;
    }

    const uid = user.id;

    try {
      const combined = await getUserData(uid);
      if (!mounted) return;

      setUserProfile(normalizeProfile(combined?.profile ?? null));
      setMiningData(normalizeMining(combined?.mining ?? null));
      setDailyClaim(combined?.dailyClaim ?? null);
      setBoost(normalizeBoost(combined?.boost ?? null));
      setWatchEarn(combined?.watchEarn ?? null);
    } finally {
      if (mounted) setIsLoading(false);
    }

    /* ------------------ REALTIME (SAFE MERGE) ------------------ */

    const miningChannel = supabase
      .channel(`mining:uid:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mining_data",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const incoming = normalizeMining(payload.new as RawMiningRow);
          if (!incoming) return;

          setMiningData((prev) => {
            if (!prev) return incoming;
            return {
              miningActive: incoming.miningActive,
              lastStart: incoming.lastStart ?? prev.lastStart,
              lastClaim: incoming.lastClaim ?? prev.lastClaim,
              balance: Math.max(prev.balance, incoming.balance),
            };
          });
        }
      )
      .subscribe();

    const dailyChannel = supabase
      .channel(`daily:uid:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_claim",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          setDailyClaim(payload.new as RawDailyRow);
        }
      )
      .subscribe();

    channelsRef.current = [miningChannel, dailyChannel];
  })();

  return () => {
    mounted = false;
    channelsRef.current.forEach((ch) => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    });
    channelsRef.current = [];
  };
}, []);

  
  /* ------------------------------------------------------------
     ACTIONS
  ------------------------------------------------------------ */

  const start = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await startMining(user.id);
  }, []);

  const stop = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await stopMining(user.id);
  }, []);

  const claim = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    return await claimMiningReward(user.id);
  }, []);

  /* ------------------------------------------------------------
     PUBLIC API
  ------------------------------------------------------------ */

  const getLiveBalance = useCallback(() => {
    return computeDisplayBalanceFromMining(miningData);
  }, [miningData]);

  return {
    miningData,
    userProfile,
    dailyClaim,
    boost,
    watchEarn,
    isLoading,
    start,
    stop,
    claim,
    getLiveBalance,
  };
}

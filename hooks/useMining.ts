// hooks/useMining.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";

import {
  startMining as startMiningFirebase,
  stopMining as stopMiningFirebase,
  claimMiningReward as claimMiningRewardFirebase,
} from "../firebase/user";

import { MiningData, UserProfile } from "../firebase/types";

// -------------------------------
// 🔥 Lazy Firebase loaders
// -------------------------------
async function getAuthInstance() {
  const { getAuth } = await import("firebase/auth");
  return getAuth();
}

async function getDBInstance() {
  const { getFirestore } = await import("firebase/firestore");
  return getFirestore();
}

// -------------------------------
export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [dailyClaim, setDailyClaim] = useState<any | null>(null);
  const [boost, setBoost] = useState<any | null>(null);
  const [watchEarn, setWatchEarn] = useState<any | null>(null);

  const [liveSessionStart, setLiveSessionStart] = useState<Timestamp | null>(null);
  const tickRef = useRef<number | null>(null);

  // --------------------------------
  // FIRESTORE LISTENER
  // --------------------------------
  useEffect(() => {
    let unsub: null | (() => void) = null;

    (async () => {
      const auth = await getAuthInstance();
      const db = await getDBInstance();

      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);

      unsub = onSnapshot(
        userRef,
        (snap) => {
          if (!snap.exists()) {
            setUserProfile(null);
            setMiningData(null);
            setDailyClaim(null);
            setBoost(null);
            setWatchEarn(null);
            setIsLoading(false);
            return;
          }

          const data = snap.data();

          setUserProfile({
            username: data.username ?? "",
            avatarUrl: data.avatarUrl ?? null,
            referralCode: data.referralCode ?? "",
            referredBy: data.referredBy ?? null,
            createdAt: data.createdAt,
          });

          setMiningData(data.mining ?? null);
          setDailyClaim(data.dailyClaim ?? { lastClaim: null, streak: 0, totalEarned: 0 });
          setBoost(data.boost ?? { usedToday: 0, lastReset: null, balance: 0 });
          setWatchEarn(data.watchEarn ?? { totalWatched: 0, totalEarned: 0 });

          setLiveSessionStart(data.mining?.lastStart ?? null);
          setIsLoading(false);
        },
        (err) => {
          console.error("useMining onSnapshot error:", err);
          setIsLoading(false);
        }
      );
    })();

    return () => {
      if (unsub) unsub();
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
  }, []);

  // --------------------------------
  // ACTIONS
  // --------------------------------
  const start = useCallback(async () => {
    const auth = await getAuthInstance();
    const user = auth.currentUser;
    if (!user) return;
    await startMiningFirebase(user.uid);
  }, []);

  const stop = useCallback(async () => {
    const auth = await getAuthInstance();
    const user = auth.currentUser;
    if (!user) return;
    await stopMiningFirebase(user.uid);
  }, []);

  const claim = useCallback(async () => {
    const auth = await getAuthInstance();
    const user = auth.currentUser;
    if (!user) return 0;
    return await claimMiningRewardFirebase(user.uid);
  }, []);

  // --------------------------------
  // LIVE BALANCE CALCULATION
  // --------------------------------
  const computeDisplayBalance = useCallback((snapshotMining: MiningData | null) => {
    const baseBalance = snapshotMining?.balance ?? 0;
    const lastStart = snapshotMining?.lastStart ?? null;
    const miningActive = snapshotMining?.miningActive ?? false;

    if (!miningActive || !lastStart) return baseBalance;

    const now = Timestamp.now();
    const elapsedMs = now.toMillis() - lastStart.toMillis();
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const cappedSeconds = Math.min(elapsedSeconds, 24 * 3600);

    const perSecond = 4.8 / (24 * 3600);
    const sessionGain = cappedSeconds * perSecond;

    return Math.min(baseBalance + sessionGain, baseBalance + 4.8);
  }, []);

  const getLiveBalance = useCallback(() => {
    return computeDisplayBalance(miningData);
  }, [computeDisplayBalance, miningData]);

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

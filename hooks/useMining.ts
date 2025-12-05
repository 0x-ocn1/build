// hooks/useMining.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import {
  startMining as startMiningFirebase,
  stopMining as stopMiningFirebase,
  claimMiningReward as claimMiningRewardFirebase,
  getUserData,
} from "../firebase/user";
import { MiningData, UserProfile } from "../firebase/types";

export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Local UI-only state for live animation of the active session
  const [liveSessionStart, setLiveSessionStart] = useState<Timestamp | null>(null);
  const tickRef = useRef<number | null>(null);

  // Subscribe to user's document for live updates
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setUserProfile(null);
          setMiningData(null);
          setIsLoading(false);
          return;
        }

        const data = snap.data();
        setUserProfile(data.profile ?? null);
        setMiningData(data.mining ?? null);

        // reflect lastStart locally for animation
        setLiveSessionStart(data.mining?.lastStart ?? null);
        setIsLoading(false);
      },
      (err) => {
        console.error("useMining onSnapshot error:", err);
        setIsLoading(false);
      }
    );

    return () => {
      unsub();
      if (tickRef.current) {
        cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start mining (server call) — optimistic UI handled by snapshot
  const start = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await startMiningFirebase(user.uid);
      // liveSessionStart will update from the onSnapshot listener (serverTimestamp)
    } catch (err) {
      console.error("start mining failed", err);
      throw err;
    }
  }, []);

  // Stop mining (server call)
  const stop = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await stopMiningFirebase(user.uid);
    } catch (err) {
      console.error("stop mining failed", err);
      throw err;
    }
  }, []);

  // Claim mining rewards (server call)
  const claim = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return 0;
    try {
      const reward = await claimMiningRewardFirebase(user.uid);
      return reward;
    } catch (err) {
      console.error("claim mining failed", err);
      throw err;
    }
  }, []);

  // Helper: compute display balance *including* live accumulation for active session
  const computeDisplayBalance = useCallback(
    (snapshotMining: MiningData | null) => {
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

      // Cap per-session gain at 4.8
      const display = Math.min(baseBalance + sessionGain, baseBalance + 4.8);
      return display;
    },
    []
  );

  // Expose a live-updating numeric value for UI (caller can animate)
  const getLiveBalance = useCallback(() => {
    return computeDisplayBalance(miningData);
  }, [computeDisplayBalance, miningData]);

  return {
    miningData,
    userProfile,
    isLoading,
    start,
    stop,
    claim,
    getLiveBalance,
  };
}

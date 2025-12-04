import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  Timestamp 
} from "firebase/firestore";

import { 
  startMining, 
  stopMining, 
  claimMiningRewards 
} from "../firebase/mining";

import { MiningData, UserProfile } from "../firebase/types";

export function useMining() {
  const [miningData, setMiningData] = useState<MiningData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // -------------------------------
  // Load user profile + mining data
  // -------------------------------
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // User profile
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUserProfile(userSnap.data() as UserProfile);
      }

      // Mining data
      const miningRef = doc(db, "miningData", user.uid);
      const miningSnap = await getDoc(miningRef);

      if (miningSnap.exists()) {
        setMiningData(miningSnap.data() as MiningData);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  // -------------------------------
  // Start mining
  // -------------------------------
  const start = async () => {
    const user = auth.currentUser;
    if (!user) return;

    await startMining(user.uid);

    setMiningData(prev => {
      if (!prev) return null;

      return {
        ...prev,
        miningActive: true,
        lastStart: Timestamp.now(),
      };
    });
  };

  // -------------------------------
  // Stop mining
  // -------------------------------
  const stop = async () => {
    const user = auth.currentUser;
    if (!user) return;

    await stopMining(user.uid);

    setMiningData(prev => {
      if (!prev) return null;

      return {
        ...prev,
        miningActive: false,
        lastStop: Timestamp.now(),
      };
    });
  };

  // -------------------------------
  // Claim mining rewards
  // -------------------------------
  const claim = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const reward = await claimMiningRewards(user.uid);

    setMiningData(prev => {
      if (!prev) return null;

      return {
        ...prev,
        balance: (prev.balance ?? 0) + reward,
        lastClaim: Timestamp.now(),
      };
    });
  };

  return {
    miningData,
    userProfile,
    isLoading,
    start,
    stop,
    claim,
  };
}

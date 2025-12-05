// firebase/user.ts
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { auth, db, storage } from "./firebaseConfig";
import { UserProfile, MiningData, ReferralData } from "./types";
import { arrayUnion } from "firebase/firestore";

/**
 * NOTE: mining state is stored under users/{uid}.mining
 * mining: {
 *   miningActive: boolean,
 *   lastStart: Timestamp | null,
 *   lastClaim: Timestamp | null,
 *   balance: number
 * }
 */

// Generate random referral code
export const generateReferralCode = (uid: string) =>
  uid.slice(0, 6).toUpperCase();

// ------------------------------
// CREATE USER AFTER REGISTER
// ------------------------------
export async function createUserInFirestore(referredBy: string | null = null) {
  if (!auth.currentUser) return;

  const uid = auth.currentUser.uid;

  const userRef = doc(db, "users", uid);

  const profile: UserProfile = {
    username: "",
    avatarUrl: null,
    referralCode: generateReferralCode(uid),
    referredBy,
    createdAt: serverTimestamp() as Timestamp,
  };

  const mining: MiningData = {
    miningActive: false,
    lastStart: null,
    lastClaim: null,
    balance: 0,
  };

  const referrals: ReferralData = {
    totalReferred: 0,
    referredUsers: [],
  };

  await setDoc(userRef, {
    profile,
    mining,
    referrals,
  });
}

// ------------------------------
// GET USER DATA
// ------------------------------
export async function getUserData(uid: string) {
  const docSnap = await getDoc(doc(db, "users", uid));
  return docSnap.exists() ? docSnap.data() : null;
}

// ------------------------------
// START MINING
// ------------------------------
export async function startMining(uid: string) {
  const userRef = doc(db, "users", uid);

  // Always set a fresh lastStart when user presses Start
  await updateDoc(userRef, {
    "mining.miningActive": true,
    "mining.lastStart": serverTimestamp(),
  });
}

// ------------------------------
// STOP MINING
// ------------------------------
export async function stopMining(uid: string) {
  const userRef = doc(db, "users", uid);

  // Stop mining flag only. We do not claim automatically.
  await updateDoc(userRef, {
    "mining.miningActive": false,
  });
}

// ------------------------------
// CLAIM REWARDS
// ------------------------------
/**
 * Claim logic:
 * - If lastStart missing → nothing to claim (return 0)
 * - elapsedSeconds = now - lastStart
 * - cappedSeconds = min(elapsedSeconds, 86400) // cap at 24 hours
 * - reward = (cappedSeconds / 86400) * 4.8
 * - credit reward to mining.balance, set lastClaim, clear lastStart, set miningActive false
 *
 * Returns reward amount (number)
 */
export async function claimMiningReward(uid: string) {
  const userRef = doc(db, "users", uid);

  // Use transaction for safety (race-conditions)
  const reward = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return 0;

    const data = snap.data();
    const mining = data.mining as MiningData | undefined;

    if (!mining || !mining.lastStart) return 0;

    const now = Timestamp.now();
    const elapsedMs = now.toMillis() - mining.lastStart.toMillis();
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

    const MAX_SECONDS = 24 * 3600; // 86400
    const capped = Math.min(elapsedSeconds, MAX_SECONDS);

    const DAILY_MAX = 4.8; // max per 24h
    const rewardAmount = (capped / MAX_SECONDS) * DAILY_MAX;

    // If reward is extremely tiny (floating edge), normalize to two decimals (optional)
    const normalizedReward = Number(rewardAmount);

    // Update doc: increment balance, set lastClaim timestamp, clear lastStart, miningActive false
    tx.update(userRef, {
      "mining.balance": increment(normalizedReward),
      "mining.lastClaim": serverTimestamp(),
      "mining.lastStart": null,
      "mining.miningActive": false,
    });

    return normalizedReward;
  });

  return reward;
}

// ------------------------------
// REGISTER REFERRAL
// ------------------------------
export async function registerReferral(referrerCode: string, newUserUid: string) {
  // Find user who owns this referral code
  const allUsersSnap = await getDoc(doc(db, "referrals", referrerCode));

  // If no referral document found → skip
  if (!allUsersSnap.exists()) return;

  const referrerUid = allUsersSnap.data().uid;

  const referrerRef = doc(db, "users", referrerUid);

  await updateDoc(referrerRef, {
    "referrals.totalReferred": increment(1),
    "referrals.referredUsers": arrayUnion([newUserUid]),
  });
}

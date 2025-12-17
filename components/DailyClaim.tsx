import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useEffect, useRef, useState, useMemo } from "react";

import { claimDailyReward } from "../services/user";
import { useMining } from "../hooks/useMining";
import { supabase } from "../supabase/client";

/* -------------------------------------------------
   SAFE ADS SETUP
-------------------------------------------------- */
const IS_NATIVE =
  Platform.OS === "android" || Platform.OS === "ios";

let Ads: any = null;
if (IS_NATIVE) {
  try {
    Ads = require("react-native-google-mobile-ads");
  } catch {
    Ads = null;
  }
}

function useSafeInterstitialAd(adUnitId: string) {
  if (!IS_NATIVE || !Ads?.useInterstitialAd) {
    return {
      isLoaded: false,
      isClosed: false,
      load: () => {},
      show: () => {},
    };
  }

  return Ads.useInterstitialAd(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });
}

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
type DailyClaimProps = {
  visible: boolean;
  onClose?: () => void;
};

const STREAK_REWARDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 2.0];

function fmtTimeLeft(ms: number) {
  if (!ms || ms <= 0) return "0h 0m";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function DailyClaim({
  visible,
  onClose,
}: DailyClaimProps) {
  const { dailyClaim } = useMining();

  const [uid, setUid] = useState<string | null>(null);

  /* -------------------------------------------------
     AUTH LISTENER
  -------------------------------------------------- */
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUid(session?.user?.id ?? null);
      }
    );

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  /* -------------------------------------------------
     UI STATE
  -------------------------------------------------- */
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldownMs, setCooldownMs] = useState(0);

  /* -------------------------------------------------
     SAFETY REFS (MATCH BOOST)
  -------------------------------------------------- */
  const mountedRef = useRef(true);
  const rewardPendingRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    loadingRef.current = loading;
    return () => {
      mountedRef.current = false;
    };
  }, [loading]);

  /* -------------------------------------------------
     AUTO CLOSE IF LOGGED OUT
  -------------------------------------------------- */
  useEffect(() => {
    if (!uid && visible) onClose?.();
  }, [uid, visible, onClose]);

  /* -------------------------------------------------
     INTERSTITIAL AD
  -------------------------------------------------- */
  const adUnitId =
    __DEV__ && Ads?.TestIds
      ? Ads.TestIds.INTERSTITIAL
      : "ca-app-pub-4533962949749202/2761859275";

  const { isLoaded, isClosed, load, show } =
    useSafeInterstitialAd(adUnitId);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  /* -------------------------------------------------
     COOLDOWN TIMER
  -------------------------------------------------- */
  useEffect(() => {
    const raw = dailyClaim?.last_claim;
    if (!raw) {
      setCooldownMs(0);
      return;
    }

    const lastMs = new Date(raw).getTime() || 0;
    const DAY = 86400000;

    const update = () => {
      if (!mountedRef.current) return;
      setCooldownMs(
        Math.max(0, DAY - (Date.now() - lastMs))
      );
    };

    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [dailyClaim?.last_claim]);

  /* -------------------------------------------------
     AD CLOSED → GIVE REWARD
  -------------------------------------------------- */
  useEffect(() => {
    if (!isClosed || !rewardPendingRef.current) return;

    rewardPendingRef.current = false;

    (async () => {
      try {
        if (!uid || !mountedRef.current) return;

        const res = await claimDailyReward(uid);
        if (!mountedRef.current) return;

        const reward =
          typeof res === "object"
            ? res?.reward ?? 0
            : Number(res || 0);

        setMessage(
          reward === 0
            ? "Already claimed for today."
            : `+${reward.toFixed(1)} VAD added to your balance!`
        );
      } catch {
        if (mountedRef.current)
          setMessage("Claim failed. Try again.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    })();
  }, [isClosed, uid]);

  /* -------------------------------------------------
     CLAIM HANDLER
  -------------------------------------------------- */
  const handleClaim = async () => {
    if (loadingRef.current || cooldownMs > 0) return;

    setMessage("");
    setLoading(true);
    loadingRef.current = true;
    rewardPendingRef.current = true;

    if (!uid) {
      setMessage("Please log in to claim.");
      setLoading(false);
      loadingRef.current = false;
      rewardPendingRef.current = false;
      return;
    }

    if (!isLoaded) {
      load();
      setLoading(false);
      loadingRef.current = false;
      rewardPendingRef.current = false;
      return;
    }

    try {
      show();
    } catch {
      rewardPendingRef.current = false;
      setMessage("Failed to show ad.");
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const streak = dailyClaim?.streak ?? 0;

  const progressLabel = useMemo(
    () =>
      cooldownMs > 0
        ? fmtTimeLeft(cooldownMs)
        : "Available now",
    [cooldownMs]
  );

  // ✅ JSX BELOW REMAINS 100% UNCHANGED

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🔥 Daily Check-In</Text>
          <Text style={styles.sub}>Claim every 24 hours. Higher streak = more VAD.</Text>

          {/* Days Grid */}
          <View style={styles.grid}>
            {STREAK_REWARDS.map((r, i) => {
              const day = i + 1;
              const claimed = day <= streak;

              return (
                <View
                  key={i}
                  style={[
                    styles.dayBox,
                    claimed && styles.dayClaimed,
                    day % 3 !== 0 && { marginRight: 12 },
                    day > 3 && { marginTop: 12 },
                  ]}
                >
                  <Text style={styles.dayLabel}>Day {day}</Text>
                  <Text
                    style={[
                      styles.dayReward,
                      claimed && styles.dayRewardClaimed,
                    ]}
                  >
                    +{r} VAD
                  </Text>
                  {claimed && <Text style={styles.check}>✔</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Streak: {streak} day(s)</Text>
            <Text style={styles.metaText}>Next: {progressLabel}</Text>
          </View>

          {/* Claim Button */}
          <Pressable
            onPress={handleClaim}
            disabled={loading || cooldownMs > 0}
            style={[styles.claimBtn, (loading || cooldownMs > 0) && { opacity: 0.6 }]}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={[styles.claimText, { marginLeft: 10 }]}>Loading ad...</Text>
              </View>
            ) : (
              <Text style={styles.claimText}>
                {cooldownMs > 0 ? "Already Claimed" : "Claim Today"}
              </Text>
            )}
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,8,20,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "92%",
    borderRadius: 28,
    padding: 22,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.45)",
    shadowColor: "#34D399",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  sub: {
    color: "#A5B4FC",
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayBox: {
    width: "30%",
    backgroundColor: "rgba(52,211,153,0.08)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.18)",
  },
  dayClaimed: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "#22C55E",
  },
  dayLabel: {
    color: "#9FA8C7",
    fontSize: 11,
    marginBottom: 4,
  },
  dayReward: {
    color: "#34D399",
    fontWeight: "900",
    fontSize: 13,
  },
  dayRewardClaimed: {
    color: "#22C55E",
  },
  check: {
    color: "#22C55E",
    fontWeight: "900",
    marginTop: 6,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: "#9FA8C7",
    fontSize: 13,
  },
  claimBtn: {
    marginTop: 18,
    backgroundColor: "#34D399",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  claimText: {
    color: "#000",
    fontWeight: "900",
  },
  message: {
    marginTop: 14,
    color: "#34D399",
    textAlign: "center",
    fontWeight: "700",
  },
  closeBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  closeText: {
    color: "#9FA8C7",
    fontWeight: "700",
  },
});

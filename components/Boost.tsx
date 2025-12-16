// app/components/Boost.tsx
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";

import { supabase } from "../supabase/client";
import { useMining } from "../hooks/useMining";
import { claimBoostReward } from "../services/user";

/* ----------------------------------------------------
   SAFE ADS SETUP
---------------------------------------------------- */
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

/* ----------------------------------------------------
   TYPES
---------------------------------------------------- */
type BoostProps = {
  visible: boolean;
  onClose?: () => void;
};

/* ----------------------------------------------------
   HELPERS
---------------------------------------------------- */
function timeLeft(ms: number) {
  if (!ms || ms <= 0) return "0h 0m";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

async function parseLastResetToMs(value: any) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

/* ----------------------------------------------------
   COMPONENT
---------------------------------------------------- */
export default function Boost({
  visible,
  onClose,
}: BoostProps) {
  const { boost } = useMining();

  const boostSafe = useMemo(() => {
    if (!boost) return null;
    return {
      usedToday: boost.used_today,
      lastReset: boost.last_reset,
      balance: boost.balance,
    };
  }, [boost]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldownMs, setCooldownMs] = useState(0);

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

  /* ----------------------------------------------------
     INTERSTITIAL AD
  ---------------------------------------------------- */
  const adUnitId =
    __DEV__ && Ads?.TestIds
      ? Ads.TestIds.INTERSTITIAL
      : "YOUR_REAL_PROD_AD_UNIT_ID";

  const { isLoaded, isClosed, load, show } =
    useSafeInterstitialAd(adUnitId);

  /* ----------------------------------------------------
     AUTO CLOSE IF LOGGED OUT
  ---------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!visible) return;
      const user = await getCurrentUser();
      if (!user && !cancelled) onClose?.();
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, onClose]);

  /* ----------------------------------------------------
     COOLDOWN TIMER
  ---------------------------------------------------- */
  useEffect(() => {
    let iv: any = null;

    (async () => {
      const lastMs = await parseLastResetToMs(
        boostSafe?.lastReset
      );

      const DAY = 86400000;

      const update = () => {
        if (!mountedRef.current) return;
        setCooldownMs(
          Math.max(0, DAY - (Date.now() - lastMs))
        );
      };

      update();
      iv = setInterval(update, 30000);
    })();

    return () => iv && clearInterval(iv);
  }, [boostSafe?.lastReset]);

  /* ----------------------------------------------------
     LOAD AD WHEN VISIBLE
  ---------------------------------------------------- */
  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  /* ----------------------------------------------------
     AD CLOSED → GIVE REWARD
  ---------------------------------------------------- */
  useEffect(() => {
    if (!isClosed || !rewardPendingRef.current) return;

    rewardPendingRef.current = false;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user || !mountedRef.current) return;

        const reward = await claimBoostReward(
          user.id
        );

        if (!mountedRef.current) return;

        setMessage(
          reward === 0
            ? "Boost limit reached."
            : `+${reward.toFixed(1)} VAD added!`
        );
      } catch {
        if (mountedRef.current)
          setMessage("Boost failed.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    })();
  }, [isClosed]);

  /* ----------------------------------------------------
     WATCH AD HANDLER
  ---------------------------------------------------- */
  const usedToday = boostSafe?.usedToday ?? 0;
  const remaining = Math.max(0, 3 - usedToday);

  const handleWatchAd = async () => {
    if (loadingRef.current) return;

    setMessage("");
    setLoading(true);
    loadingRef.current = true;
    rewardPendingRef.current = true;

    const user = await getCurrentUser();
    if (!user) {
      setMessage("Login required.");
      setLoading(false);
      loadingRef.current = false;
      rewardPendingRef.current = false;
      return;
    }

    if (remaining <= 0) {
      setMessage("No boosts left today.");
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

  const progressLabel = useMemo(() => {
    return remaining === 0
      ? `Next reset in ${timeLeft(cooldownMs)}`
      : `${remaining} boosts remaining today`;
  }, [remaining, cooldownMs]);

  // ⛔ RETURN JSX CONTINUES (UNCHANGED)




  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>⚡ Boost Earnings</Text>

          <Text style={styles.sub}>
            Watch a short ad to boost your balance.
          </Text>

          <View style={styles.rewardBox}>
            <Text style={styles.reward}>+0.5 VAD</Text>
            <Text style={styles.limit}>{progressLabel}</Text>
          </View>

          <View style={styles.usesRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.useDot,
                  i < usedToday && styles.useDotActive,
                  i < 2 ? { marginRight: 10 } : undefined,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleWatchAd}
            disabled={loading || remaining === 0}
            style={[
              styles.watchBtn,
              (loading || remaining === 0) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.watchText}>
              {loading
                ? "Loading ad..."
                : remaining === 0
                ? "No Boosts Left"
                : "Watch Ad"}
            </Text>
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

//styles//
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,15,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "92%",
    borderRadius: 26,
    padding: 26,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.5)",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 15,
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },

  sub: {
    color: "#9FA8C7",
    marginTop: 8,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  rewardBox: {
    marginTop: 22,
    backgroundColor: "rgba(139,92,246,0.18)",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
  },

  reward: {
    color: "#A78BFA",
    fontSize: 30,
    fontWeight: "900",
  },

  limit: {
    color: "#9FA8C7",
    fontSize: 12,
    marginTop: 6,
  },

  usesRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  useDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#2C2F48",
    borderWidth: 1,
    borderColor: "#3B3F63",
  },

  useDotActive: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },

  watchBtn: {
    marginTop: 22,
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  watchText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  message: {
    marginTop: 16,
    color: "#34D399",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
  },

  closeBtn: {
    marginTop: 24,
    alignItems: "center",
  },

  closeText: {
    color: "#A1A7C6",
    fontSize: 13,
    fontWeight: "600",
  },
});

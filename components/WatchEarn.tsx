//components/WatchEarn.tsx
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";

import { supabase } from "../supabase/client";
import { showRewardedAd } from "./RewardedAd";


/* -------------------------------------------------
   SUPABASE CLAIM
-------------------------------------------------- */
const claimWatchRewardSupabase = async (userId: string) => {
  const { data, error } = await supabase.rpc(
    "claim_watch_earn_reward",
    { uid: userId }
  );

  if (error) throw error;
  return data;
};

type Props = {
  visible?: boolean;
  onClose?: () => void;
};

export default function WatchEarn({
  visible = false,
  onClose,
}: Props) {
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* -------------------------------------------------
     AUTH
  -------------------------------------------------- */
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!mountedRef.current) return;
      setUid(data?.user?.id ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (!mountedRef.current) return;
        setUid(session?.user?.id ?? null);
      }
    );

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  /* -------------------------------------------------
     STATE
  -------------------------------------------------- */
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");

  const [stats, setStats] = useState({
    totalWatched: 0,
    totalEarned: 0,
  });

 
  /* -------------------------------------------------
     LOAD STATS + REALTIME
  -------------------------------------------------- */
  useEffect(() => {
    if (!uid) return;

    let active = true;

    const loadStats = async () => {
      const { data } = await supabase
        .from("watch_earn")
        .select("*")
        .eq("id", uid)
        .single();

      if (!data || !active) return;

      setStats({
        totalWatched: data.total_watched ?? 0,
        totalEarned: data.total_earned ?? 0,
      });
    };

    loadStats();

    const channel = supabase
      .channel(`watch_earn_${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watch_earn",
          filter: `id=eq.${uid}`,
        },
        loadStats
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [uid]);

  /* -------------------------------------------------
     WATCH HANDLER
  -------------------------------------------------- */
  const handleWatch = useCallback(async () => {
  if (!uid || loadingRef.current) return;

  setLoading(true);
  loadingRef.current = true;
  setCompleted(false);
  setMessage("");

  try {
    // 🔥 SHOW REWARDED AD (must be fully watched)
    await showRewardedAd();

    // ✅ THEN reward user
    const reward = await claimWatchRewardSupabase(uid);
    if (!mountedRef.current) return;

    setCompleted(true);
    setMessage(
      `+${Number(reward || 0).toFixed(2)} VAD credited!`
    );
  } catch (err) {
    console.log("Rewarded ad not completed:", err);
    if (mountedRef.current)
      setMessage("You must finish the ad to earn rewards.");
  } finally {
    if (mountedRef.current) {
      setLoading(false);
      loadingRef.current = false;
    }
  }
}, [uid]);


  const { totalWatched, totalEarned } = stats;

  /* -------------------------------------------------
     UI (UNCHANGED)
  -------------------------------------------------- */
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !loading && onClose?.()}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🎥 Watch & Earn</Text>
          <Text style={styles.sub}>
            Optional rewarded ads for instant VAD
          </Text>

          <View style={styles.rewardBox}>
            <Text style={styles.reward}>+0.25 VAD</Text>
            <Text style={styles.limit}>Per completed ad</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {totalWatched}
              </Text>
              <Text style={styles.statLabel}>
                Ads Watched
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {totalEarned.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>
                VAD Earned
              </Text>
            </View>
          </View>

          {!completed ? (
            <Pressable
              onPress={handleWatch}
              disabled={loading}
              style={[
                styles.watchBtn,
                loading && { opacity: 0.6 },
              ]}
            >
              {loading ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator />
                  <Text
                    style={[
                      styles.watchText,
                      { marginLeft: 10 },
                    ]}
                  >
                    Loading ad...
                  </Text>
                </View>
              ) : (
                <Text style={styles.watchText}>
                  Watch Ad
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={onClose}
              style={styles.doneBtn}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}

          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}

          {!loading && !completed && (
            <Pressable
              onPress={onClose}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Close</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------
   STYLES
-------------------------------------------------- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,15,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#0B1020",
    width: "92%",
    borderRadius: 26,
    padding: 26,
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.45)",
    shadowColor: "#FACC15",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  sub: {
    color: "#9FA8C7",
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
  },
  rewardBox: {
    marginTop: 20,
    backgroundColor: "rgba(250,204,21,0.18)",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(250,204,21,0.3)",
  },
  reward: {
    color: "#FACC15",
    fontSize: 30,
    fontWeight: "900",
  },
  limit: {
    color: "#9FA8C7",
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: "#131933",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    color: "#FACC15",
    fontWeight: "900",
    fontSize: 18,
  },
  statLabel: {
    color: "#9FA8C7",
    fontSize: 11,
    marginTop: 2,
  },
  watchBtn: {
    marginTop: 22,
    backgroundColor: "#FACC15",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  watchText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
  },
  doneBtn: {
    marginTop: 22,
    backgroundColor: "#34D399",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  doneText: {
    color: "#000",
    fontWeight: "900",
  },
  message: {
    marginTop: 16,
    color: "#FACC15",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 13,
  },
  skipBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  skipText: {
    color: "#9FA8C7",
    fontWeight: "600",
  },
});

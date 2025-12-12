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
} from "react-native";

import { supabase } from "../supabase/client"; // ✅ your Supabase client

/* ------------------------------------------------------------------
    🔥 IMPORT REWARDED AD + SUPABASE CLAIM FUNCTION (KEEP THESE)
---------------------------------------------------------------------*/
const lazyShowRewardedAd = async () =>
  (await import("./RewardedAd")).showRewardedAd;

/**  
 *  ⛔ REPLACE THIS with YOUR Supabase claim logic  
 *  Example: Supabase RPC (recommended)
 */
const claimWatchRewardSupabase = async (userId: string) => {
  const { data, error } = await supabase.rpc("claim_watch_earn_reward", {
    uid: userId,
  });

  if (error) throw error;
  return data; // reward amount returned by RPC
};

/* ------------------------------------------------------------------
     COMPONENT
---------------------------------------------------------------------*/
type Props = {
  visible?: boolean;
  onClose?: () => void;
};

export default function WatchEarn({ visible = false, onClose }: Props) {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* ---------------------------------------------------------------
     🔐 AUTH (NO FIREBASE)
  ----------------------------------------------------------------*/
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (active) setUid(user?.id ?? null);

      // subscribe to auth changes
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted.current) return;
          setUid(session?.user?.id ?? null);
        }
      );

      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    })();
  }, []);

  /* ---------------------------------------------------------------
     STATE
  ----------------------------------------------------------------*/
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");

  const [stats, setStats] = useState({
    totalWatched: 0,
    totalEarned: 0,
  });

  /* ---------------------------------------------------------------
     CLOSE IF LOGGED OUT
  ----------------------------------------------------------------*/
  useEffect(() => {
    if (visible && !uid) onClose?.();
  }, [visible, uid]);

  /* ---------------------------------------------------------------
     SUPABASE REALTIME — USER WATCH EARN STATS
     (Assumes table: `watch_earn` with row for each user)
     Or you can change select() to match your schema
  ----------------------------------------------------------------*/
  useEffect(() => {
    if (!uid) return;

    let active = true;

    const loadStats = async () => {
      const { data, error } = await supabase
        .from("watch_earn") // ⚠️ change if your table name is different
        .select("*")
        .eq("id", uid)
        .single();

      if (error || !active) return;

      setStats({
        totalWatched: data.total_watched ?? 0,
        totalEarned: data.total_earned ?? 0,
      });
    };

    loadStats();

    // realtime sync
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
        () => loadStats()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [uid]);

  /* ---------------------------------------------------------------
     WATCH AD FLOW
  ----------------------------------------------------------------*/
  const handleWatch = useCallback(async () => {
    if (!uid || loading) return;

    try {
      setLoading(true);
      setCompleted(false);
      setMessage("");

      const showRewardedAd = await lazyShowRewardedAd();
      await showRewardedAd();

      if (!mounted.current) return;

      // 🎁 CLAIM FROM SUPABASE NOW
      const reward = await claimWatchRewardSupabase(uid);

      if (!mounted.current) return;

      setCompleted(true);
      setMessage(`+${(reward ?? 0).toFixed(2)} VAD credited!`);
    } catch (err) {
      if (mounted.current) {
        setMessage("Ad not completed or failed.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [uid, loading]);

  const closeIfIdle = useCallback(() => {
    if (!loading) onClose?.();
  }, [loading, onClose]);

  /* ---------------------------------------------------------------
     UI
  ----------------------------------------------------------------*/
  if (!visible) return null;

  const { totalWatched, totalEarned } = stats;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeIfIdle}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🎥 Watch & Earn</Text>
          <Text style={styles.sub}>Optional rewarded ads for instant VAD</Text>

          <View style={styles.rewardBox}>
            <Text style={styles.reward}>+0.25 VAD</Text>
            <Text style={styles.limit}>Per completed ad</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalWatched}</Text>
              <Text style={styles.statLabel}>Ads Watched</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalEarned.toFixed(2)}</Text>
              <Text style={styles.statLabel}>VAD Earned</Text>
            </View>
          </View>

          {!completed ? (
            <Pressable
              onPress={handleWatch}
              disabled={loading}
              style={[styles.watchBtn, loading && { opacity: 0.6 }]}
            >
              {loading ? (
                <View style={{ flexDirection: "row" }}>
                  <ActivityIndicator />
                  <Text style={[styles.watchText, { marginLeft: 10 }]}>
                    Loading ad...
                  </Text>
                </View>
              ) : (
                <Text style={styles.watchText}>Watch Ad</Text>
              )}
            </Pressable>
          ) : (
            <Pressable onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {!loading && !completed && (
            <Pressable onPress={onClose} style={styles.skipBtn}>
              <Text style={styles.skipText}>Close</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------
  STYLES
---------------------------------------------------------------------*/
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

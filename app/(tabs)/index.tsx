//app/(tabs)/index.tsx
// app/(tabs)/index.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";

import { MotiText, MotiView } from "moti";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMining } from "../../hooks/useMining";
import DailyClaim from "../../components/DailyClaim";
import Boost from "../../components/Boost";
import WatchEarn from "../../components/WatchEarn";
import AdBanner from "../../components/AdBanner";
import { supabase } from "../../supabase/client";

/* ============================================================
   CONSTANTS
=============================================================== */
const DAY_SECONDS = 24 * 3600;
const DAILY_MAX = 4.8;
const HEADER_HEIGHT = 120;
const BANNER_HEIGHT = 90;

/* ============================================================
   ANIMATED BALANCE
=============================================================== */
function AnimatedBalance({ animatedValue }: { animatedValue: Animated.Value }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const id = animatedValue.addListener(({ value }) =>
      setVal(Number(value))
    );
    return () => animatedValue.removeListener(id);
  }, [animatedValue]);

  return (
    <MotiText
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 350 }}
      style={styles.balance}
    >
      {val.toFixed(4)} <Text style={styles.vadText}>VAD</Text>
    </MotiText>
  );
}

/* ============================================================
   MAIN PAGE
=============================================================== */
export default function Page() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    miningData,
    userProfile,
    isLoading,
    start,
    stop,
    claim,
  } = useMining();

  const miningActive = miningData?.miningActive ?? false;
  const PER_SECOND = DAILY_MAX / DAY_SECONDS;

  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningDataRef = useRef(miningData);

  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  const [claimedBalance, setClaimedBalance] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [sessionBalance, setSessionBalance] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DAY_SECONDS);

  const [dailyOpen, setDailyOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  const [news, setNews] = useState<any[]>([]);

  const progress = useMemo(
    () => (miningActive ? Math.min(1, sessionElapsed / DAY_SECONDS) : 0),
    [miningActive, sessionElapsed]
  );

  const canClaim = miningActive && sessionElapsed >= DAY_SECONDS;

  /* ============================================================
     EFFECTS (UNCHANGED)
=============================================================== */
  useEffect(() => {
    miningDataRef.current = miningData;
  }, [miningData]);

  useEffect(() => {
    if (typeof miningData?.balance === "number") {
      setClaimedBalance(miningData.balance);
    }
  }, [miningData?.balance]);

  useEffect(() => {
    if (claimedBalance === null) return;
    Animated.timing(animatedBalance, {
      toValue: claimedBalance,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [claimedBalance]);

  useEffect(() => {
    const id = setInterval(() => {
      const md = miningDataRef.current;
      if (!md?.miningActive || !md?.lastStart) {
        setSessionElapsed(0);
        setSessionBalance(0);
        setTimeLeft(DAY_SECONDS);
        return;
      }

      const elapsed = Math.min(
        Math.floor((Date.now() - new Date(md.lastStart).getTime()) / 1000),
        DAY_SECONDS
      );

      setSessionElapsed(elapsed);
      setSessionBalance(elapsed * PER_SECOND);
      setTimeLeft(Math.max(0, DAY_SECONDS - elapsed));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!spinAnim.current) {
      spinAnim.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: true,
        })
      );
    }
    miningActive ? spinAnim.current.start() : spinAnim.current.stop();
  }, [miningActive]);

  /* ================= NEWS ================= */
  useEffect(() => {
    let channel: any;

    const fetchNews = async () => {
      const { data } = await supabase
        .from("vad_news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) setNews(data);
    };

    fetchNews();

    channel = supabase
      .channel("vad-news")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vad_news" },
        fetchNews
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* ============================================================
     ACTIONS
=============================================================== */
  const handleStartStop = async () => {
    try {
      setIsStarting(true);
      miningActive ? await stop() : await start();
    } catch {
      Alert.alert("Error", "Unable to update mining state.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleClaim = async () => {
    if (!canClaim) return;
    try {
      setIsClaiming(true);
      const reward = await claim();
      Alert.alert("Mining Reward Claimed", `${reward.toFixed(4)} VAD`);
    } catch {
      Alert.alert("Error", "Claim failed.");
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  /* ============================================================
     RENDER
=============================================================== */
  return (
    <View style={styles.container}>
      {/* FIXED HEADER (CLEAN) */}
      <LinearGradient
        colors={["#24164a", "#0b0614"]}
        style={[styles.fixedHeader, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push("/(tabs)/profile")}>
            <View style={styles.avatarCircle}>
              {userProfile?.avatarUrl ? (
                <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={22} color="#fff" />
              )}
            </View>
          </Pressable>

          <Text style={styles.headerTitle}>VAD Mining</Text>

          <Pressable onPress={() => setRefreshing(true)}>
            <Ionicons name="refresh" size={22} color="#8B5CF6" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* CONTENT */}
      <View style={{ marginTop: HEADER_HEIGHT }}>
        {/* BALANCE */}
        <View style={styles.balanceWrap}>
          <Text style={styles.label}>Total Balance</Text>
          <AnimatedBalance animatedValue={animatedBalance} />
        </View>

        {/* PRIMARY ACTIONS */}
        <View style={styles.primaryActions}>
          <Pressable
            onPress={handleStartStop}
            style={[
              styles.primaryBtn,
              miningActive && { backgroundColor: "#2dd4bf" },
            ]}
          >
            <Text style={styles.primaryText}>
              {miningActive ? "Stop Mining" : "Start Mining"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClaim}
            disabled={!canClaim || isClaiming}
            style={[
              styles.primaryBtn,
              styles.claimBtn,
              (!canClaim || isClaiming) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.primaryText}>Claim</Text>
          </Pressable>
        </View>

        {/* SESSION CARD */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="hardware-chip" size={20} color="#8B5CF6" />
            </Animated.View>
            <Text style={styles.sessionLabel}>Mining Session</Text>
          </View>

          <Text style={styles.sessionValue}>{sessionBalance.toFixed(4)} VAD</Text>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <Text style={styles.progressMeta}>
            {canClaim
              ? "✅ Claim available"
              : `⏳ ${Math.floor(timeLeft / 3600)}h ${Math.floor(
                  (timeLeft % 3600) / 60
                )}m remaining`}
          </Text>
        </View>

        {/* FLOATING ACTIONS */}
        <View style={styles.floatingActions}>
          <ActionMini icon="rocket" label="Boost" onPress={() => setBoostOpen(true)} />
          <ActionMini icon="play-circle" label="Watch" onPress={() => setWatchOpen(true)} />
          <ActionMini icon="gift" label="Daily" onPress={() => setDailyOpen(true)} />
        </View>

        {/* AD */}
        <View style={styles.inlineAdWrap}>
          <AdBanner />
        </View>
      </View>

     <ScrollView
  style={styles.newsScroll}
  contentContainerStyle={{
    paddingHorizontal: 22,
    paddingBottom: insets.bottom + 100,
  }}
  showsVerticalScrollIndicator={false}
>
  {/* HEADER (STATIC, NOT A CONTAINER) */}
  <Text style={styles.newsTitle}>Latest News</Text>

  {/* FEED */}
  {news.map((n) => (
    <View key={n.id} style={styles.newsItem}>
      <Text style={styles.newsHeadline}>{n.title}</Text>
      <Text style={styles.newsBody}>{n.body}</Text>
    </View>
  ))}
</ScrollView>


      {dailyOpen && <DailyClaim visible onClose={() => setDailyOpen(false)} />}
      {boostOpen && <Boost visible onClose={() => setBoostOpen(false)} />}
      {watchOpen && <WatchEarn visible onClose={() => setWatchOpen(false)} />}
    </View>
  );
}

/* ============================================================
   MINI ACTION
=============================================================== */
const ActionMini = ({ icon, label, onPress }: any) => (
  <Pressable onPress={onPress} style={styles.miniBtn}>
    <MaterialIcons name={icon} size={22} color="#8B5CF6" />
    <Text style={styles.miniLabel}>{label}</Text>
  </Pressable>
);

/* ============================================================
   STYLES
=============================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060B1A" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    paddingHorizontal: 22,
    zIndex: 10,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },

  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(139,92,246,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  avatar: { width: 42, height: 42, borderRadius: 21 },

  balanceWrap: { paddingHorizontal: 22, marginTop: 14 },
  label: { color: "#9FA8C7", marginBottom: 6 },
  balance: { fontSize: 42, color: "#fff", fontWeight: "900" },
  vadText: { fontSize: 18, color: "#8B5CF6" },

  primaryActions: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 22,
    marginTop: 16,
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  claimBtn: { backgroundColor: "#22c55e" },

  primaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  sessionCard: {
    margin: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 18,
  },

  sessionHeader: { flexDirection: "row", gap: 8, alignItems: "center" },
  sessionLabel: { color: "#9FA8C7", fontSize: 12 },
  sessionValue: { fontSize: 30, color: "#fff", fontWeight: "900", marginTop: 8 },

  progressBg: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    marginTop: 14,
    overflow: "hidden",
  },

  progressFill: { height: 10, backgroundColor: "#8B5CF6" },
  progressMeta: { marginTop: 10, color: "#9FA8C7", fontSize: 12 },

  floatingActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 22,
    marginBottom: 10,
  },

  miniBtn: { alignItems: "center" },
  miniLabel: { color: "#9FA8C7", fontSize: 11, marginTop: 4 },

 inlineAdWrap: {
  marginHorizontal: 22,
  height: BANNER_HEIGHT,
  borderRadius: 18,
  overflow: "hidden",
  marginBottom: 18 // 👈 lifts ad slightly up
},


  newsScroll: { flex: 1 },
 newsItem: {
  backgroundColor: "rgba(255,255,255,0.05)",
  borderRadius: 16,
  padding: 16,
  marginBottom: 14,
},


  newsTitle: { color: "#fff", fontWeight: "900", marginBottom: 10 },
  newsBlock: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  newsHeadline: { color: "#8B5CF6", fontWeight: "800" },
  newsBody: { color: "#fff", fontSize: 13 },
});

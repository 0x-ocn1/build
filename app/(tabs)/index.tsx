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
import { MotiText } from "moti";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

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
const HEADER_HEIGHT = 140;
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
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 350 }}
      style={styles.balance}
    >
      {val.toFixed(4)} <Text style={styles.vadText}>VAD</Text>
    </MotiText>
  );
}

/* ============================================================
   SKELETON
=============================================================== */
const Skeleton = ({ height = 14 }: { height?: number }) => (
  <View
    style={{
      height,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderRadius: 8,
      marginBottom: 10,
    }}
  />
);

/* ============================================================
   ICON BUTTON
=============================================================== */
const IconBtn = ({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={[styles.iconBtn, disabled && { opacity: 0.45 }]}
  >
    <MaterialIcons name={icon} size={26} color="#8B5CF6" />
    <Text style={styles.iconLabel}>{label}</Text>
  </Pressable>
);

/* ============================================================
   MAIN PAGE
=============================================================== */
export default function Page() {
  const router = useRouter();

  const {
    miningData,
    userProfile,
    isLoading,
    start,
    stop,
    claim,
    getLiveBalance,
  } = useMining();

  const miningActive = miningData?.miningActive ?? false;
  const balanceBase = miningData?.balance ?? 0;
  const PER_SECOND = DAILY_MAX / DAY_SECONDS;

  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningDataRef = useRef(miningData);

  /* spin animation (RESTORED) */
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

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
     EFFECTS
=============================================================== */
  useEffect(() => {
    miningDataRef.current = miningData;
  }, [miningData]);

  useEffect(() => {
    Animated.timing(animatedBalance, {
      toValue: getLiveBalance(),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [balanceBase, getLiveBalance]);

  /* session ticker (RESTORED) */
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

  /* mining spin (RESTORED) */
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

  /* ================= NEWS (RESTORED) ================= */
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
  const handleRefresh = async () => {
    setRefreshing(true);
    Animated.timing(animatedBalance, {
      toValue: getLiveBalance(),
      duration: 400,
      useNativeDriver: false,
    }).start();
    setTimeout(() => setRefreshing(false), 600);
  };

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
      {/* FIXED HEADER */}
      <LinearGradient colors={["#24164a", "#0b0614"]} style={styles.fixedHeader}>
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

          <View style={{ flexDirection: "row", gap: 14 }}>
            <Pressable onPress={handleRefresh}>
              <Ionicons name="refresh" size={22} color="#8B5CF6" />
            </Pressable>

            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="hardware-chip" size={26} color="#8B5CF6" />
            </Animated.View>
          </View>
        </View>

        <Text style={styles.headerSub}>Max {DAILY_MAX} VAD per 24 hours</Text>
      </LinearGradient>

      {/* STATIC CONTENT */}
      <View style={{ marginTop: HEADER_HEIGHT }}>
        <View style={styles.balanceWrap}>
          <Text style={styles.label}>Total Balance</Text>
          <AnimatedBalance animatedValue={animatedBalance} />
        </View>

        {/* COMPACT ACTION BAR */}
        <View style={styles.actionRow}>
          <IconBtn
            icon={miningActive ? "pause-circle" : "play-circle"}
            label="Mine"
            onPress={handleStartStop}
            disabled={isStarting}
          />
          <IconBtn
            icon="redeem"
            label="Claim"
            onPress={handleClaim}
            disabled={!canClaim || isClaiming}
          />
          <IconBtn icon="gift" label="Daily" onPress={() => setDailyOpen(true)} />
          <IconBtn icon="rocket" label="Boost" onPress={() => setBoostOpen(true)} />
          <IconBtn icon="play-circle" label="Watch" onPress={() => setWatchOpen(true)} />
        </View>

        {/* SESSION */}
        <View style={styles.sessionCard}>
          <Text style={styles.sessionValue}>
            {sessionBalance.toFixed(4)} VAD
          </Text>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <Text style={styles.progressMeta}>
            {canClaim
              ? "✅ Claim available"
              : `⏳ Claim unlocks in ${Math.floor(timeLeft / 3600)}h ${Math.floor(
                  (timeLeft % 3600) / 60
                )}m`}
          </Text>
        </View>
      </View>

      {/* FIXED ADBANNER */}
      <View style={styles.bannerWrap}>
        <AdBanner />
      </View>

      {/* SCROLLABLE NEWS ONLY */}
      <ScrollView
        style={styles.newsScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ paddingBottom: BANNER_HEIGHT + 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.newsCard}>
          <Text style={styles.newsTitle}>Latest News</Text>

          {news.length === 0 ? (
            <>
              <Skeleton height={18} />
              <Skeleton />
              <Skeleton />
            </>
          ) : (
            news.map((n) => (
              <View key={n.id} style={styles.newsBlock}>
                <Text style={styles.newsHeadline}>{n.title}</Text>
                <Text style={styles.newsBody}>{n.body}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {dailyOpen && <DailyClaim visible onClose={() => setDailyOpen(false)} />}
      {boostOpen && <Boost visible onClose={() => setBoostOpen(false)} />}
      {watchOpen && <WatchEarn visible onClose={() => setWatchOpen(false)} />}
    </View>
  );
}

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
    padding: 20,
    zIndex: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  headerSub: { color: "#bfc7df", marginTop: 6 },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },

  balanceWrap: { padding: 22 },
  label: { color: "#9FA8C7", marginBottom: 6 },
  balance: { fontSize: 42, color: "#fff", fontWeight: "900" },
  vadText: { fontSize: 18, color: "#8B5CF6" },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  iconBtn: { alignItems: "center" },
  iconLabel: { color: "#9FA8C7", fontSize: 11, marginTop: 4 },

  sessionCard: {
    margin: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    padding: 18,
  },
  sessionValue: { fontSize: 30, color: "#fff", fontWeight: "900" },
  progressBg: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { height: 10, backgroundColor: "#8B5CF6" },
  progressMeta: { marginTop: 10, color: "#9FA8C7", fontSize: 12 },

  bannerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  newsScroll: { flex: 1 },
  newsCard: {
    marginHorizontal: 22,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 18,
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

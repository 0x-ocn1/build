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
  Dimensions,
  ScrollView,
  Image,
  Platform,
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

// ✅ Supabase client
import { supabase } from "../../supabase/client"; // <--- adjust path if needed

/* ============================================================
   MAIN COMPONENT
=============================================================== */
export default function MiningDashboard() {
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

  /* ---------- constants ---------- */
  const { width } = Dimensions.get("window");
  const DAY_SECONDS = 24 * 3600;
  const DAILY_MAX = 4.8;

  /* ---------- styles ---------- */
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#060B1A" },
    topNav: {
      position: "absolute",
      top: 12,
      left: 16,
      right: 16,
      zIndex: 999,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      pointerEvents: "box-none",
    },
    profileCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.04)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.06)",
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    chatCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.04)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.06)",
    },
    scroll: { paddingHorizontal: 22, paddingTop: 86 },
    headerCard: {
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "rgba(139,92,246,0.12)",
    },
    headerTitle: { fontSize: 18, color: "#fff", fontWeight: "900" },
    headerSub: { color: "#bfc7df", marginTop: 4, fontSize: 12 },
    currentWrap: { marginBottom: 14 },
    currentLabel: { color: "#9FA8C7", fontSize: 13, marginBottom: 6 },
    balance: { color: "#fff", fontSize: 42, fontWeight: "900" },
    vadText: { color: "#8B5CF6", fontSize: 18, fontWeight: "700" },
    vadSmall: { color: "#8B5CF6", fontSize: 14, fontWeight: "700" },
    buttonsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    halfBtn: {
      width: (width - 22 * 2 - 12) / 2,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    startBtn: {
      backgroundColor: "rgba(255,255,255,0.03)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.04)",
    },
    miningActiveBtn: {
      backgroundColor: "rgba(139,92,246,0.16)",
      borderWidth: 1,
      borderColor: "rgba(139,92,246,0.18)",
    },
    btnInner: { alignItems: "center" },
    btnText: { color: "#fff", marginTop: 8, fontWeight: "700" },
    smallTimer: { color: "#9FA8C7", marginTop: 6, fontSize: 12 },
    claimBtn: { backgroundColor: "#fff" },
    claimBtnText: { color: "#0F0A2A", fontWeight: "800", marginTop: 6 },
    claimAmountText: { marginTop: 6, color: "#0F0A2A", fontWeight: "700" },
    sessionCard: {
      backgroundColor: "rgba(255,255,255,0.03)",
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.04)",
    },
    sessionTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sessionLabel: { color: "#9FA8C7", fontSize: 12 },
    sessionValue: { color: "#fff", fontSize: 28, fontWeight: "800" },
    miningIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#8B5CF6",
      justifyContent: "center",
      alignItems: "center",
    },
    progressWrap: { marginTop: 6 },
    progressBg: {
      height: 10,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderRadius: 12,
      overflow: "hidden",
    },
    progressFill: { height: 10, backgroundColor: "#3B82F6" },
    progressMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    progressText: { color: "#9FA8C7", fontSize: 12 },
    infoBox: {
      marginTop: 12,
      backgroundColor: "rgba(255,255,255,0.02)",
      borderRadius: 12,
      padding: 12,
    },
    infoTitle: { color: "#fff", fontWeight: "800", marginBottom: 6 },
    infoBody: { color: "#bfc7df", fontSize: 13 },
    utilityRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    utilityItem: {
      width: (width - 22 * 2 - 12) / 3,
      backgroundColor: "rgba(255,255,255,0.02)",
      borderRadius: 12,
      padding: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.03)",
    },
    newsSection: { marginBottom: 20 },
    newsHeader: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12 },
    newsEmptyCard: {
      backgroundColor: "rgba(255,255,255,0.02)",
      borderRadius: 12,
      padding: 18,
      alignItems: "center",
    },
    newsEmptyText: { color: "#9FA8C7" },
    newsCardItem: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: "rgba(255,255,255,0.02)",
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.03)",
    },
    newsImage: { width: 72, height: 72, borderRadius: 10 },
    newsImagePlaceholder: {
      width: 72,
      height: 72,
      borderRadius: 10,
      backgroundColor: "rgba(139,92,246,0.06)",
      justifyContent: "center",
      alignItems: "center",
    },
    newsTextWrap: { flex: 1 },
    newsTitleText: { color: "#fff", fontWeight: "800", fontSize: 15 },
    newsBodyText: { color: "#bfc7df", marginTop: 4, fontSize: 13 },
    newsTimeText: { color: "#9FA8C7", marginTop: 8, fontSize: 11 },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#060B1A",
    },
    bannerCard: {
      marginTop: 8,
      backgroundColor: "#0f1113",
      borderRadius: 12,
      padding: 18,
      alignItems: "center",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.03)",
    },
  });

  /* ---------- types ---------- */
  interface MiningData {
    miningActive: boolean;
    balance: number;
    lastStart?: number;
  }

  interface NewsItem {
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
    timestamp?: number;
  }

  /* ---------- state ---------- */
  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningActive = miningData?.miningActive ?? false;
  const balanceBase = miningData?.balance ?? 0;

  const [boostOpen, setBoostOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  const [sessionBalance, setSessionBalance] = useState(0);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DAY_SECONDS);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const perSecond = miningActive ? DAILY_MAX / DAY_SECONDS : 0;

  /* ============================================================
      Animated Balance
  =============================================================== */
  useEffect(() => {
    const value =
      typeof getLiveBalance === "function" ? getLiveBalance() : balanceBase;

    Animated.timing(animatedBalance, {
      toValue: value,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [balanceBase, getLiveBalance]);

  /* ============================================================
      Session Interval
  =============================================================== */
  const miningDataRef = useRef(miningData);

  useEffect(() => {
    miningDataRef.current = miningData;
  }, [miningData]);

  useEffect(() => {
    let interval: any;

    const calc = () => {
      const md = miningDataRef.current;
      const startMs = md?.lastStart ? Number(md.lastStart) : 0;

      if (md?.miningActive && startMs > 0) {
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        const capped = Math.min(elapsed, DAY_SECONDS);

        setSessionElapsed(capped);
        setSessionBalance(capped * perSecond);
        setTimeLeft(DAY_SECONDS - capped);
      } else {
        setSessionElapsed(0);
        setSessionBalance(0);
        setTimeLeft(DAY_SECONDS);
      }
    };

    calc();
    interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [perSecond]);

  /* ============================================================
      Spin Animation
  =============================================================== */
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!spinAnim.current) {
      spinAnim.current = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        })
      );
    }

    if (miningActive) spinAnim.current.start();
    else {
      spinAnim.current.stop();
      spinValue.setValue(0);
    }

    return () => {
      try {
        spinAnim.current?.stop();
      } catch {}
    };
  }, [miningActive]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  /* ============================================================
      Start / Stop (Supabase Auth)
  =============================================================== */
  const handleStartStop = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/(auth)/login");

    try {
      if (!miningActive) {
        setIsStarting(true);
        await start();
        setIsStarting(false);
      } else {
        await stop();
      }
    } catch {
      setIsStarting(false);
      Alert.alert("Error", "Couldn't toggle mining.");
    }
  };

  /* ============================================================
      Claim Rewards (Supabase Auth)
  =============================================================== */
  const handleClaim = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/(auth)/login");

    try {
      setIsClaiming(true);
      const reward = await claim();
      setIsClaiming(false);

      Alert.alert("Claimed", `${reward?.toFixed(4) ?? 0} VAD`);
    } catch {
      setIsClaiming(false);
      Alert.alert("Error", "Claim failed.");
    }
  };

  /* ============================================================
      News Feed (Supabase Realtime)
  =============================================================== */
  useEffect(() => {
    let mounted = true;

    const loadNews = async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("timestamp", { ascending: false });

      if (!mounted) return;
      if (error) return setNews([]);

      setNews(data || []);
    };

    loadNews();

    const channel = supabase
      .channel("news-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "news" },
        () => loadNews()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  /* ============================================================
      Loading UI
  =============================================================== */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  /* ============================================================
      Animated Balance Component
  =============================================================== */
  const AnimatedBalance = () => {
    const [val, setVal] = useState(0);

    useEffect(() => {
      const id = animatedBalance.addListener(({ value }) =>
        setVal(Number(value))
      );
      return () => animatedBalance.removeListener(id);
    }, []);

    return (
      <MotiText
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 360 }}
        style={styles.balance}
      >
        {val.toFixed(4)} <Text style={styles.vadText}>VAD</Text>
      </MotiText>
    );
  };

  const progress = useMemo(
    () => (miningActive ? Math.min(1, sessionElapsed / DAY_SECONDS) : 0),
    [miningActive, sessionElapsed]
  );

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  /* ============================================================
      RENDER UI
  =============================================================== */
  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
          <View style={styles.profileCircle}>
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={22} color="#fff" />
            )}
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/(tabs)/explore")}>
          <View style={styles.chatCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          </View>
        </Pressable>
      </View>

      {/* Main Scroll */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Header */}
        <LinearGradient colors={["#22163a", "#0e0916"]} style={styles.headerCard}>
          <MotiText style={styles.headerTitle}>VAD Mining</MotiText>
          <Text style={styles.headerSub}>Earn up to {DAILY_MAX} VAD every 24 hours</Text>
        </LinearGradient>

        {/* Balance */}
        <View style={styles.currentWrap}>
          <Text style={styles.currentLabel}>Current Balance</Text>
          <AnimatedBalance />
        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          <Pressable
            onPress={handleStartStop}
            style={({ pressed }) => [
              styles.halfBtn,
              miningActive ? styles.miningActiveBtn : styles.startBtn,
              { opacity: pressed ? 0.92 : 1 },
            ]}
            disabled={isStarting}
          >
            <View style={styles.btnInner}>
              <MaterialIcons
                name={miningActive ? "pause-circle" : "play-circle-fill"}
                size={26}
                color="#fff"
              />
              <Text style={styles.btnText}>
                {miningActive ? "Mine Active" : "Start Mine"}
              </Text>
              <Text style={styles.smallTimer}>
                {miningActive ? formatTime(timeLeft) : ""}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleClaim}
            style={({ pressed }) => [
              styles.halfBtn,
              styles.claimBtn,
              { opacity: pressed ? 0.98 : 1 },
            ]}
            disabled={isClaiming}
          >
            <View style={styles.btnInner}>
              <MaterialIcons name="redeem" size={22} color="#0F0A2A" />
              <Text style={styles.claimBtnText}>Claim Rewards</Text>
              <Text style={styles.claimAmountText}>{balanceBase.toFixed(4)} VAD</Text>
            </View>
          </Pressable>
        </View>

        {/* Session Card */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <View>
              <Text style={styles.sessionLabel}>Session Mining</Text>
              <Text style={styles.sessionValue}>
                {sessionBalance.toFixed(4)} <Text style={styles.vadSmall}>VAD</Text>
              </Text>
            </View>

            <Animated.View style={[styles.miningIcon, { transform: [{ rotate: spin }] }]}>
              <Ionicons name="hardware-chip" size={24} color="#fff" />
            </Animated.View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>{formatTime(timeLeft)} left</Text>
              <Text style={styles.progressText}>{(progress * 100).toFixed(1)}%</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>About VAD mining</Text>
            <Text style={styles.infoBody}>
              Mining accrues continuously while active, up to {DAILY_MAX} VAD per
              24-hour session. Claim anytime to add session rewards to your total
              balance.
            </Text>
          </View>
        </View>

        {/* Utilities */}
        <View style={styles.utilityRow}>
          <Pressable style={styles.utilityItem} onPress={() => setDailyOpen(true)}>
            <Text style={{ color: "#fff" }}>Daily Claim</Text>
          </Pressable>
          <Pressable style={styles.utilityItem} onPress={() => setBoostOpen(true)}>
            <Text style={{ color: "#fff" }}>Boost</Text>
          </Pressable>
          <Pressable style={styles.utilityItem} onPress={() => setWatchOpen(true)}>
            <Text style={{ color: "#fff" }}>Watch & Earn</Text>
          </Pressable>
        </View>

        {/* News */}
        <View style={styles.newsSection}>
          <Text style={styles.newsHeader}>News & Updates</Text>

          {news.length === 0 ? (
            <View style={styles.newsEmptyCard}>
              <Text style={styles.newsEmptyText}>
                No recent updates — check back soon.
              </Text>
            </View>
          ) : (
            news.map((n) => (
              <View key={n.id} style={styles.newsCardItem}>
                {n.image ? (
                  <Image source={{ uri: n.image }} style={styles.newsImage} />
                ) : (
                  <View style={styles.newsImagePlaceholder}>
                    <Ionicons name="newspaper-outline" size={22} color="#8b8fb2" />
                  </View>
                )}

                <View style={styles.newsTextWrap}>
                  <Text style={styles.newsTitleText}>{n.title}</Text>

                  {n.subtitle && (
                    <Text style={styles.newsBodyText} numberOfLines={2}>
                      {n.subtitle}
                    </Text>
                  )}

                  <Text style={styles.newsTimeText}>
                    {n.timestamp ? timeAgoFromUnix(Number(n.timestamp)) : ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: Platform.OS === "ios" ? 160 : 140 }} />
      </ScrollView>

      {/* Banner */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          zIndex: 50,
        }}
      >
        <View style={styles.bannerCard}>
          <AdBanner />
        </View>
      </View>

      {/* Modals */}
      {dailyOpen && (
        <DailyClaim visible={dailyOpen} onClose={() => setDailyOpen(false)} />
      )}
      {boostOpen && (
        <Boost visible={boostOpen} onClose={() => setBoostOpen(false)} />
      )}
      {watchOpen && (
        <WatchEarn visible={watchOpen} onClose={() => setWatchOpen(false)} />
      )}
    </View>
  );
}

/* ============================================================
   Helper: Time Ago
=============================================================== */
function timeAgoFromUnix(ts: number) {
  if (!ts || Number.isNaN(Number(ts))) return "";
  const t = ts > 1e12 ? ts : ts * 1000;
  const diff = Math.floor((Date.now() - t) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

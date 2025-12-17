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
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
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
const { width } = Dimensions.get("window");

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
  const perSecond = miningActive ? DAILY_MAX / DAY_SECONDS : 0;

  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningDataRef = useRef(miningData);
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [sessionBalance, setSessionBalance] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DAY_SECONDS);

  const [dailyOpen, setDailyOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);

  const progress = useMemo(
    () => (miningActive ? Math.min(1, sessionElapsed / DAY_SECONDS) : 0),
    [miningActive, sessionElapsed]
  );

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
  }, [balanceBase, getLiveBalance, animatedBalance]);

  useEffect(() => {
    const tick = () => {
      const md = miningDataRef.current;
      const startMs = md?.lastStart
        ? new Date(md.lastStart).getTime()
        : 0;

      if (md?.miningActive && startMs > 0) {
        const elapsed = Math.min(
          Math.floor((Date.now() - startMs) / 1000),
          DAY_SECONDS
        );

        setSessionElapsed(elapsed);
        setSessionBalance(elapsed * perSecond);
        setTimeLeft(DAY_SECONDS - elapsed);
      } else {
        setSessionElapsed(0);
        setSessionBalance(0);
        setTimeLeft(DAY_SECONDS);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [perSecond]);

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

    return () => spinAnim.current?.stop();
  }, [miningActive, spinValue]);

  /* ============================================================
     ACTIONS
  =============================================================== */

  const requireAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/(auth)/login");
      return false;
    }
    return true;
  };

  const handleStartStop = async () => {
    if (!(await requireAuth())) return;

    try {
      setIsStarting(true);
      if (!miningActive) await start();
      else await stop();
    } catch {
      Alert.alert("Error", "Unable to update mining state.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleClaim = async () => {
    if (!(await requireAuth())) return;
    if (!miningActive) {
      Alert.alert("Nothing to claim", "Start mining first.");
      return;
    }

    try {
      setIsClaiming(true);
      const reward = await claim();
      Alert.alert("Claimed", `${reward.toFixed(4)} VAD`);
    } catch {
      Alert.alert("Error", "Claim failed.");
    } finally {
      setIsClaiming(false);
    }
  };

  /* ============================================================
     RENDER
  =============================================================== */

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

  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
          <View style={styles.avatarCircle}>
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={22} color="#fff" />
            )}
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/(tabs)/explore")}>
          <View style={styles.avatarCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={["#22163a", "#0e0916"]} style={styles.header}>
          <Text style={styles.headerTitle}>VAD Mining</Text>
          <Text style={styles.headerSub}>
            Earn up to {DAILY_MAX} VAD every 24 hours
          </Text>
        </LinearGradient>

        <View style={styles.balanceWrap}>
          <Text style={styles.label}>Total Balance</Text>
          <AnimatedBalance animatedValue={animatedBalance} />
        </View>

        <View style={styles.buttonsRow}>
          <Pressable
            onPress={handleStartStop}
            disabled={isStarting || isLoading}
            style={[
              styles.actionBtn,
              miningActive ? styles.activeBtn : styles.startBtn,
            ]}
          >
            <MaterialIcons
              name={miningActive ? "pause-circle" : "play-circle-fill"}
              size={28}
              color="#fff"
            />
            <Text style={styles.btnText}>
              {miningActive ? "Mining Active" : "Start Mining"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClaim}
            disabled={isClaiming}
            style={[styles.actionBtn, styles.claimBtn]}
          >
            <MaterialIcons name="redeem" size={24} color="#0F0A2A" />
            <Text style={styles.claimText}>
              {sessionBalance.toFixed(4)} VAD
            </Text>
          </Pressable>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Session Mining</Text>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="hardware-chip" size={26} color="#8B5CF6" />
            </Animated.View>
          </View>

          <Text style={styles.sessionValue}>
            {sessionBalance.toFixed(4)} VAD
          </Text>

          <View style={styles.progressBg}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>

          <Text style={styles.progressMeta}>
            {Math.floor(timeLeft / 3600)}h{" "}
            {Math.floor((timeLeft % 3600) / 60)}m remaining
          </Text>
        </View>

        {/* Utilities */}
        <View style={styles.utilityRow}>
          <Utility icon="calendar-check" label="Daily" onPress={() => setDailyOpen(true)} />
          <Utility icon="bolt" label="Boost" onPress={() => setBoostOpen(true)} />
          <Utility icon="play-circle" label="Watch" onPress={() => setWatchOpen(true)} />
        </View>
      </ScrollView>

      <View style={styles.bannerWrap}>
        <AdBanner />
      </View>

      {dailyOpen && <DailyClaim visible onClose={() => setDailyOpen(false)} />}
      {boostOpen && <Boost visible onClose={() => setBoostOpen(false)} />}
      {watchOpen && <WatchEarn visible onClose={() => setWatchOpen(false)} />}
    </View>
  );
}

/* ============================================================
   UTILITY BUTTON
=============================================================== */
function Utility({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.utilityBtn} onPress={onPress}>
      <FontAwesome5 name={icon as any} size={18} color="#8B5CF6" />
      <Text style={styles.utilityText}>{label}</Text>
    </Pressable>
  );
}

/* ============================================================
   STYLES
=============================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#060B1A" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  topNav: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  scroll: { paddingHorizontal: 22, paddingTop: 84 },
  header: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerSub: { color: "#bfc7df", marginTop: 4 },
  balanceWrap: { marginBottom: 16 },
  label: { color: "#9FA8C7", marginBottom: 6 },
  balance: { fontSize: 42, color: "#fff", fontWeight: "900" },
  vadText: { fontSize: 18, color: "#8B5CF6" },
  buttonsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  startBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  activeBtn: {
    backgroundColor: "rgba(139,92,246,0.18)",
  },
  claimBtn: {
    backgroundColor: "#fff",
  },
  btnText: { color: "#fff", marginTop: 6, fontWeight: "800" },
  claimText: { marginTop: 6, color: "#0F0A2A", fontWeight: "900" },
  sessionCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionTitle: { color: "#9FA8C7" },
  sessionValue: { fontSize: 28, color: "#fff", fontWeight: "900", marginTop: 8 },
  progressBg: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: 10, backgroundColor: "#8B5CF6" },
  progressMeta: { marginTop: 8, color: "#9FA8C7", fontSize: 12 },
  utilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  utilityBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginHorizontal: 4,
  },
  utilityText: { color: "#fff", marginTop: 6, fontWeight: "700" },
  bannerWrap: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});

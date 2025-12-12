// app/(tabs)/profile.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../../supabase/client";
import { getUserData } from "../../services/user";

export default function Profile() {
  return <ProfileScreen />;
}

function ProfileScreen() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  const fade = useRef(new Animated.Value(0)).current;

  /* ---------- Fade animation ---------- */
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  /* -------------------------------------------------
      🔥 Load Supabase Auth & Set UID
  -------------------------------------------------- */
  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      setUid(user?.id ?? null);
    })();
  }, []);

  /* -------------------------------------------------
      🔥 Fetch User Data From Supabase
      (NO REALTIME — Supabase has no onSnapshot)
  -------------------------------------------------- */
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      const response = await getUserData(uid);
      if (active) {
        setData(response);
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [uid]);

  /* ---------- No user ---------- */
  if (!uid) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff", fontSize: 18 }}>
          User not logged in.
        </Text>
      </View>
    );
  }

  /* ---------- Loading ---------- */
  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  /* -------------------------------------------------
      🔥 Safe Supabase Data Mapping
  -------------------------------------------------- */
  const profile = data.profile ?? {};
  const mining = data.mining ?? {};
  const referrals = data.referrals ?? {};
  const dailyClaim = data.dailyClaim ?? {};
  const boost = data.boost ?? {};
  const watchEarn = data.watchEarn ?? {};

  const username = profile.username || "Unknown User";
  const referralCode = profile.referral_code || "";
  const referredBy = profile.referred_by || "Not referred";

  const miningBalance = mining.balance ?? 0;
  const dailyTotal = dailyClaim.total_earned ?? 0;
  const boostBalance = boost.balance ?? 0;
  const watchEarnTotal = watchEarn.total_earned ?? 0;
  const totalReferrals = referrals.total_referred ?? 0;

  const totalEarned =
    miningBalance + dailyTotal + boostBalance + watchEarnTotal;

  /* ---------- Copy ---------- */
  const copyCode = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    Alert.alert("Copied!", "Referral code copied to clipboard.");
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>My Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={70} color="#8B5CF6" />
        </View>

        {/* Username */}
        <Card label="Username" value={username} />

        {/* Total Balance */}
        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>Total VAD Balance</Text>
          <Text style={styles.mainValue}>{totalEarned.toFixed(4)} VAD</Text>
        </View>

        {/* Stats */}
        <View style={styles.grid}>
          <StatCard title="Mining" value={miningBalance} icon="hardware-chip" />
          <StatCard title="Daily" value={dailyTotal} icon="calendar" />
          <StatCard title="Boost" value={boostBalance} icon="flash" />
          <StatCard title="Watch" value={watchEarnTotal} icon="play-circle" />
        </View>

        {/* Referral Code */}
        <View style={styles.card}>
          <Text style={styles.label}>Your Referral Code</Text>
          <View style={styles.refRow}>
            <Text style={styles.refText}>{referralCode}</Text>
            <Pressable onPress={copyCode} style={styles.copyBtn}>
              <Text style={styles.copyText}>COPY</Text>
            </Pressable>
          </View>
        </View>

        {/* Referred By */}
        <Card label="Referred By" value={referredBy} />

        {/* Referral Count */}
        <View style={styles.refCard}>
          <Ionicons name="people" size={28} color="#34D399" />
          <View>
            <Text style={styles.refTitle}>Your Referrals</Text>
            <Text style={styles.refValue}>{totalReferrals} Users</Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

/* ---------- Components ---------- */

function Card({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={26} color="#A78BFA" />
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value.toFixed(4)} VAD</Text>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050814",
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050814",
  },
  pageTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },
  avatarBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#8B5CF6",
    marginBottom: 20,
  },
  mainCard: {
    backgroundColor: "#0B1020",
    padding: 26,
    borderRadius: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22C55E66",
    marginBottom: 16,
  },
  mainLabel: {
    color: "#9FA8C7",
    fontSize: 13,
  },
  mainValue: {
    color: "#22C55E",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#0B1020",
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  statTitle: {
    color: "#9FA8C7",
    fontSize: 12,
    marginTop: 6,
  },
  statValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#0B1020",
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  label: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  value: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  refText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  copyBtn: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  refCard: {
    marginTop: 20,
    backgroundColor: "rgba(52,211,153,0.12)",
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#22C55E55",
  },
  refTitle: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  refValue: {
    color: "#22C55E",
    fontSize: 20,
    fontWeight: "900",
  },
});

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
import { auth, db } from "../../firebase/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import * as Clipboard from "expo-clipboard";

/* ---------- Expo Router Wrapper (DEFAULT EXPORT) ---------- */
export default function Profile() {
  return <ProfileScreen />;
}

/* ---------- Actual Screen Implementation ---------- */
function ProfileScreen() {
  const uid = auth.currentUser?.uid;

  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referredBy, setReferredBy] = useState<string | null>(null);

  const [miningBalance, setMiningBalance] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [boostBalance, setBoostBalance] = useState(0);
  const [watchEarnTotal, setWatchEarnTotal] = useState(0);
  const [referrals, setReferrals] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;

  /* ---------- Page Animation ---------- */
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  /* ---------- Firebase Live Listener ---------- */
  useEffect(() => {
    if (!uid) return;

    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      setUsername(data.username || "");
      setReferralCode(data.referralCode || "");
      setReferredBy(data.referredBy || null);

      setMiningBalance(data.mining?.balance || 0);
      setDailyTotal(data.dailyClaim?.totalEarned || 0);
      setBoostBalance(data.boost?.balance || 0);
      setWatchEarnTotal(data.watchEarn?.totalEarned || 0);
      setReferrals(data.referrals?.totalReferred || 0);
    });

    return () => unsub();
  }, [uid]);

  const totalEarned =
    miningBalance + dailyTotal + boostBalance + watchEarnTotal;

  /* ---------- Copy Referral Code ---------- */
  const copyCode = async () => {
    if (!referralCode) return;

    await Clipboard.setStringAsync(referralCode);

    Alert.alert("Copied!", "Referral code copied to clipboard.");
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Your Profile</Text>

        {/* AVATAR */}
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={70} color="#8B5CF6" />
        </View>

        {/* USERNAME */}
        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{username}</Text>
        </View>

        {/* TOTAL BALANCE */}
        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>Total VAD Balance</Text>
          <Text style={styles.mainValue}>{totalEarned.toFixed(4)} VAD</Text>
        </View>

        {/* STATS GRID */}
        <View style={styles.grid}>
          <StatCard title="Mining" value={miningBalance} icon="hardware-chip" />
          <StatCard title="Daily" value={dailyTotal} icon="calendar" />
          <StatCard title="Boost" value={boostBalance} icon="flash" />
          <StatCard title="Watch" value={watchEarnTotal} icon="play-circle" />
        </View>

        {/* REFERRAL CODE */}
        <View style={styles.card}>
          <Text style={styles.label}>Your Referral Code</Text>
          <View style={styles.refRow}>
            <Text style={styles.refText}>{referralCode}</Text>
            <Pressable onPress={copyCode} style={styles.copyBtn}>
              <Text style={styles.copyText}>COPY</Text>
            </Pressable>
          </View>
        </View>

        {/* REFERRED BY */}
        <View style={styles.card}>
          <Text style={styles.label}>Referred By</Text>
          <Text style={styles.value}>{referredBy || "Not referred"}</Text>
        </View>

        {/* REFERRAL COUNT */}
        <View style={styles.refCard}>
          <Ionicons name="people" size={28} color="#34D399" />
          <View>
            <Text style={styles.refTitle}>Your Referrals</Text>
            <Text style={styles.refValue}>{referrals} Users</Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

/* ---------- Reusable Statistic Card ---------- */
function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: any;
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

// app/(tabs)/profile.tsx

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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../../supabase/client";
import { getUserData } from "../../services/user";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile() {
  return <ProfileScreen />;
}

function ProfileScreen() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  /* ---------- Fade animation ---------- */
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  /* ---------- Auth ---------- */
  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      setUid(authData?.user?.id ?? null);
    })();
  }, []);


  const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    Alert.alert("Error", error.message);
    return;
  }

  Alert.alert("Logged out", "You have been logged out successfully.");
};


  /* ---------- Fetch data ---------- */
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

  if (!uid) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff" }}>User not logged in.</Text>
      </View>
    );
  }

  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  /* ---------- Safe mapping ---------- */
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

  const copyCode = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    Alert.alert("Copied", "Referral code copied");
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarBox}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={64} color="#8B5CF6" />
            )}
          </View>
          <Text style={styles.username}>{username}</Text>
        </View>

        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>{totalEarned.toFixed(4)} VAD</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard title="Mining" value={miningBalance} icon="hardware-chip" />
          <StatCard title="Daily" value={dailyTotal} icon="calendar" />
          <StatCard title="Boost" value={boostBalance} icon="flash" />
          <StatCard title="Watch" value={watchEarnTotal} icon="play-circle" />
        </View>

        {/* Referral */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your Referral Code</Text>
          <View style={styles.refRow}>
            <Text style={styles.refCode}>{referralCode}</Text>
            <Pressable onPress={copyCode} style={styles.copyBtn}>
              <Ionicons name="copy" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.dualCard}>
          <InfoCard label="Referred By" value={referredBy} />
          <InfoCard label="Your Referrals" value={`${totalReferrals}`} />
        </View>

        {/* Logout */}
<Pressable style={styles.logoutBtn} onPress={handleLogout}>
  <Ionicons name="log-out-outline" size={20} color="#fff" />
  <Text style={styles.logoutText}>Logout</Text>
</Pressable>

      </ScrollView>
    </Animated.View>
  );
}

/* ---------- Components ---------- */

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
      <Ionicons name={icon} size={22} color="#A78BFA" />
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value.toFixed(4)}</Text>
    </View>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050814",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050814",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarBox: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#8B5CF6",
    marginBottom: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  username: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  balanceCard: {
    backgroundColor: "#0B1020",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22C55E55",
    marginBottom: 18,
  },
  balanceLabel: {
    color: "#9FA8C7",
    fontSize: 13,
  },
  balanceValue: {
    color: "#22C55E",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#0B1020",
    borderRadius: 20,
    padding: 16,
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
    marginTop: 18,
    backgroundColor: "#0B1020",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  cardLabel: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  refRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refCode: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  copyBtn: {
    backgroundColor: "#8B5CF6",
    padding: 8,
    borderRadius: 10,
  },
  dualCard: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#0B1020",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  infoLabel: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  infoValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },

  logoutBtn: {
  marginTop: 28,
  marginBottom: 20,
  backgroundColor: "#7C2D12",
  borderRadius: 18,
  paddingVertical: 14,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  borderWidth: 1,
  borderColor: "#EF444455",
},
logoutText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "900",
},

});

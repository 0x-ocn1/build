import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { useRouter } from "expo-router";

export default function Profile() {
  return <ProfileScreen />;
}

function ProfileScreen() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);

  const fade = useRef(new Animated.Value(0)).current;

  /* ---------- Fade animation ---------- */
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  /* ---------- Auth ---------- */
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUid(data?.user?.id ?? null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Fetch user data ---------- */
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await getUserData(uid);
        if (active) setData(response);
      } catch (e) {
        console.error("Profile load error:", e);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [uid]);

  /* ---------- Logout ---------- */
  const handleLogout = useCallback(() => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }, []);

  /* ---------- Guards ---------- */
  if (!uid) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centerText}>User not logged in.</Text>
      </View>
    );
  }

  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centerText}>Loading profile…</Text>
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

  const username = profile.username ?? "Unknown User";
  const referralCode = profile.referral_code ?? "";
  const referredBy = profile.referred_by ?? "—";

  const miningBalance = mining.balance ?? 0;
  const dailyTotal = dailyClaim.total_earned ?? 0;
  const boostBalance = boost.balance ?? 0;
  const watchEarnTotal = watchEarn.total_earned ?? 0;
  const totalReferrals = referrals.total_referred ?? 0;

  const totalEarned =
    miningBalance + dailyTotal + boostBalance + watchEarnTotal;

  /* ---------- Copy referral ---------- */
  const copyCode = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    Alert.alert("Copied", "Referral code copied.");
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={44} color="#A78BFA" />
          </View>
          <Text style={styles.username}>{username}</Text>
        </View>

        {/* Total Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total VAD Balance</Text>
          <Text style={styles.balanceValue}>
            {totalEarned.toFixed(4)} VAD
          </Text>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.grid}>
          <Stat icon="hardware-chip" label="Mining" value={miningBalance} />
          <Stat icon="calendar" label="Daily" value={dailyTotal} />
          <Stat icon="flash" label="Boost" value={boostBalance} />
          <Stat icon="play-circle" label="Watch" value={watchEarnTotal} />
        </View>

        {/* Referral Code */}
        <Section title="Referral Code" icon="gift">
          <View style={styles.row}>
            <Text style={styles.refCode}>{referralCode}</Text>
            <Pressable onPress={copyCode} style={styles.copyBtn}>
              <Ionicons name="copy" size={16} color="#000" />
            </Pressable>
          </View>
        </Section>

        {/* Referral Info */}
        <Section title="Referral Stats" icon="people">
          <InfoRow label="Referred By" value={referredBy} />
          <InfoRow
            label="Total Referrals"
            value={`${totalReferrals} users`}
          />
        </Section>

        {/* Logout */}
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

/* ---------- Small Components ---------- */

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color="#A78BFA" />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value.toFixed(4)}</Text>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color="#9FA8C7" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // ✅ prevents bottom tab overlap
  },
  centered: {
    flex: 1,
    backgroundColor: "#050814",
    justifyContent: "center",
    alignItems: "center",
  },
  centerText: {
    color: "#fff",
    fontSize: 16,
  },
  header: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(167,139,250,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A78BFA",
  },
  username: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  balanceCard: {
    backgroundColor: "#0B1020",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22C55E55",
    marginBottom: 18,
  },
  balanceLabel: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  balanceValue: {
    color: "#22C55E",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#0B1020",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  statLabel: {
    color: "#9FA8C7",
    fontSize: 12,
    marginTop: 6,
  },
  statValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  section: {
    backgroundColor: "#0B1020",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#9FA8C7",
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refCode: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  copyBtn: {
    backgroundColor: "#FACC15",
    padding: 8,
    borderRadius: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  infoLabel: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  logoutBtn: {
    marginTop: 10,
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});

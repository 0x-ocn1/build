// app/(tabs)/index.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { MotiView } from "moti";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig"; // verify path
import { doc, getDoc } from "firebase/firestore";

import { startMining, stopMining, claimMiningRewards } from "../../firebase/mining";

import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function MiningDashboard() {
  const router = useRouter();
  const [miningData, setMiningData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referralBonus, setReferralBonus] = useState(0);
  const [mining, setMining] = useState(false);
  const [balance, setBalance] = useState(0);
  const [accumulationRate, setAccumulationRate] = useState({ perSecond: 0, perMinute: 0, perHour: 0 });

  // Animated number for balance
  const animatedBalance = useRef(new Animated.Value(0)).current;

  // Animated halo for header
  const haloSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedBalance, {
      toValue: balance,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [balance, animatedBalance]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(haloSpin, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();
  }, [haloSpin]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // when typed routes are strict, route helpers get picky: cast avoids compile-time errors
        router.replace("/auth/register" as unknown as any);
        return;
      }

      // Fetch user doc
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // User logged in but no Firestore profile yet
        router.replace("/auth/register" as unknown as any);
        return;
      }

      const userData = userSnap.data();

      // Check profile setup (username empty)
      if (!userData.profile || !userData.profile.username) {
        router.replace("/auth/profilesetup" as unknown as any);
        return;
      }

      // Everything valid → continue original dashboard logic
      try {
        const miningRef = doc(db, "miningData", user.uid);
        const miningSnap = await getDoc(miningRef);
        const miningData = miningSnap.data();

        if (!miningData) {
          Alert.alert("No Mining Data", "We couldn't find mining data for your account.");
          setIsLoading(false);
          return;
        }

        setUserProfile(userData);
        setMiningData(miningData);
        setBalance(miningData.balance || 0);

        setAccumulationRate({
          perSecond: ((miningData.ratePerHour ?? (miningData.balance || 0)) / 3600) || 0,
          perMinute: ((miningData.ratePerHour ?? (miningData.balance || 0)) / 60) || 0,
          perHour: miningData.ratePerHour ?? (miningData.balance || 0),
        });

        if (userData.profile.referredBy) {
          const referrerRef = doc(db, "users", userData.profile.referredBy);
          const refSnap = await getDoc(referrerRef);

          if (refSnap.exists()) {
            const referrerData = refSnap.data();
            setReferralBonus((referrerData?.referrals?.totalReferred || 0) * 0.1);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleStartStopMining = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login" as unknown as any);
      return;
    }

    try {
      if (mining) {
        await stopMining(user.uid);
        setMining(false);
      } else {
        await startMining(user.uid);
        setMining(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Couldn't toggle mining. Try again.");
    }
  };

  const handleClaimRewards = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login" as unknown as any);
      return;
    }

    try {
      const reward = await claimMiningRewards(user.uid);
      if (typeof reward === "number") {
        setBalance((prev) => prev + reward);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Claim failed. Try again later.");
    }
  };

  // Animated balance display component
  const AnimatedBalance = () => {
    const [val, setVal] = useState(balance);

    useEffect(() => {
      const id = animatedBalance.addListener(({ value }) => {
        setVal(Number(value.toFixed(2)));
      });
      return () => animatedBalance.removeListener(id);
    }, [animatedBalance]);

    return (
      <Text style={styles.balance}>
        {val.toFixed(2)} <Text style={styles.vadText}>VAD</Text>
      </Text>
    );
  };

  // animated rotation value for the memory icon
  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (mining) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
  }, [mining, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // header halo style animation
  const haloRotate = haloSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* animated halo background */}
      <Animated.View style={[styles.halo, { transform: [{ rotate: haloRotate }] }]} pointerEvents="none" />

      <LinearGradient
        colors={["rgba(99,102,241,0.12)", "transparent"]}
        style={styles.headerGradient}
        start={[0, 0]}
        end={[1, 0]}
      >
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 550 }}
          style={styles.header}
        >
          <Text style={styles.title}>⛏️ VAD Mining</Text>
          <Text style={styles.subtitle}>Passive rewards, modern experience</Text>
        </MotiView>
      </LinearGradient>

      <MotiView
        from={{ opacity: 0, translateY: 20, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: "spring", damping: 14, stiffness: 120 }}
        style={styles.card}
      >
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.cardLabel}>Current Balance</Text>
            <AnimatedBalance />
          </View>

          <MotiView
            from={{ rotate: "0deg" }}
            animate={{ rotate: mining ? "360deg" : "0deg" }}
            transition={{ loop: mining, type: "timing", duration: 3500 }}
            style={styles.pulse}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialIcons name="memory" size={28} color="white" />
            </Animated.View>
          </MotiView>
        </View>

        <View style={styles.rateRow}>
          <View style={styles.rateBox}>
            <Text style={styles.rateLabel}>/sec</Text>
            <Text style={styles.rateValue}>{accumulationRate.perSecond.toFixed(4)}</Text>
          </View>
          <View style={styles.rateBox}>
            <Text style={styles.rateLabel}>/min</Text>
            <Text style={styles.rateValue}>{accumulationRate.perMinute.toFixed(3)}</Text>
          </View>
          <View style={styles.rateBox}>
            <Text style={styles.rateLabel}>/hour</Text>
            <Text style={styles.rateValue}>{accumulationRate.perHour.toFixed(2)}</Text>
          </View>
        </View>
      </MotiView>

      {referralBonus > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 350 }}
          style={styles.bonusCard}
        >
          <Text style={styles.bonusLabel}>Referral Bonus</Text>
          <Text style={styles.bonusAmount}>+{referralBonus.toFixed(2)} VAD</Text>
        </MotiView>
      )}

      <View style={styles.iconRow}>
        <Pressable
          onPress={() => router.push("/(tabs)/profile" as unknown as any)}
          style={{ flex: 1, marginHorizontal: 6 }}
        >
          {({ pressed }: { pressed: boolean }) => (
            <MotiView
              animate={{ scale: pressed ? 0.96 : 1, opacity: pressed ? 0.95 : 1 }}
              transition={{ type: "spring" }}
              style={styles.iconButton}
            >
              <MaterialIcons name="account-circle" size={26} color="#4B5563" />
              <Text style={styles.iconLabel}>Profile</Text>
            </MotiView>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/explore" as unknown as any)}
          style={{ flex: 1, marginHorizontal: 6 }}
        >
          {({ pressed }: { pressed: boolean }) => (
            <MotiView
              animate={{ scale: pressed ? 0.96 : 1, opacity: pressed ? 0.95 : 1 }}
              transition={{ type: "spring" }}
              style={styles.iconButton}
            >
              <MaterialIcons name="search" size={26} color="#4B5563" />
              <Text style={styles.iconLabel}>Explore</Text>
            </MotiView>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/login" as unknown as any)} style={{ flex: 1, marginHorizontal: 6 }}>
          {({ pressed }: { pressed: boolean }) => (
            <MotiView
              animate={{ scale: pressed ? 0.96 : 1, opacity: pressed ? 0.95 : 1 }}
              transition={{ type: "spring" }}
              style={styles.iconButton}
            >
              <MaterialIcons name="logout" size={26} color="#4B5563" />
              <Text style={styles.iconLabel}>Sign Out</Text>
            </MotiView>
          )}
        </Pressable>
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        style={styles.controls}
      >
        <Pressable onPress={handleStartStopMining} style={{ width: "100%" }}>
          {({ pressed }: { pressed: boolean }) => (
            <MotiView
              animate={{ scale: pressed ? 0.98 : 1 }}
              transition={{ type: "spring" }}
              style={[styles.mainButton, mining ? styles.stopButton : styles.startButton]}
            >
              <MaterialIcons
                name={mining ? "pause-circle-filled" : "play-circle-filled"}
                size={20}
                color="white"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.mainButtonText}>{mining ? "Stop Mining" : "Start Mining"}</Text>
            </MotiView>
          )}
        </Pressable>

        <Pressable onPress={handleClaimRewards} style={{ marginTop: 10 }}>
          {({ pressed }: { pressed: boolean }) => (
            <MotiView
              animate={{ scale: pressed ? 0.98 : 1 }}
              transition={{ type: "spring" }}
              style={styles.claimButton}
            >
              <MaterialIcons name="attach-money" size={18} color="#111827" />
              <Text style={styles.claimText}>Claim Rewards</Text>
            </MotiView>
          )}
        </Pressable>
      </MotiView>

      <View style={{ height: 48 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
    paddingTop: 40,
  },
  halo: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(99,102,241,0.06)",
    top: -200,
    left: -80,
    zIndex: 0,
  },
  headerGradient: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
    zIndex: 2,
  },
  header: {
    marginBottom: 6,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#94A3B8",
    marginTop: 6,
    fontSize: 13,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    zIndex: 3,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 8,
  },
  balance: {
    color: "#F8FAFC",
    fontSize: 36,
    fontWeight: "800",
  },
  vadText: {
    color: "#8B5CF6",
    fontSize: 18,
    fontWeight: "700",
  },
  pulse: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  rateRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rateBox: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    alignItems: "center",
  },
  rateLabel: {
    color: "#94A3B8",
    fontSize: 11,
  },
  rateValue: {
    color: "#E6EEF8",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  bonusCard: {
    backgroundColor: "rgba(99,102,241,0.08)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.12)",
    zIndex: 3,
  },
  bonusLabel: {
    color: "#C7D2FE",
    fontSize: 12,
  },
  bonusAmount: {
    color: "#A78BFA",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 18,
    zIndex: 3,
  },
  iconButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
    // marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 6,
  },
  controls: {
    width: "100%",
    alignItems: "center",
    zIndex: 3,
  },
  mainButton: {
    width: Math.min(width - 40, 520),
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  stopButton: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  mainButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  claimButton: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  claimText: {
    color: "#111827",
    fontWeight: "700",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
});

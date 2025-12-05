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
import { MotiView, MotiText } from "moti";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../../firebase/firebaseConfig";
import { useMining } from "../../hooks/useMining";

const { width } = Dimensions.get("window");

export default function MiningDashboard() {
  const router = useRouter();
  const { miningData, userProfile, isLoading, start, stop, claim, getLiveBalance } =
    useMining();

  const animatedBalance = useRef(new Animated.Value(0)).current;
  const miningActive = miningData?.miningActive ?? false;
  const balanceBase = miningData?.balance ?? 0;

  useEffect(() => {
    const toVal = Number(getLiveBalance() ?? balanceBase);
    Animated.timing(animatedBalance, {
      toValue: toVal,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [getLiveBalance, balanceBase]);

  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (miningActive) {
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
  }, [miningActive]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleStartStop = async () => {
    const user = auth.currentUser;
    if (!user) return router.push("/auth/login" as any);

    try {
      miningActive ? await stop() : await start();
    } catch (err) {
      Alert.alert("Error", "Couldn't toggle mining.");
    }
  };

  const handleClaim = async () => {
    const user = auth.currentUser;
    if (!user) return router.push("/auth/login" as any);

    try {
      const reward = await claim();
      Alert.alert("Claimed", `${reward?.toFixed(4) ?? 0} VAD`);
    } catch (err) {
      Alert.alert("Error", "Claim failed.");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const AnimatedBalance = () => {
    const [val, setVal] = useState(0);
    useEffect(() => {
      const id = animatedBalance.addListener(({ value }) => {
        setVal(Number(value));
      });
      return () => animatedBalance.removeListener(id);
    }, []);

    return (
      <MotiText
        from={{ opacity: 0, translateY: 6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 400 }}
        style={styles.balance}
      >
        {val.toFixed(4)} <Text style={styles.vadText}>VAD</Text>
      </MotiText>
    );
  };

  const perSecond = miningActive ? 4.8 / (24 * 3600) : 0;
  const perMinute = perSecond * 60;
  const perHour = perMinute * 60;

  return (
    <View style={styles.screen}>
      {/* FLOATING SIDE NAV */}
      <MotiView
        from={{ opacity: 0, translateX: 40 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: "timing", duration: 600 }}
        style={styles.floatingDock}
      >
        {/* EXPLORE (Marketplace) */}
        <Pressable onPress={() => router.push("/(tabs)/explore")}>
          {({ pressed }) => (
            <View
              style={[
                styles.dockBtn,
                { backgroundColor: pressed ? "#6D28D9" : "#8B5CF6" },
              ]}
            >
              <Ionicons name="storefront-outline" size={26} color="#fff" />
            </View>
          )}
        </Pressable>

        {/* PROFILE */}
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
          {({ pressed }) => (
            <View
              style={[
                styles.dockBtn,
                { backgroundColor: pressed ? "#6D28D9" : "#8B5CF6" },
              ]}
            >
              <Ionicons name="person-circle-outline" size={28} color="#fff" />
            </View>
          )}
        </Pressable>
      </MotiView>

      {/* HEADER CARD */}
      <LinearGradient colors={["#2D1E69", "#0F0A2A"]} style={styles.headerCard}>
        <MotiText style={styles.headerTitle}>VAD Mining</MotiText>
        <Text style={styles.headerSubtitle}>
          Earn up to 4.8 VAD every 24 hours
        </Text>
      </LinearGradient>

      {/* BALANCE CARD */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 600 }}
        style={styles.glassCard}
      >
        <View style={styles.balanceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Your Balance</Text>
            <AnimatedBalance />
          </View>

          <Animated.View style={[styles.miningIcon, { transform: [{ rotate: spin }] }]}>
            <Ionicons name="hardware-chip" size={30} color="#fff" />
          </Animated.View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>/sec</Text>
            <Text style={styles.metricValue}>{perSecond.toFixed(6)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>/min</Text>
            <Text style={styles.metricValue}>{perMinute.toFixed(5)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>/hour</Text>
            <Text style={styles.metricValue}>{perHour.toFixed(4)}</Text>
          </View>
        </View>
      </MotiView>

      {/* CONTROLS */}
      <View style={styles.controls}>
        <Pressable onPress={handleStartStop} style={{ width: "100%" }}>
          {({ pressed }) => (
            <MotiView
              animate={{ scale: pressed ? 0.97 : 1 }}
              style={[
                styles.mainButton,
                miningActive ? styles.stopButton : styles.startButton,
              ]}
            >
              <MaterialIcons
                name={miningActive ? "pause" : "play-arrow"}
                size={22}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.mainButtonText}>
                {miningActive ? "Stop Mining" : "Start Mining"}
              </Text>
            </MotiView>
          )}
        </Pressable>

        <Pressable onPress={handleClaim} style={{ marginTop: 10 }}>
          {({ pressed }) => (
            <MotiView
              animate={{ scale: pressed ? 0.97 : 1 }}
              style={styles.claimButton}
            >
              <MaterialIcons name="redeem" size={20} color="#0F0A2A" />
              <Text style={styles.claimText}>Claim Rewards</Text>
            </MotiView>
          )}
        </Pressable>
      </View>

      <View style={{ height: 60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#060B1A",
    padding: 22,
    paddingTop: 40,
  },

  /* FLOATING SIDE NAV */
  floatingDock: {
    position: "absolute",
    right: 15,
    top: 130,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 28,
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    zIndex: 999,
  },
  dockBtn: {
    width: 48,
    height: 48,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
  },

  headerCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#C8CBEA",
    marginTop: 6,
    fontSize: 14,
  },

  glassCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    marginBottom: 18,
  },

  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardLabel: {
    color: "#9FA8C7",
    fontSize: 13,
    marginBottom: 6,
  },

  balance: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "900",
  },
  vadText: {
    color: "#8B5CF6",
    fontSize: 18,
    fontWeight: "700",
  },

  miningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },

  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  metricBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    width: "30%",
    alignItems: "center",
  },
  metricLabel: {
    color: "#9FA8C7",
    fontSize: 12,
  },
  metricValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  controls: {
    width: "100%",
    marginTop: 10,
  },

  mainButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#10B981",
  },
  stopButton: {
    backgroundColor: "#EF4444",
  },
  mainButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
  },

  claimButton: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  claimText: {
    marginLeft: 6,
    color: "#0F0A2A",
    fontWeight: "800",
    fontSize: 15,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#060B1A",
  },
});

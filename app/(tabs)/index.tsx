import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useState, useEffect } from "react";
import { MotiView } from "moti";
import { MaterialIcons } from "@expo/vector-icons"; // Import iconic icons
import { auth, db } from "../../firebase/firebaseConfig"; // Firebase config import
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Firestore imports
import { startMining, stopMining, claimMiningRewards } from "../../firebase/mining"; // Mining functions

export default function MiningDashboard() {
  const [miningData, setMiningData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referralBonus, setReferralBonus] = useState(0);
  const [mining, setMining] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          const userProfileData = userSnap.data();

          if (!userProfileData) {
            Alert.alert("Error", "No user profile data found.");
            return;
          }

          setUserProfile(userProfileData);

          const miningRef = doc(db, "miningData", auth.currentUser.uid);
          const miningSnap = await getDoc(miningRef);
          const miningData = miningSnap.data();

          if (!miningData) {
            Alert.alert("Error", "No mining data found.");
            return;
          }

          setMiningData(miningData);
          setBalance(miningData.balance);

          if (userProfileData.referredBy) {
            const referrerRef = doc(db, "users", userProfileData.referredBy);
            const refSnap = await getDoc(referrerRef);
            if (refSnap.exists()) {
              const referrerData = refSnap.data();
              setReferralBonus(referrerData.referrals.totalReferred * 0.1);
            }
          }

        } catch (error) {
          Alert.alert("Error", "Failed to fetch mining data.");
          console.error(error);
        }
      }
      setIsLoading(false); // Ensure this runs after all data has been fetched
    };

    fetchData();
  }, []);

  const handleStartStopMining = async () => {
    if (auth.currentUser) {
      if (mining) {
        await stopMining(auth.currentUser.uid);
        setMining(false);
      } else {
        await startMining(auth.currentUser.uid);
        setMining(true);
      }
    }
  };

  const handleClaimRewards = async () => {
    if (auth.currentUser) {
      const reward = await claimMiningRewards(auth.currentUser.uid);
      setBalance(balance + reward); // Update balance with claimed rewards
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={styles.headerText}>⛏️ Mining Dashboard</Text>

      {/* BALANCE CARD */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balance}>
          {balance.toFixed(2)} <Text style={styles.vadText}>VAD</Text>
        </Text>
      </MotiView>

      {/* REFERRAL BONUS */}
      {referralBonus > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400 }}
          style={styles.referralBonusCard}
        >
          <Text style={styles.referralBonusText}>Referral Bonus Earned</Text>
          <Text style={styles.referralBonusAmount}>
            +{referralBonus.toFixed(2)} VAD
          </Text>
        </MotiView>
      )}

      {/* STATUS */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status:{" "}
          <Text style={[styles.statusLabel, { color: mining ? "green" : "red" }]}>
            {mining ? "Mining Active" : "Stopped"}
          </Text>
        </Text>

        {/* Pulse animation when mining */}
        {mining && (
          <MotiView
            from={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{
              loop: true,
              type: "timing",
              duration: 900,
            }}
            style={styles.pulseIndicator}
          />
        )}
      </View>

      {/* START/STOP BUTTON */}
      <TouchableOpacity
        onPress={handleStartStopMining}
        style={[styles.actionButton, { backgroundColor: mining ? "#dc3545" : "#28a745" }]}
        activeOpacity={0.85}
      >
        <MaterialIcons
          name={mining ? "pause-circle-filled" : "play-circle-filled"}
          size={24}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.actionButtonText}>
          {mining ? "Stop Mining" : "Start Mining"}
        </Text>
      </TouchableOpacity>

      {/* CLAIM BUTTON */}
      <TouchableOpacity
        onPress={handleClaimRewards}
        style={styles.claimButton}
        activeOpacity={0.85}
      >
        <MaterialIcons
          name="attach-money"
          size={24}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.claimButtonText}>Claim Rewards</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
   balanceCard: {
    backgroundColor: "#f3f3f3",
    paddingVertical: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderColor: "#ddd",
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  balanceLabel: {
    fontSize: 18,
    color: "#888",
  },
  balance: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#333",
  },
  vadText: {
    color: "#007aff",
  },
  referralBonusCard: {
    backgroundColor: "#d1ecf1",
    paddingVertical: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderColor: "#bee5eb",
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  referralBonusText: {
    fontSize: 18,
    color: "#5bc0de",
  },
  referralBonusAmount: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#007aff",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  statusText: {
    fontSize: 18,
    color: "#333",
  },
  statusLabel: {
    fontWeight: "bold",
    marginLeft: 5,
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "green",
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 20,
    width: "100%",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  claimButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: "#007aff",
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  claimButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  icon: {
    marginRight: 10,
  },
});

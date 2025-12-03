import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet } from "react-native";
import { auth, db } from "../../firebase/firebaseConfig"; // Firebase imports
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Firestore imports
import { MaterialIcons } from "@expo/vector-icons"; // Material Icons

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
  const fetchProfileData = async () => {
    if (auth.currentUser?.uid) {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          Alert.alert("Error", "User profile data not found.");
          return;
        }
        const userData = userSnap.data();

        setUserProfile(userData);
        setUsername(userData?.username || "");
        setAvatar(userData?.avatarUrl || null);

        const miningRef = doc(db, "miningData", auth.currentUser.uid);
        const miningSnap = await getDoc(miningRef);
        if (!miningSnap.exists()) {
          Alert.alert("Error", "Mining data not found.");
          return;
        }
        const miningData = miningSnap.data();
        setBalance(miningData?.balance || 0);
      } catch (error) {
        Alert.alert("Error", "Failed to load profile data");
        console.error(error);
      }
    } else {
      Alert.alert("Error", "User is not logged in.");
    }
  };

  fetchProfileData();
}, []);


  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username is required");
      return;
    }

    try {
      const userRef = doc(db, "users", auth.currentUser?.uid!); // Non-null assertion since we've already checked for uid
      await updateDoc(userRef, {
        username: username.trim(),
        avatarUrl: avatar || null,
      });

      Alert.alert("Success", "Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  return (
    <View style={styles.container}>
      {userProfile ? (
        <>
          <Text style={styles.headerText}>Profile</Text>

          {/* Avatar */}
          <TouchableOpacity onPress={() => {}} style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <MaterialIcons name="person" size={60} color="#007bff" />
            )}
          </TouchableOpacity>

          {/* Username */}
          <Text style={styles.label}>Username</Text>
          {isEditing ? (
            <TextInput
              value={username}
              onChangeText={setUsername}
              style={styles.input}
            />
          ) : (
            <Text style={styles.text}>{username}</Text>
          )}

          {/* Balance */}
          <Text style={styles.label}>Balance</Text>
          <Text style={styles.text}>{balance.toFixed(2)} VAD</Text>

          {/* Referral Code */}
          <Text style={styles.label}>Referral Code</Text>
          <Text style={styles.text}>{userProfile?.referralCode}</Text>

          {/* Referral By */}
          {userProfile?.referredBy && (
            <>
              <Text style={styles.label}>Referred By</Text>
              <Text style={styles.text}>{userProfile?.referredBy}</Text>
            </>
          )}

          {/* Edit or Save Button */}
          <TouchableOpacity
            onPress={isEditing ? handleSaveProfile : handleEditProfile}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{isEditing ? "Save" : "Edit"}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  text: {
    fontSize: 16,
    marginTop: 5,
    color: "#333",
  },
  input: {
    fontSize: 16,
    marginTop: 5,
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    borderColor: "#ddd",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
});

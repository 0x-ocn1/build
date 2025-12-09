// app/auth/profileSetup.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ✅ All Firebase imports come from ONE file
import { auth, db, storage } from "../../firebase/firebaseConfig";

// Firebase helpers
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/* ---------- Expo Router Wrapper (DEFAULT EXPORT) ---------- */
export default function ProfileSetup() {
  return <ProfileSetupScreen />;
}

/* ---------- Actual Screen Implementation ---------- */
function ProfileSetupScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState("");

  const user = auth.currentUser;

  // generate referral code from user id
  const referralCode = user?.uid.slice(0, 8) || "loading";

  // keep the function and imports so you can re-enable later
  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setAvatar(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn("Pick avatar error:", err?.message ?? err);
    }
  };

  const saveProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username is required");
      return;
    }

    let avatarUrl = null;

    try {
      if (avatar) {
        // disabled upload for now — preserved for future enablement
        const imageRef = ref(storage, `avatars/${user?.uid}.jpg`);

        /*
        const img = await fetch(avatar);
        const bytes = await img.blob();

        await uploadBytes(imageRef, bytes);
        avatarUrl = await getDownloadURL(imageRef);
        */
      }

      await setDoc(doc(db, "users", user!.uid), {
        username: username.trim(),
        avatarUrl, // stays null until uploads are enabled
        referralCode,
        referredBy: referredBy.trim() || null,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Profile saved!");
        router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // --- Animations (strong motion) ---
  const titleAnim = useRef(new Animated.Value(0)).current; // 0 -> 1
  const fieldsAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // entrance sequence: title -> fields -> button
    Animated.sequence([
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(fieldsAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleAnim, fieldsAnim, buttonAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          Pick a username and (optionally) a referral code.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: fieldsAnim,
            transform: [
              {
                translateY: fieldsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Avatar placeholder: not clickable for now */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={44} color="#cbd5e1" />
          </View>

          <View style={styles.avatarTextWrap}>
            <Text style={styles.avatarTitle}>Profile picture</Text>
            <Text style={styles.avatarSubtitle}>
              Avatar upload is disabled for now.
            </Text>
          </View>
        </View>

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Choose a username"
          placeholderTextColor="rgba(255,255,255,0.30)"
          style={styles.input}
          autoCapitalize="none"
        />

        {/* Referral code input */}
        <Text style={styles.label}>Referral Code (Optional)</Text>
        <TextInput
          value={referredBy}
          onChangeText={setReferredBy}
          placeholder="Enter code if someone invited you"
          placeholderTextColor="rgba(255,255,255,0.30)"
          style={styles.input}
          autoCapitalize="none"
        />

        {/* Referral display */}
        <Text style={styles.referralText}>
          Your Referral Code:{" "}
          <Text style={styles.referralCode}>{referralCode}</Text>
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.footer,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={saveProfile}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const BLUE = "#377dff";
const DARK = "#000000";
const CARD = "#0b0b0b";
const MUTED = "rgba(255,255,255,0.65)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK, // pure black background per your request
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
    justifyContent: "space-between",
  },

  headerContainer: {
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    // subtle shadow (android)
    elevation: 2,
  },

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  avatarTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 4,
  },
  avatarSubtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
  },

  label: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 15,
  },

  referralText: {
    marginTop: 14,
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
  },
  referralCode: {
    color: "#fff",
    fontWeight: "700",
  },

  footer: {
    marginTop: 20,
  },

  primaryButton: {
    backgroundColor: BLUE, // solid premium blue
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

// app/(auth)/profileSetup.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Image,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

// 🔥 Supabase client
import { supabase } from "../../supabase/client";

/* ---------- Expo Router Wrapper ---------- */
export default function ProfileSetup() {
  return <ProfileSetupScreen />;
}

/* ---------- Actual Screen Implementation ---------- */
function ProfileSetupScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState("");
  const [referralCode, setReferralCode] = useState("");

  /* ------------------------------------------------------------------
     REFERRAL CODE GENERATION (UNIQUE)
  ------------------------------------------------------------------ */
  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    setReferralCode(generateReferralCode());
  }, []);

  /* ------------------------------------------------------------------
     PICK AVATAR
  ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     UPLOAD AVATAR TO SUPABASE STORAGE
  ------------------------------------------------------------------ */
  const uploadAvatar = async (userId: string) => {
    if (!avatar) return null;

    try {
      const ext = avatar.split(".").pop();
      const path = `avatars/${userId}.${ext}`;

      const img = await fetch(avatar);
      const bytes = await img.blob();

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, bytes, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      console.log("Upload error:", error);
      return null;
    }
  };

  /* ------------------------------------------------------------------
     SAVE PROFILE (WITH UNIQUE REFERRAL CODE)
  ------------------------------------------------------------------ */
  const saveProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username is required");
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    try {
      const avatarUrl = await uploadAvatar(user.id);

      let attempts = 0;
      let saved = false;
      let code = referralCode;

      while (!saved && attempts < 5) {
        const { error } = await supabase.from("user_profiles").insert({
          user_id: user.id,
          username: username.trim(),
          avatar_url: avatarUrl,
          referred_by: referredBy.trim() || null,
          referral_code: code,
          created_at: new Date().toISOString(),
        });

        if (!error) {
          saved = true;
          break;
        }

        // 🔁 Retry on unique referral_code collision
        if (error.code === "23505") {
          code = generateReferralCode();
          setReferralCode(code);
          attempts++;
        } else {
          throw error;
        }
      }

      if (!saved) {
        throw new Error("Failed to generate unique referral code");
      }

      Alert.alert("Success", "Profile saved!");
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Profile save failed");
    }
  };

  /* ------------------------------------------------------------------
     ANIMATIONS (UNCHANGED)
  ------------------------------------------------------------------ */
  const titleAnim = useRef(new Animated.Value(0)).current;
  const fieldsAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
  }, []);

  const pressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true }).start();

  const pressOut = () =>
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();

  /* ------------------------------------------------------------------
     UI (UNCHANGED)
  ------------------------------------------------------------------ */
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
          Pick a username and upload your avatar.
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
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={{ color: "#777" }}>Pick Avatar</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Choose a username"
          placeholderTextColor="rgba(255,255,255,0.30)"
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Referral Code (Optional)</Text>
        <TextInput
          value={referredBy}
          onChangeText={setReferredBy}
          placeholder="Enter code if someone invited you"
          placeholderTextColor="rgba(255,255,255,0.30)"
          style={styles.input}
          autoCapitalize="none"
        />

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
            onPressIn={pressIn}
            onPressOut={pressOut}
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

/* ------------------------------------------------------------------
   STYLES (unchanged — added avatar styles)
------------------------------------------------------------------ */

const BLUE = "#377dff";
const DARK = "#000000";
const CARD = "#0b0b0b";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
    justifyContent: "space-between",
  },

  headerContainer: { marginBottom: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 13 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
  },

  avatarContainer: {
    alignSelf: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
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
  referralCode: { color: "#fff", fontWeight: "700" },

  footer: { marginTop: 20 },

  primaryButton: {
    backgroundColor: BLUE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

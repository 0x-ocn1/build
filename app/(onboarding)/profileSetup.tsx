// app/(onboarding)/profileSetup.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Image,
  StyleSheet,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { supabase } from "../../supabase/client";

/* ---------- Expo Router Wrapper ---------- */
export default function ProfileSetup() {
  return <ProfileSetupScreen />;
}

/* ---------- Screen Implementation ---------- */
function ProfileSetupScreen() {
  const router = useRouter();

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------------------------
     REFERRAL CODE (DISPLAY ONLY)
  ------------------------------------------------------------------ */
  const generateReferralCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

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
     UPLOAD AVATAR
  ------------------------------------------------------------------ */
  const uploadAvatar = async (userId: string) => {
  if (!avatar) return null;

  try {
    const ext = avatar.split(".").pop() || "jpg";
    const filePath = `avatars/${userId}.${ext}`;

    const formData = new FormData();
    formData.append("file", {
      uri: avatar,
      name: `${userId}.${ext}`,
      type: "image/jpeg",
    } as any);

    const { data, error } = await supabase.storage
      .from("avatars") // ✅ BUCKET
      .upload(filePath, formData, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (e) {
    console.warn("Avatar upload failed:", e);
    return null;
  }
};


  /* ------------------------------------------------------------------
     SAVE PROFILE + COMPLETE ONBOARDING
  ------------------------------------------------------------------ */
  const saveProfile = async () => {
  if (loading) return;

  if (!username.trim()) {
    Alert.alert("Error", "Username is required");
    return;
  }

  setLoading(true);

  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) {
      throw new Error("User not authenticated");
    }

    const user = data.user;

    // ✅ Upload avatar ONLY if selected
    let avatarUrl: string | null = null;
    if (avatar) {
      avatarUrl = await uploadAvatar(user.id);
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({
        username: username.trim(),
        avatar_url: avatarUrl,
        referred_by: referredBy.trim() || null,
        has_completed_onboarding: true,
      })
      .eq("user_id", user.id);

    if (error) throw error;

    // ✅ Navigate FIRST, then alert (prevents blocking)
    router.replace("/(tabs)");

    setTimeout(() => {
      Alert.alert("Success", "Profile completed!");
    }, 300);
  } catch (err: any) {
    Alert.alert("Error", err?.message ?? "Profile setup failed");
  } finally {
    setLoading(false);
  }
};

  /* ------------------------------------------------------------------
     ANIMATIONS
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
    Animated.spring(pressAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();

  /* ------------------------------------------------------------------
     UI
  ------------------------------------------------------------------ */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Referral Code (Optional)</Text>
        <TextInput
          value={referredBy}
          onChangeText={setReferredBy}
          placeholder="Enter code if someone invited you"
          placeholderTextColor="rgba(255,255,255,0.3)"
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
            <Text style={styles.primaryButtonText}>
              {loading ? "Saving..." : "Save Profile"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------
   STYLES
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

// app/auth/register.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from "react-native";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase/firebaseConfig";

import { Link, useRouter } from "expo-router";

import { doc, getDoc } from "firebase/firestore";

import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { Ionicons } from "@expo/vector-icons";

/* ---------- Expo Router Wrapper (DEFAULT EXPORT) ---------- */
export default function Register() {
  return <RegisterScreen />;
}

/* ---------- Actual Screen Implementation ---------- */
function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [shake, setShake] = useState(false);

  const errorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(shake ? 10 : 0, { duration: 80 }),
      },
    ],
  }));

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 150);
  };

  const handleRegister = async () => {
    if (loading) return;

    if (!email.trim() || !password || !confirm) {
      return triggerError("All fields are required");
    }

    if (password !== confirm) return triggerError("Passwords do not match");
    if (password.length < 6)
      return triggerError("Password must be at least 6 characters");

    setLoading(true);
    setErrorMsg("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;
      const profileSnap = await getDoc(doc(db, "users", user.uid));

      if (!profileSnap.exists()) router.replace("/auth/profileSetup");
      else router.replace("/(tabs)");

    } catch (err: any) {
      triggerError(err.message);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>

      {/* TITLE */}
      <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>
        Create Account
      </Animated.Text>

      <Animated.Text entering={FadeInDown.delay(200)} style={styles.subtitle}>
        Sign up to start mining
      </Animated.Text>

      {/* ERROR */}
      {errorMsg ? (
        <Animated.Text style={[styles.error, errorStyle]}>
          {errorMsg}
        </Animated.Text>
      ) : null}

      {/* EMAIL */}
      <Animated.View entering={FadeInUp.delay(300)}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </Animated.View>

      {/* PASSWORD FIELD */}
      <Animated.View entering={FadeInUp.delay(400)} style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { paddingRight: 45 }]}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!passwordVisible}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setPasswordVisible(!passwordVisible)}
        >
          <Ionicons
            name={passwordVisible ? "eye-off" : "eye"}
            size={22}
            color="#888"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* CONFIRM PASSWORD FIELD */}
      <Animated.View entering={FadeInUp.delay(500)} style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { paddingRight: 45 }]}
          placeholder="Confirm Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!confirmVisible}
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setConfirmVisible(!confirmVisible)}
        >
          <Ionicons
            name={confirmVisible ? "eye-off" : "eye"}
            size={22}
            color="#888"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* REGISTER BUTTON */}
      <Animated.View entering={FadeInUp.delay(600)}>
        <Pressable
          onPress={handleRegister}
          style={({ pressed }) => [
            styles.btn,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Register</Text>
          )}
        </Pressable>
      </Animated.View>

      {/* LOGIN LINK */}
      <View style={styles.row}>
        <Text style={styles.text}>Already have an account?</Text>
        <Link href="/auth/login" style={styles.link}>
          {" "}
          Login
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
  },
  subtitle: {
    color: "#aaa",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  // PASSWORD FIELDS
  passwordContainer: {
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "30%",
  },

  btn: {
    backgroundColor: "#5b3deb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  row: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "center",
  },
  text: {
    color: "#aaa",
  },
  link: {
    color: "#5b3deb",
    fontWeight: "bold",
  },

  error: {
    color: "#ff4f4f",
    marginBottom: 12,
    fontSize: 14,
  },
});
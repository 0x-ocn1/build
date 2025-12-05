import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, storage } from "../../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore"; 

import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  SlideInDown,
  SlideInUp,
  withTiming,
  useAnimatedStyle,
  withSequence,
} from "react-native-reanimated";

import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    if (loading) return;

    if (!email.trim() || !password) {
      triggerError("Email and password are required.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      const user = auth.currentUser;
if (!user) {
  triggerError("Login failed. Try again.");
  setLoading(false);
  return;
}

const userRef = doc(db, "users", user.uid);
const docSnap = await getDoc(userRef);

if (!docSnap.exists()) {
  router.replace("/auth/profileSetup");
} else {
 router.replace("/(tabs)");

}



    } catch (error: any) {
      let msg = "Login failed.";

      if (error.code === "auth/user-not-found") msg = "No account found.";
      else if (error.code === "auth/wrong-password") msg = "Incorrect password.";
      else if (error.code === "auth/invalid-email") msg = "Invalid email format.";
      else msg = error.message;

      triggerError(msg);
    }

    setLoading(false);
  };

  // 🔥 Shake animation for errors
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

  return (
    <View style={styles.container}>

      {/* TITLE */}
      <Animated.Text
        entering={FadeInDown.delay(100)}
        style={styles.title}
      >
        Welcome Back
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(200)}
        style={styles.subtitle}
      >
        Log in to continue mining
      </Animated.Text>

      {/* ERROR */}
      {errorMsg ? (
        <Animated.Text style={[styles.error, errorStyle]}>
          {errorMsg}
        </Animated.Text>
      ) : null}

      {/* EMAIL INPUT */}
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

      {/* PASSWORD WITH TOGGLE */}
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

      {/* REMEMBER ME */}
      <Animated.View
        entering={FadeIn.delay(450)}
        style={styles.rememberRow}
      >
        <TouchableOpacity
          onPress={() => setRememberMe(!rememberMe)}
          style={styles.switchBox}
        >
          <View
            style={[
              styles.switchOuter,
              rememberMe && { backgroundColor: "#5b3deb55" },
            ]}
          >
            <Animated.View
              style={[
                styles.switchCircle,
                rememberMe && { transform: [{ translateX: 18 }] },
              ]}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.rememberText}>Remember me</Text>
      </Animated.View>

      {/* LOGIN BUTTON */}
      <Animated.View entering={FadeInUp.delay(550)}>
        <Pressable
          onPress={handleLogin}
          style={({ pressed }) => [
            styles.loginBtn,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </Pressable>
      </Animated.View>

      {/* FORGOT LINK */}
      <Link href="/auth/forgot" style={styles.forgot}>
        Forgot Password?
      </Link>

      {/* REGISTER LINK */}
      <View style={styles.row}>
        <Text style={styles.text}>Don't have an account? </Text>
        <Link href="/auth/register" style={styles.link}>
          Register
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

  // PASSWORD FIELD
  passwordContainer: {
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "30%",
  },

  // REMEMBER ME
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  switchBox: {
    marginRight: 10,
  },
  switchOuter: {
    width: 40,
    height: 22,
    backgroundColor: "#222",
    borderRadius: 20,
    padding: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  switchCircle: {
    width: 18,
    height: 18,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  rememberText: {
    color: "#aaa",
    fontSize: 14,
  },

  loginBtn: {
    backgroundColor: "#5b3deb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  row: {
    flexDirection: "row",
    marginTop: 15,
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
    marginBottom: 10,
  },

  forgot: {
    color: "#5b3deb",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 16,
  },
});

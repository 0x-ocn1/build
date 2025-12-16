// app/_layout.tsx
import { Slot, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../hooks/useAuth";

export default function RootLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  // ⏳ Wait for auth state
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#060B1A",
        }}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const group = segments[0]; // "(auth)" | "(onboarding)" | "(tabs)"

  // 🔒 Protect dashboard
  if (!user && group === "(tabs)") {
    return <Redirect href="/(auth)/login" />;
  }

  // 🚫 Logged-in users must not see auth pages
  if (user && group === "(auth)") {
    return <Redirect href="/(tabs)" />;
  }

  // 🚫 Logged-in users must not see onboarding
  if (user && group === "(onboarding)") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      <Slot />
      <StatusBar style="auto" />
    </>
  );
}

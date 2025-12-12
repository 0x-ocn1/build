import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkUserProfile = async (userId: string) => {
      try {
        // ✔ Correct table + correct PK
        const { data, error } = await supabase
          .from("user_profiles")
          .select("username")
          .eq("user_id", userId)
          .single();

        if (cancelled) return;

        if (error) {
          console.log("[Supabase] Profile fetch error:", error);
          setProfileCompleted(false);
        } else {
          setProfileCompleted(Boolean(data?.username));
        }
      } catch (err) {
        console.log("[Supabase] Profile exception:", err);
        if (!cancelled) setProfileCompleted(false);
      }
    };

    // ✔ Auth listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (cancelled) return;

        const user = session?.user ?? null;

        if (user) {
          setIsAuthenticated(true);
          await checkUserProfile(user.id);
        } else {
          setIsAuthenticated(false);
          setProfileCompleted(false);
        }

        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ✔ Loading spinner
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        
        {/* ✔ Logged in, profile done → tabs */}
        {isAuthenticated && profileCompleted && (
          <Stack.Screen name="(tabs)" />
        )}

        {/* ✔ Logged in, no profile → go setup */}
        {isAuthenticated && !profileCompleted && (
          <Stack.Screen name="(auth)/profileSetup" />
        )}

        {/* ✔ Not logged in → show auth entry screen */}
        {!isAuthenticated && (
          <Stack.Screen name="(auth)/index" />
        )}

        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

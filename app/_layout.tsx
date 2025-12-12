// app/_layout.tsx

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
        // 🔥 Fetch from your correct table: user_profile
        const { data, error } = await supabase
          .from("user_profile")
          .select("username")
          .eq("id", userId)
          .single();

        if (cancelled) return;

        if (error) {
          console.log("[Supabase] Profile fetch error:", error);
          setProfileCompleted(false);
        } else {
          setProfileCompleted(!!data?.username);
        }
      } catch (err) {
        console.log("[Supabase] Profile error:", err);
        setProfileCompleted(false);
      }
    };

    // 🔥 Supabase auth listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        const user = session?.user ?? null;

        if (user) {
          setIsAuthenticated(true);

          // Check user_profile table
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

  // Loading UI
  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated && profileCompleted && <Stack.Screen name="(tabs)" />}
        {isAuthenticated && !profileCompleted && (
          <Stack.Screen name="(auth)/profileSetup" />
        )}
        {!isAuthenticated && <Stack.Screen name="(auth)" />}
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

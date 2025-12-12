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

  // 🔍 Check if user has completed their profile
  const checkUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[Supabase] Profile fetch error:", error);
        return false;
      }

      return Boolean(data?.username);
    } catch (err) {
      console.warn("[Supabase] Profile fetch exception:", err);
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      const user = session?.user ?? null;

      if (user) {
        setIsAuthenticated(true);
        const completed = await checkUserProfile(user.id);
        if (!cancelled) setProfileCompleted(completed);
      } else {
        setIsAuthenticated(false);
        setProfileCompleted(false);
      }

      setLoading(false);
    };

    // 🔥 Auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;

        const user = session?.user ?? null;

        if (user) {
          setIsAuthenticated(true);
          const completed = await checkUserProfile(user.id);
          if (!cancelled) setProfileCompleted(completed);
        } else {
          setIsAuthenticated(false);
          setProfileCompleted(false);
        }

        setLoading(false);
      }
    );

    loadSession();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ⏳ Loading screen
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
        {/* Authenticated + profile completed → tabs */}
        {isAuthenticated && profileCompleted && (
          <Stack.Screen name="(tabs)" />
        )}

        {/* Authenticated but profile NOT completed → profile setup */}
        {isAuthenticated && !profileCompleted && (
          <Stack.Screen name="(auth)/profileSetup" />
        )}

        {/* Not authenticated → login entry */}
        {!isAuthenticated && <Stack.Screen name="(auth)/index" />}

        {/* Always keep modal available */}
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />

        {/* Explicitly register all auth routes (prevents warnings) */}
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/forgot" />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '../firebase/auth';
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { doc, getDoc } from "firebase/firestore";
import { db } from '../firebase/firestore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        setIsAuthenticated(true);

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setProfileCompleted(!!userDoc.data().username);
        } else {
          setProfileCompleted(false);
        }
      } else {
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    checkAuthAndProfile();
  }, []);

  if (loading) {
    return <StatusBar style="auto" />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerTitle: () => (
            <Image
              source={require("../assets/images/icon.png")}
              style={{
                width: 140,
                height: 40,
                resizeMode: "contain",
              }}
            />
          ),
          headerStyle: {
            backgroundColor: "#000"
          },
          headerTintColor: "#fff",
        }}
      >
        {isAuthenticated ? (
          profileCompleted ? (
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}  // Tabs already handle their own header
            />
          ) : (
            <Stack.Screen
              name="auth/profileSetup"
              options={{ headerShown: true }}
            />
          )
        ) : (
          <>
            <Stack.Screen name="auth/register" options={{ headerShown: true }} />
            <Stack.Screen name="auth/login" options={{ headerShown: true }} />
            <Stack.Screen name="auth/forgot" options={{ headerShown: true }} />
          </>
        )}

        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal' }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

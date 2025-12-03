import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '../firebase/auth'; // Firebase Auth
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)', // Navigates to tabs once authenticated
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true); // Track loading state
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track auth state
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      if (user) {
        setIsAuthenticated(true);
        setLoading(false);
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // If still loading, show a splash screen or loading screen
  if (loading) {
    return <StatusBar style="auto" />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Conditionally load the screen based on authentication */}
        {isAuthenticated ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="auth/register" options={{ title: 'Register' }} />
            <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
          </>
        )}
        <Stack.Screen name="auth/profileSetup" options={{ presentation: 'modal', title: 'Complete Profile' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

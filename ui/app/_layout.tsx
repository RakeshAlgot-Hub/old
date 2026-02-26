import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PropertyProvider } from '@/context/PropertyContext';

function RootNavigator() {
  const { isDark, colors } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'property-detail' || segments[0] === 'subscription' || segments[0] === 'manage-properties' || segments[0] === 'property-form' || segments[0] === 'manage-rooms' || segments[0] === 'room-form' || segments[0] === 'manage-beds' || segments[0] === 'manage-staff' || segments[0] === 'manage-teams';
    const inPublicRoute = segments[0] === 'register' || segments[0] === 'email-verification-pending' || segments[0] === 'otp-verification' || segments[0] === 'forgot-password' || segments[0] === 'reset-password';

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/');
    } else if (isAuthenticated && !inAuthGroup && !inPublicRoute) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, loading, segments]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="email-verification-pending" />
        <Stack.Screen name="otp-verification" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="property-detail" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="manage-properties" />
        <Stack.Screen name="property-form" />
        <Stack.Screen name="manage-rooms" />
        <Stack.Screen name="room-form" />
        <Stack.Screen name="manage-beds" />
        <Stack.Screen name="manage-staff" />
        <Stack.Screen name="manage-teams" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PropertyProvider>
            <RootNavigator />
          </PropertyProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

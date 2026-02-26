import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Building2 } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/apiClient';
import { tokenStorage } from '@/services/tokenStorage';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.verified === 'true') {
      setSuccessMessage('Email verified successfully! You can now login.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (params.resetSuccess === 'true') {
      setSuccessMessage('Password reset successfully! You can now login.');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [params]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authService.login({ email, password });

      if (response.data && response.data.tokens) {
        await Promise.all([
          tokenStorage.setAccessToken(response.data.tokens.accessToken),
          tokenStorage.setRefreshToken(response.data.tokens.refreshToken),
          tokenStorage.setTokenExpiry(response.data.tokens.expiresAt),
        ]);

        login(response.data.user);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        router.push({
          pathname: '/otp-verification',
          params: { email, mode: 'register' },
        });
      } else {
        setError(err?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary[50] }]}>
              <Building2 size={48} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Hostel Manager</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Owner Dashboard</Text>
          </View>

          <View style={styles.formContainer}>
            {successMessage && (
              <View style={[styles.successContainer, { backgroundColor: colors.success[50], borderColor: colors.success[200] }]}>
                <Text style={[styles.successText, { color: colors.success[700] }]}>{successMessage}</Text>
              </View>
            )}

            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.danger[50], borderColor: colors.danger[200] }]}>
                <Text style={[styles.errorText, { color: colors.danger[700] }]}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.white, color: colors.text.primary, borderColor: colors.border.medium }]}
                placeholder="owner@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.white, color: colors.text.primary, borderColor: colors.border.medium }]}
                placeholder="••••••••"
                secureTextEntry
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary[500], opacity: loading ? 0.6 : 1 }]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={[styles.loginButtonText, { color: colors.white }]}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => router.push('/forgot-password')}
              activeOpacity={0.7}
              disabled={loading}>
              <Text style={[styles.forgotPasswordText, { color: colors.primary[500] }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <View style={styles.registerLinkContainer}>
              <Text style={[styles.registerLinkText, { color: colors.text.secondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/register')}
                activeOpacity={0.7}
                disabled={loading}>
                <Text style={[styles.registerLink, { color: colors.primary[500] }]}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  successContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  successText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.md,
    borderWidth: 1,
  },
  loginButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.lg,
  },
  loginButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  registerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  registerLinkText: {
    fontSize: typography.fontSize.sm,
  },
  registerLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

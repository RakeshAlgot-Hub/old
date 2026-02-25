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
import { useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/apiClient';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authService.register({ name, email, password });

      if (response.data) {
        router.push({
          pathname: '/email-verification-pending',
          params: { email: response.data.email },
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
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
            <Text style={[styles.title, { color: colors.text.primary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Start managing your hostels today
            </Text>
          </View>

          <View style={styles.formContainer}>
            {error && (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: colors.danger[50],
                    borderColor: colors.danger[200],
                  },
                ]}>
                <Text style={[styles.errorText, { color: colors.danger[700] }]}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                    borderColor: colors.border.medium,
                  },
                ]}
                placeholder="John Doe"
                autoCapitalize="words"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                    borderColor: colors.border.medium,
                  },
                ]}
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
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                    borderColor: colors.border.medium,
                  },
                ]}
                placeholder="••••••••"
                secureTextEntry
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Confirm Password</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                    borderColor: colors.border.medium,
                  },
                ]}
                placeholder="••••••••"
                secureTextEntry
                placeholderTextColor={colors.text.tertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                {
                  backgroundColor: colors.primary[500],
                  opacity: loading ? 0.6 : 1,
                },
              ]}
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={[styles.registerButtonText, { color: colors.white }]}>
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginLinkContainer}>
              <Text style={[styles.loginLinkText, { color: colors.text.secondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                disabled={loading}>
                <Text style={[styles.loginLink, { color: colors.primary[500] }]}>Login</Text>
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
    textAlign: 'center',
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
  registerButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.lg,
  },
  registerButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginLinkText: {
    fontSize: typography.fontSize.sm,
  },
  loginLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

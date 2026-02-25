import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, CheckCircle } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/apiClient';

export default function EmailVerificationPendingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResend = async () => {
    if (!email) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await authService.resendVerification(email);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary[50] }]}>
          <Mail size={64} color={colors.primary[500]} />
        </View>

        <Text style={[styles.title, { color: colors.text.primary }]}>Check Your Email</Text>

        <Text style={[styles.description, { color: colors.text.secondary }]}>
          We've sent a verification link to
        </Text>

        <Text style={[styles.email, { color: colors.text.primary }]}>{email}</Text>

        <Text style={[styles.instruction, { color: colors.text.secondary }]}>
          Click the link in the email to verify your account and complete registration.
        </Text>

        {success && (
          <View
            style={[
              styles.successContainer,
              {
                backgroundColor: colors.success[50],
                borderColor: colors.success[200],
              },
            ]}>
            <CheckCircle size={20} color={colors.success[500]} />
            <Text style={[styles.successText, { color: colors.success[700] }]}>
              Verification email sent successfully
            </Text>
          </View>
        )}

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

        <TouchableOpacity
          style={[
            styles.resendButton,
            {
              backgroundColor: colors.white,
              borderColor: colors.border.medium,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleResend}
          activeOpacity={0.7}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primary[500]} size="small" />
          ) : (
            <Text style={[styles.resendButtonText, { color: colors.primary[500] }]}>
              Resend Verification Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
          disabled={loading}>
          <Text style={[styles.backButtonText, { color: colors.text.secondary }]}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 128,
    height: 128,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  email: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  instruction: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  successText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
    flex: 1,
  },
  errorContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  resendButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    width: '100%',
    ...shadows.md,
  },
  resendButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  backButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

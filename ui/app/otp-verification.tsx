import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { authService } from '@/services/apiClient';

export default function OTPVerificationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { email, mode } = useLocalSearchParams<{ email: string; mode: 'register' | 'reset' }>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (mode === 'register') {
        await authService.verifyOTP({ email, otp: otpCode });
        setSuccess(true);

        setTimeout(() => {
          router.replace({
            pathname: '/',
            params: { verified: 'true' },
          });
        }, 1500);
      } else if (mode === 'reset') {
        await authService.verifyResetOTP({ email, otp: otpCode });

        router.push({
          pathname: '/reset-password',
          params: { email, otp: otpCode },
        });
      }
    } catch (err: any) {
      if (err?.code === 'INVALID_OTP') {
        setError('Invalid OTP. Please check and try again.');
      } else if (err?.code === 'OTP_EXPIRED') {
        setError('OTP has expired. Please request a new one.');
      } else {
        setError(err?.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await authService.resendOTP({ email });

      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
  };

  const getTitle = () => {
    return mode === 'register' ? 'Verify Your Email' : 'Verify Reset Code';
  };

  const getDescription = () => {
    return mode === 'register'
      ? 'Enter the 6-digit code sent to'
      : 'Enter the 6-digit reset code sent to';
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary[50] }]}>
          <Mail size={64} color={colors.primary[500]} />
        </View>

        <Text style={[styles.title, { color: colors.text.primary }]}>{getTitle()}</Text>

        <Text style={[styles.description, { color: colors.text.secondary }]}>
          {getDescription()}
        </Text>

        <Text style={[styles.email, { color: colors.text.primary }]}>{maskEmail(email)}</Text>

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

        {success && (
          <View
            style={[
              styles.successContainer,
              {
                backgroundColor: colors.success[50],
                borderColor: colors.success[200],
              },
            ]}>
            <Text style={[styles.successText, { color: colors.success[700] }]}>
              Verification successful!
            </Text>
          </View>
        )}

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                {
                  backgroundColor: colors.white,
                  color: colors.text.primary,
                  borderColor: digit ? colors.primary[500] : colors.border.medium,
                },
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!loading && !success}
              autoFocus={index === 0}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            {
              backgroundColor: colors.primary[500],
              opacity: loading || success ? 0.6 : 1,
            },
          ]}
          onPress={handleVerify}
          activeOpacity={0.7}
          disabled={loading || success}>
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={[styles.verifyButtonText, { color: colors.white }]}>
              Verify
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={[styles.resendText, { color: colors.text.secondary }]}>
            Didn't receive the code?{' '}
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            activeOpacity={0.7}
            disabled={loading || resendCooldown > 0}>
            <Text
              style={[
                styles.resendLink,
                {
                  color: resendCooldown > 0 ? colors.text.tertiary : colors.primary[500],
                },
              ]}>
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
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
    marginBottom: spacing.xxl,
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
    textAlign: 'center',
  },
  successContainer: {
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
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  verifyButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...shadows.md,
  },
  verifyButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  resendText: {
    fontSize: typography.fontSize.sm,
  },
  resendLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

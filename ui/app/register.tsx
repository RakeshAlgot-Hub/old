import { useRef, useState } from 'react';
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
import { UserPlus, Eye, EyeOff } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/apiClient';
import { encryptedTokenStorage } from '@/services/encryptedTokenStorage';
import { deviceIdService } from '@/services/deviceId';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    return phoneRegex.test(phone.trim());
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authService.sendEmailOTP({ email: email.trim() });
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyEmail = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await authService.verifyEmailOTP({
        email: email.trim(),
        otp: otpCode,
      });

      setEmailVerified(true);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Email verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!email.trim() || !validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!emailVerified) {
      setError('Please verify your email first');
      return;
    }

    if (!phone.trim() || !validatePhone(phone.trim())) {
      setError('Please enter a valid Indian phone number (+91XXXXXXXXXX)');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authService.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      if (response?.data?.tokens) {
        // Store tokens in encrypted storage with device ID binding
        const deviceId = await deviceIdService.getOrCreateDeviceId();
        await Promise.all([
          encryptedTokenStorage.setAccessToken(response.data.tokens.accessToken),
          encryptedTokenStorage.setRefreshToken(response.data.tokens.refreshToken),
          encryptedTokenStorage.setTokenExpiry(response.data.tokens.expiresAt),
          encryptedTokenStorage.setDeviceIdForTokens(deviceId),
        ]);
        login(response.data.user);
        return;
      }

      setError('Registration failed. Please try again.');
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
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary[50] }]}>
              <UserPlus size={40} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Register to get started
            </Text>
          </View>

          <View style={styles.formContainer}>
            {error && (
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: colors.danger[50], borderColor: colors.danger[200] },
                ]}>
                <Text style={[styles.errorText, { color: colors.danger[700] }]}>{error}</Text>
              </View>
            )}

            {emailVerified && (
              <View
                style={[
                  styles.successContainer,
                  { backgroundColor: colors.success[50], borderColor: colors.success[200] },
                ]}>
                <Text style={[styles.successText, { color: colors.success[700] }]}>
                  ✓ Email verified successfully
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Full Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                    borderColor: colors.border.medium,
                  },
                ]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.text.tertiary}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Email *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                    borderColor: emailVerified ? colors.success[500] : colors.border.medium,
                  },
                ]}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                editable={!loading && !emailVerified}
              />
            </View>

            {!emailVerified && !otpSent && (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary[500], opacity: loading ? 0.6 : 1 },
                ]}
                onPress={handleSendOTP}
                activeOpacity={0.8}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                    Send Verification OTP
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {otpSent && !emailVerified && (
              <>
                <Text style={[styles.label, { color: colors.text.primary }]}>
                  Enter 6-digit OTP
                </Text>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(input) => {
                        otpInputRefs.current[index] = input;
                      }}
                      style={[
                        styles.otpInput,
                        {
                          backgroundColor: colors.white,
                          color: colors.text.primary,
                          borderColor: colors.border.medium,
                        },
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      editable={!loading}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary[500], opacity: loading ? 0.6 : 1 },
                  ]}
                  onPress={handleVerifyEmail}
                  activeOpacity={0.8}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                      Verify Email
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={handleSendOTP}
                  activeOpacity={0.7}
                  disabled={loading}>
                  <Text style={[styles.linkText, { color: colors.primary[500] }]}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {emailVerified && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>
                    Phone Number (India) *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.white,
                        color: colors.text.primary,
                        borderColor: colors.border.medium,
                      },
                    ]}
                    placeholder="+91XXXXXXXXXX"
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.text.tertiary}
                    value={phone}
                    onChangeText={setPhone}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.passwordInput,
                        {
                          backgroundColor: colors.white,
                          color: colors.text.primary,
                          borderColor: colors.border.medium,
                        },
                      ]}
                      placeholder="Enter your password"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      placeholderTextColor={colors.text.tertiary}
                      value={password}
                      onChangeText={setPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}>
                      {showPassword ? (
                        <EyeOff size={20} color={colors.text.tertiary} />
                      ) : (
                        <Eye size={20} color={colors.text.tertiary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>
                    Confirm Password *
                  </Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[
                        styles.passwordInput,
                        {
                          backgroundColor: colors.white,
                          color: colors.text.primary,
                          borderColor: colors.border.medium,
                        },
                      ]}
                      placeholder="Confirm your password"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      placeholderTextColor={colors.text.tertiary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}>
                      {showConfirmPassword ? (
                        <EyeOff size={20} color={colors.text.tertiary} />
                      ) : (
                        <Eye size={20} color={colors.text.tertiary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary[500], opacity: loading ? 0.6 : 1 },
                  ]}
                  onPress={handleRegister}
                  activeOpacity={0.8}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                      Register
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace('/')}
              activeOpacity={0.7}
              disabled={loading}>
              <Text style={[styles.linkText, { color: colors.text.secondary }]}>
                Already have an account?{' '}
                <Text style={[styles.linkTextBold, { color: colors.primary[500] }]}>Login</Text>
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
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
    marginBottom: spacing.lg,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingRight: 50,
    fontSize: typography.fontSize.md,
    borderWidth: 1,
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpInput: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  primaryButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.lg,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  linkText: {
    fontSize: typography.fontSize.sm,
  },
  linkTextBold: {
    fontWeight: typography.fontWeight.semibold,
  },
});
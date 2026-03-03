import { useState, useEffect } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Wallet, ChevronLeft, ChevronDown, Calendar, AlertTriangle } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { paymentService } from '@/services/apiClient';
import ApiErrorCard from '@/components/ApiErrorCard';
import { cacheKeys, clearScreenCache, getScreenCache, setScreenCache } from '@/services/screenCache';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other'];
const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Due' },
  { value: 'overdue', label: 'Overdue' },
];

const PAYMENT_DETAIL_CACHE_STALE_MS = 60 * 1000;

export default function EditPaymentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const isOnline = useNetworkStatus();

  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [method, setMethod] = useState('Cash');
  const [status, setStatus] = useState<'paid' | 'due' | 'overdue'>('paid');
  const [originalStatus, setOriginalStatus] = useState<'paid' | 'due' | 'overdue'>('paid');
  const [pendingStatus, setPendingStatus] = useState<'paid' | 'due' | 'overdue' | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchingPayment, setFetchingPayment] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);

  const [tenantName, setTenantName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  useEffect(() => {
    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId]);

  const fetchPayment = async () => {
    if (!paymentId) return;

    const paymentCacheKey = cacheKeys.paymentDetail(paymentId);
    const cachedPayment = getScreenCache<any>(paymentCacheKey, PAYMENT_DETAIL_CACHE_STALE_MS);
    if (cachedPayment) {
      const amountStr = cachedPayment.amount.replace(/[^0-9]/g, '');
      setAmount(amountStr);
      setDueDate(cachedPayment.dueDate || '');
      setMethod(cachedPayment.method || 'Cash');
      setStatus(cachedPayment.status);
      setOriginalStatus(cachedPayment.status);
      setTenantName((cachedPayment as any).tenantName || '');
      setRoomNumber((cachedPayment as any).roomNumber || 'N/A');
      setFetchingPayment(false);
      return;
    }

    try {
      setFetchingPayment(true);
      setError(null);

      const response = await paymentService.getPaymentById(paymentId);
      const payment: any = response.data;

      const amountStr = payment.amount.replace(/[^0-9]/g, '');

      setAmount(amountStr);
      setDueDate(payment.dueDate || '');
      setMethod(payment.method || 'Cash');
      setStatus(payment.status);
      setOriginalStatus(payment.status);
      setTenantName(payment.tenantName);
      setRoomNumber(payment.roomNumber || 'N/A');
      setScreenCache(paymentCacheKey, payment);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment');
    } finally {
      setFetchingPayment(false);
    }
  };

  const handleRetry = () => {
    fetchPayment();
  };

  const handleStatusSelection = (newStatus: 'paid' | 'due' | 'overdue') => {
    // If status is changing, show confirmation
    if (newStatus !== status) {
      setPendingStatus(newStatus);
      setShowStatusPicker(false);
      setShowStatusConfirmModal(true);
    } else {
      setShowStatusPicker(false);
    }
  };

  const handleConfirmStatusChange = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
      setPendingStatus(null);
    }
    setShowStatusConfirmModal(false);
  };

  const handleCancelStatusChange = () => {
    setPendingStatus(null);
    setShowStatusConfirmModal(false);
  };

  const getStatusConfirmationMessage = () => {
    if (!pendingStatus) return '';
    
    if (pendingStatus === 'paid') {
      return 'Mark this payment as Paid? The payment date will be recorded as today. This action should only be confirmed once payment is received.';
    } else if (status === 'paid' && (pendingStatus === 'due' || pendingStatus === 'overdue')) {
      return 'Change status from Paid to Due? This will remove the paid record.';
    } else {
      return `Change payment status to ${PAYMENT_STATUSES.find(s => s.value === pendingStatus)?.label}?`;
    }
  };

  const handleSubmit = async () => {
    if (!amount || !dueDate || !method || !status) {
      setError('Amount, due date, method, and status are required');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!paymentId) {
      setError('Payment ID is missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData: any = {
        amount: `₹${amountNum.toLocaleString()}`,
        dueDate,
        method,
        status,
      };

      // If changing to paid and there's no paidDate, backend will auto-set it
      // If changing away from paid, let backend handle it (paidDate can remain)

      await paymentService.updatePayment(paymentId, updateData);

      clearScreenCache('payments:');
      clearScreenCache('dashboard:');
      clearScreenCache('tenant-detail:');
      clearScreenCache(`payment-detail:${paymentId}`);

      router.back();
    } catch (err: any) {
      setError(err?.message || 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      amount.trim() &&
      dueDate &&
      method &&
      status &&
      !isNaN(parseFloat(amount)) &&
      parseFloat(amount) > 0
    );
  };

  if (fetchingPayment) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background.primary }]}
        edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Edit Payment</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Edit Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary[50] }]}>
              <Wallet size={48} color={colors.primary[500]} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>Edit Payment</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Update payment details
            </Text>
          </View>

          <View style={styles.formContainer}>
            {error && <ApiErrorCard error={error} onRetry={handleRetry} />}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Tenant</Text>
              <View
                style={[
                  styles.disabledInput,
                  {
                    backgroundColor: colors.background.tertiary,
                    borderColor: colors.border.medium,
                  },
                ]}>
                <Text style={[styles.disabledText, { color: colors.text.secondary }]}>
                  {tenantName}
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Room</Text>
              <View
                style={[
                  styles.disabledInput,
                  {
                    backgroundColor: colors.background.tertiary,
                    borderColor: colors.border.medium,
                  },
                ]}>
                <Text style={[styles.disabledText, { color: colors.text.secondary }]}>
                  {roomNumber}
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Amount *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.white,
                    color: colors.text.primary,
                    borderColor: colors.border.medium,
                  },
                ]}
                placeholder="e.g., 5000"
                keyboardType="numeric"
                placeholderTextColor={colors.text.tertiary}
                value={amount}
                onChangeText={setAmount}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Due Date *</Text>
              <View style={styles.dateInputContainer}>
                <Calendar size={20} color={colors.text.tertiary} style={styles.dateIcon} />
                <TextInput
                  style={[
                    styles.dateInput,
                    {
                      backgroundColor: colors.white,
                      color: colors.text.primary,
                      borderColor: colors.border.medium,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.text.tertiary}
                  value={dueDate}
                  onChangeText={setDueDate}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Payment Method *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: colors.white,
                    borderColor: colors.border.medium,
                  },
                ]}
                onPress={() => setShowMethodPicker(true)}
                activeOpacity={0.7}
                disabled={loading}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    {
                      color: method ? colors.text.primary : colors.text.tertiary,
                    },
                  ]}>
                  {method || 'Select Method'}
                </Text>
                <ChevronDown size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Status *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: colors.white,
                    borderColor: colors.border.medium,
                  },
                ]}
                onPress={() => setShowStatusPicker(true)}
                activeOpacity={0.7}
                disabled={loading}>
                <Text
                  style={[
                    styles.pickerButtonText,
                    {
                      color: status ? colors.text.primary : colors.text.tertiary,
                    },
                  ]}>
                  {PAYMENT_STATUSES.find(s => s.value === status)?.label || 'Select Status'}
                </Text>
                <ChevronDown size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            {!isOnline && (
              <View style={[styles.offlineWarning, { backgroundColor: colors.warning[50], borderColor: colors.warning[200] }]}>
                <Text style={[styles.offlineWarningText, { color: colors.warning[900] }]}>
                  📡 Offline - You cannot update payments without internet connection
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.primary[500],
                  opacity: loading || !isFormValid() || !isOnline ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={loading || !isFormValid() || !isOnline}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.white }]}>
                  {isOnline ? 'Update Payment' : 'Offline'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showMethodPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMethodPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Select Payment Method
              </Text>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {PAYMENT_METHODS.map((m, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border.light },
                  ]}
                  onPress={() => {
                    setMethod(m);
                    setShowMethodPicker(false);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      {
                        color:
                          method === m ? colors.primary[500] : colors.text.primary,
                        fontWeight:
                          method === m
                            ? typography.fontWeight.semibold
                            : typography.fontWeight.regular,
                      },
                    ]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseButton, { borderTopColor: colors.border.light }]}
              onPress={() => setShowMethodPicker(false)}
              activeOpacity={0.7}>
              <Text style={[styles.modalCloseButtonText, { color: colors.text.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStatusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Select Payment Status
              </Text>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {PAYMENT_STATUSES.map((s, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border.light },
                  ]}
                  onPress={() => handleStatusSelection(s.value as 'paid' | 'due' | 'overdue')}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      {
                        color:
                          status === s.value ? colors.primary[500] : colors.text.primary,
                        fontWeight:
                          status === s.value
                            ? typography.fontWeight.semibold
                            : typography.fontWeight.regular,
                      },
                    ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseButton, { borderTopColor: colors.border.light }]}
              onPress={() => setShowStatusPicker(false)}
              activeOpacity={0.7}>
              <Text style={[styles.modalCloseButtonText, { color: colors.text.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal
        visible={showStatusConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelStatusChange}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalContainer, { backgroundColor: colors.white }]}>
            <View style={styles.confirmIconContainer}>
              <View style={[styles.confirmIcon, { backgroundColor: pendingStatus === 'paid' ? colors.success[50] : colors.warning[50] }]}>
                <AlertTriangle size={32} color={pendingStatus === 'paid' ? colors.success[500] : colors.warning[500]} />
              </View>
            </View>

            <Text style={[styles.confirmTitle, { color: colors.text.primary }]}>
              Confirm Status Change
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.text.secondary }]}>
              {getStatusConfirmationMessage()}
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.medium }]}
                onPress={handleCancelStatusChange}
                activeOpacity={0.7}>
                <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonPrimary, { backgroundColor: pendingStatus === 'paid' ? colors.success[500] : colors.warning[500] }]}
                onPress={handleConfirmStatusChange}
                activeOpacity={0.7}>
                <Text style={[styles.confirmButtonText, { color: colors.white }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
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
  disabledInput: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  disabledText: {
    fontSize: typography.fontSize.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  pickerButtonText: {
    fontSize: typography.fontSize.md,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  dateInputContainer: {
    position: 'relative',
  },
  dateIcon: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.md,
    zIndex: 1,
  },
  dateInput: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingLeft: 48,
    fontSize: typography.fontSize.md,
    borderWidth: 1,
  },
  submitButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.lg,
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  offlineWarning: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  offlineWarningText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '70%',
    ...shadows.xl,
  },
  modalHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: typography.fontSize.md,
  },
  modalCloseButton: {
    padding: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  confirmModalContainer: {
    marginHorizontal: spacing.xl,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.xl,
  },
  confirmIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmMessage: {
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  confirmButtonPrimary: {
    ...shadows.md,
  },
  confirmButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});

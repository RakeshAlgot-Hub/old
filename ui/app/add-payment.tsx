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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Wallet, ChevronLeft, ChevronDown } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { paymentService, tenantService } from '@/services/apiClient';
import type { Tenant, Payment } from '@/services/apiTypes';
import EmptyState from '@/components/EmptyState';
import DatePicker from '@/components/DatePicker';

const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Due' },
  { value: 'overdue', label: 'Overdue' },
];

interface TenantWithLatestPayment extends Tenant {
  latestPayment?: Payment;
}

export default function AddPaymentScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { selectedPropertyId } = useProperty();

  const [name, setName] = useState(typeof params.name === 'string' ? params.name : '');
  const [documentId, setDocumentId] = useState(typeof params.documentId === 'string' ? params.documentId : '');
  const [phone, setPhone] = useState(typeof params.phone === 'string' ? params.phone : '');
  const [rent, setRent] = useState(typeof params.rent === 'string' ? params.rent : ''); // Rent remains unchanged
  const [joinDate, setJoinDate] = useState(typeof params.joinDate === 'string' ? params.joinDate : '');
  const [roomId] = useState(typeof params.roomId === 'string' ? params.roomId : '');
  const [bedId] = useState(typeof params.bedId === 'string' ? params.bedId : '');
  const [propertyId] = useState(typeof params.propertyId === 'string' ? params.propertyId : selectedPropertyId);
  const [amount, setAmount] = useState(params.rent || '');
    // Removed dueDate state
  const [paymentDate, setPaymentDate] = useState('');
  const [status, setStatus] = useState<'paid' | 'due'>('paid');
  // Billing settings
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'day-wise'>('monthly');
    // Set anchorDate to today's date by default, editable
    function getTodayISO() {
      const d = new Date();
      return d.toISOString().split('T')[0];
    }
    const [anchorDate, setAnchorDate] = useState(() => getTodayISO());
  const [autoGeneratePayments, setAutoGeneratePayments] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  useEffect(() => {
    if (joinDate) {
      setAnchorDate(joinDate);
      // Removed setDueDate
    }
  }, [joinDate]);

  // Calculate due date based on billingCycle and anchorDate
  useEffect(() => {
    // Removed due date calculation effect
  }, [anchorDate, billingCycle, status]);

  const handleStatusChange = (newStatus: 'paid' | 'due' | 'overdue') => {
    if (newStatus === 'paid' || newStatus === 'due') {
      setStatus(newStatus);
    }
    if (newStatus !== 'paid') {
      setPaymentDate('');
    }
  };

  const handleSubmit = async () => {
    // Only send tenant + status + billingCycle + anchorDate
    if (!name || !phone || !rent || !joinDate || !roomId || !bedId || !propertyId || !anchorDate || !billingCycle) {
      setError('All required fields must be filled');
      return;
    }
    const rentNum = parseFloat(typeof rent === 'string' ? rent : '');
    if (isNaN(rentNum) || rentNum <= 0) {
      setError('Please enter a valid rent');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload = {
        tenant: {
          propertyId,
          roomId,
          bedId,
          name: typeof name === 'string' ? name.trim() : '',
          documentId: typeof documentId === 'string' ? documentId.trim() : '',
          phone: typeof phone === 'string' ? phone.trim() : '',
          rent: rent,
          joinDate,
        },
        status,
        billingCycle,
        anchorDate,
      };
      // Call backend to create tenant
      await tenantService.createTenant({
        ...payload.tenant,
        billingConfig: {
          status,
          billingCycle,
          anchorDate: typeof anchorDate === 'string' ? anchorDate : (Array.isArray(anchorDate) ? anchorDate[0] : ''),
        },
      });
      setLoading(false);
      router.replace('/tenants'); // Navigate to tenant list after success
    } catch (err: any) {
      setError(err?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const baseValid =
      typeof amount === 'string' && amount.trim() &&
      status &&
      !isNaN(parseFloat(typeof amount === 'string' ? amount : '')) &&
      parseFloat(typeof amount === 'string' ? amount : '') > 0;
    return baseValid;
  };

  if (!selectedPropertyId) {
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
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Record Payment</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={Wallet}
            title="No Property Selected"
            subtitle="Please create a property first to record payments"
            actionLabel="Go Back"
            onActionPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Removed fetchingTenants block

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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Record Payment</Text>
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
            <Text style={[styles.title, { color: colors.text.primary }]}>Record Payment</Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Track tenant payment details
            </Text>
          </View>

          <View style={styles.formContainer}>
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.danger[50], borderColor: colors.danger[200] }]}>
                <Text style={[styles.errorText, { color: colors.danger[700] }]}>{error}</Text>
              </View>
            )}
            {/* Status */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Status *</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.border.medium }]} 
                onPress={() => setShowStatusPicker(true)}
                activeOpacity={0.7}
                disabled={loading}>
                <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}> 
                  {status === 'paid' ? 'Paid' : 'Due'}
                </Text>
                <ChevronDown size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            {/* Billing Cycle */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text.primary }]}>Billing Cycle *</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.border.medium }]} 
                onPress={() => setShowFrequencyPicker(true)}
                activeOpacity={0.7}
                disabled={loading}>
                <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}> 
                  {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
                </Text>
                <ChevronDown size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            {/* Anchor Date */}
            <DatePicker
              value={typeof anchorDate === 'string' ? anchorDate : (Array.isArray(anchorDate) ? anchorDate[0] : '')}
              onChange={setAnchorDate}
              label="Anchor Date"
              disabled={loading}
              required
              restrictToLast30Days={true}
            />
            <Text style={[styles.helperText, { color: colors.text.secondary, marginTop: 2 }]}>The anchor date is the starting point for your billing cycle. Payments will be scheduled based on this date.</Text>
            {/* Next Due Date (not editable, boxed) */}
            {/* Next Due Date removed from UI */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.primary[500],
                  opacity: loading || !isFormValid() ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={loading || !isFormValid()}>
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.white }]}>
                  Add Tenant
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Tenant selection modal removed */}

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
                  onPress={() => {
                    handleStatusChange(s.value as 'paid' | 'due' | 'overdue');
                    setShowStatusPicker(false);
                  }}
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

      <Modal
        visible={showFrequencyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFrequencyPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.white }]}> 
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}> 
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Select Billing Cycle</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {(['monthly', 'day-wise'] as Array<'monthly' | 'day-wise'>).map((cycle, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.modalOption, { borderBottomColor: colors.border.light }]} 
                  onPress={() => {
                    setBillingCycle(cycle);
                    setShowFrequencyPicker(false);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      {
                        color:
                          billingCycle === cycle ? colors.primary[500] : colors.text.primary,
                        fontWeight:
                          billingCycle === cycle
                            ? typography.fontWeight.semibold
                            : typography.fontWeight.regular,
                      },
                    ]}>
                    {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { borderTopColor: colors.border.light }]} 
              onPress={() => setShowFrequencyPicker(false)}
              activeOpacity={0.7}>
              <Text style={[styles.modalCloseButtonText, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
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
  modalOptionContent: {
    gap: spacing.xs,
  },
  modalOptionText: {
    fontSize: typography.fontSize.md,
  },
  modalOptionSubtext: {
    fontSize: typography.fontSize.sm,
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
  helperText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
});

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
  Switch,
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
import UpgradeModal from '@/components/UpgradeModal';
import { clearScreenCache } from '@/services/screenCache';

const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Due' },
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
  const [status, setStatus] = useState<'paid' | 'due'>('paid');
  // Billing settings
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'day-wise'>('monthly');
  // Set anchorDay to today's day of month by default
  function getTodayDay() {
    return new Date().getDate();
  }
  const [anchorDay, setAnchorDay] = useState<number>(getTodayDay());
  const [dayWiseStartDate, setDayWiseStartDate] = useState<string>('');
  const [autoGeneratePayments, setAutoGeneratePayments] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [showAnchorDayPicker, setShowAnchorDayPicker] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (joinDate) {
      // Extract day of month from joinDate
      const joinDateObj = new Date(joinDate);
      setAnchorDay(joinDateObj.getDate());
      // Set day-wise start date to join date by default
      setDayWiseStartDate(joinDate);
    }
  }, [joinDate]);

  // When switching billing cycles, ensure anchor day is valid for the selected cycle
  useEffect(() => {
    const dayWiseOptions = [1, 3, 5, 7, 10, 14, 15, 21, 30, 45, 60, 90];
    
    if (billingCycle === 'day-wise' && !dayWiseOptions.includes(anchorDay)) {
      // Default to 7 days for day-wise billing if current value is not in the list
      setAnchorDay(7);
    } else if (billingCycle === 'monthly' && (anchorDay < 1 || anchorDay > 31)) {
      // Default to today's day for monthly billing if current value is out of range
      setAnchorDay(getTodayDay());
    }
  }, [billingCycle]);

  // Validate required fields
  useEffect(() => {
    // Removed due date calculation effect
  }, [billingCycle]);

  const handleStatusChange = (newStatus: 'paid' | 'due') => {
    if (newStatus === 'paid' || newStatus === 'due') {
      setStatus(newStatus);
      
      // If status is 'due', set anchor day to today for MONTHLY billing only
      // For day-wise, user still needs to choose the interval
      if (newStatus === 'due') {
        const today = new Date();
        if (billingCycle === 'monthly') {
          setAnchorDay(today.getDate());
        }
        setDayWiseStartDate(today.toISOString().split('T')[0]);
      }
    }
  };

  const handleSubmit = async () => {
    // Only require tenant + status. If autoGeneratePayments is true, also require billingCycle
    if (!name || !phone || !rent || !joinDate || !roomId || !bedId || !propertyId) {
      setError('All required fields must be filled');
      return;
    }

    // If auto-generating payments, require billing config
    if (autoGeneratePayments && !billingCycle) {
      setError('Billing Cycle is required for auto-generated payments');
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
        anchorDay,
      };
      // Call backend to create tenant
      const tenantPayload: any = {
        ...payload.tenant,
        autoGeneratePayments,
      };
      
      // Only include billingConfig if auto-generating payments
      if (autoGeneratePayments) {
        tenantPayload.billingConfig = {
          status,
          billingCycle,
          anchorDay: anchorDay,
        };
        // For day-wise, include the start date
        if (billingCycle === 'day-wise' && dayWiseStartDate) {
          tenantPayload.billingConfig.dayWiseStartDate = dayWiseStartDate;
        }
      }

      await tenantService.createTenant(tenantPayload);
      clearScreenCache('tenants:');
      clearScreenCache('dashboard:');
      clearScreenCache('payments:');
      clearScreenCache('manage-beds:');
      clearScreenCache('room-beds:');
      setLoading(false);
      router.replace('/tenants'); // Navigate to tenant list after success
    } catch (err: any) {
      setError(err?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    // Base tenant fields must always be filled
    const baseValid = 
      name && 
      phone && 
      rent && 
      joinDate && 
      roomId && 
      bedId && 
      status && 
      !isNaN(parseFloat(rent)) && 
      parseFloat(rent) > 0;

    // If auto-generating payments, also check billing config
    if (autoGeneratePayments) {
      return baseValid && billingCycle;
    }

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
                style={[
                  styles.pickerButton, 
                  { 
                    backgroundColor: !autoGeneratePayments ? colors.neutral[100] : colors.white, 
                    borderColor: colors.border.medium 
                  }
                ]} 
                onPress={() => setShowStatusPicker(true)}
                activeOpacity={0.7}
                disabled={loading || !autoGeneratePayments}>
                <Text style={[styles.pickerButtonText, { color: !autoGeneratePayments ? colors.text.tertiary : colors.text.primary }]}> 
                  {status === 'paid' ? 'Paid' : 'Due'}
                </Text>
                <ChevronDown size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Billing Configuration - Only show when auto-generate is ENABLED */}
            {autoGeneratePayments && (
              <>
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
                {/* Anchor Day */}
                <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text.primary }]}>
                  {billingCycle === 'monthly' ? 'When is rent due?' : 'How often is rent due?'} *
                </Text>
                {status === 'due' && billingCycle === 'monthly' ? (
                  // For monthly + due: lock to today (rent is due today)
                  <View style={[styles.infoBox, { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }]}>
                    <Text style={[styles.infoValue, { color: colors.primary[700] }]}>
                      📅 Day {anchorDay} • Every Month
                    </Text>
                    <Text style={[styles.infoNote, { color: colors.text.secondary }]}>
                      Automatically set to today (rent is due today)
                    </Text>
                  </View>
                ) : (
                  // If status is 'paid', allow selection
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.border.medium }]}
                    onPress={() => setShowAnchorDayPicker(true)}
                    activeOpacity={0.7}
                    disabled={loading}>
                    <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}>
                      {billingCycle === 'monthly' ? `📅 Day ${anchorDay} • Every Month` : `⏰ Every ${anchorDay} days`}
                    </Text>
                    <ChevronDown size={20} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
              {!(status === 'due' && billingCycle === 'monthly') && (
                <Text style={[styles.helperText, { color: colors.text.secondary, marginTop: 2 }]}>
                  {billingCycle === 'monthly' 
                    ? 'Rent is due on the same day every month. Example: Day 2 = Jan 2, Feb 2, Mar 2, Apr 2, etc.' 
                    : 'Rent is due every X days from the start date. Example: Every 15 days = first payment on join date, then after 15 days, 30 days, etc.'}
                </Text>
              )}

              {/* For day-wise, select when the first payment starts */}
              {billingCycle === 'day-wise' && (
                <>
                  {status === 'due' ? (
                    // If status is 'due', show that first payment starts today
                    <View style={[styles.infoBox, { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }]}>
                      <Text style={[styles.infoLabel, { color: colors.text.primary }]}>
                        📌 First Payment Starts:
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.primary[700] }]}>
                        Today ({new Date().toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })})
                      </Text>
                      <Text style={[styles.infoNote, { color: colors.text.secondary }]}>
                        Rent is due today. Next payment will be in {anchorDay} days.
                      </Text>
                    </View>
                  ) : (
                    // If status is 'paid', allow date selection
                    <>
                      <DatePicker
                        value={dayWiseStartDate}
                        onChange={setDayWiseStartDate}
                        label="When should the first payment start?"
                        disabled={loading}
                        required
                        restrictToNext30Days={true}
                      />
                      <Text style={[styles.helperText, { color: colors.text.secondary, marginTop: 2 }]}>
                        Select when the first payment is due. Subsequent payments will be every {anchorDay} days from this date.
                      </Text>
                    </>
                  )}
                </>
              )}
              </>
            )}

            {/* Auto-generate Payments Toggle */}
            <View style={[styles.toggleContainer, { backgroundColor: colors.neutral[50], borderColor: colors.border.light }]}>
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleLabel, { color: colors.text.primary }]}>Auto-Generate Payment</Text>
                <Text style={[styles.toggleDescription, { color: colors.text.secondary }]}>
                  Create an initial payment record for this tenant
                </Text>
              </View>
              <Switch
                value={autoGeneratePayments}
                onValueChange={setAutoGeneratePayments}
                trackColor={{ false: colors.neutral[300], true: colors.primary[200] }}
                thumbColor={autoGeneratePayments ? colors.primary[500] : colors.neutral[400]}
                disabled={loading}
              />
            </View>


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
                    handleStatusChange(s.value as 'paid' | 'due');
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

        <Modal
          visible={showAnchorDayPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAnchorDayPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {billingCycle === 'monthly' ? 'When is rent due?' : 'Rent due every how many days?'}
                </Text>
              </View>
              <ScrollView style={styles.modalScrollView}>
                {(billingCycle === 'monthly' 
                  ? Array.from({ length: 31 }, (_, i) => i + 1)
                  : [1, 3, 5, 7, 10, 14, 15, 21, 30, 45, 60, 90]
                ).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.modalOption, { borderBottomColor: colors.border.light }]}
                    onPress={() => {
                      setAnchorDay(day);
                      setShowAnchorDayPicker(false);
                    }}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.modalOptionText,
                        {
                          color:
                            anchorDay === day ? colors.primary[500] : colors.text.primary,
                          fontWeight:
                            anchorDay === day
                              ? typography.fontWeight.semibold
                              : typography.fontWeight.regular,
                        },
                      ]}>
                      {billingCycle === 'monthly' ? `Day ${day} • Every Month` : `Every ${day} days`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalCloseButton, { borderTopColor: colors.border.light }]}
                onPress={() => setShowAnchorDayPicker(false)}
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  toggleDescription: {
    fontSize: typography.fontSize.xs,
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
  infoBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  infoNote: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
});

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Calendar,
  Plus,
  Edit,
  Pencil,
  Trash2,
  CheckCircle,
  ChevronDown,
} from 'lucide-react-native';
import { Bed as BedIcon } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { tenantService, paymentService, roomService } from '@/services/apiClient';
import type { Tenant, Payment, Room, Bed, BillingFrequency, BillingConfig } from '@/services/apiTypes';
import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import DatePicker from '@/components/DatePicker';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import { cacheKeys, getScreenCache, setScreenCache } from '@/services/screenCache';

interface TenantDetailCachePayload {
  tenant: Tenant;
  payments: Payment[];
  room: Room | null;
}

const TENANT_DETAIL_CACHE_STALE_MS = 30 * 1000;

export default function TenantDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEditBillingModal, setShowEditBillingModal] = useState(false);
  const [editFrequency, setEditFrequency] = useState<'monthly' | 'day-wise'>('monthly');
  const [editAnchorDay, setEditAnchorDay] = useState<number>(1);
  const [editDayWiseStartDate, setEditDayWiseStartDate] = useState<string>('');
  const [editAutoGenerate, setEditAutoGenerate] = useState(true);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [showAnchorDayPicker, setShowAnchorDayPicker] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [editTenantName, setEditTenantName] = useState('');
  const [editTenantPhone, setEditTenantPhone] = useState('');
  const [editTenantRent, setEditTenantRent] = useState('');
  const [tenantActionLoading, setTenantActionLoading] = useState(false);

  const fetchTenantData = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const cacheKey = cacheKeys.tenantDetail(tenantId);
    const cachedData = getScreenCache<TenantDetailCachePayload>(cacheKey, TENANT_DETAIL_CACHE_STALE_MS);
    if (cachedData) {
      setTenant(cachedData.tenant);
      setPayments(cachedData.payments);
      setRoom(cachedData.room);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Only fetch what we need for this tenant
      const tenantRes = await tenantService.getTenantById(tenantId);

      if (tenantRes.data) {
        setTenant(tenantRes.data);
        
        // Only fetch payments/room data if tenant exists
        const [paymentsRes, roomRes] = await Promise.all([
          paymentService.getPayments(tenantRes.data.propertyId, { tenantId, page: 1, pageSize: 50 }),
          tenantRes.data.roomId ? roomService.getRoomById(tenantRes.data.roomId) : Promise.resolve({ data: null }),
        ]);

        if (paymentsRes.data) {
          const tenantPayments = paymentsRes.data
            .sort((a, b) => new Date(b.dueDate ?? '').getTime() - new Date(a.dueDate ?? '').getTime());
          setPayments(tenantPayments);

          setScreenCache(cacheKey, {
            tenant: tenantRes.data,
            payments: tenantPayments,
            room: roomRes?.data || null,
          });
        }

        if (roomRes?.data) {
          setRoom(roomRes.data);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTenantData();
    }, [tenantId])
  );

  const handleRetry = () => {
    fetchTenantData();
  };

  const calculateNextBillingDate = (anchorDay: number, frequency: BillingFrequency): string => {
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), today.getMonth(), anchorDay);
    if (nextDate < today) {
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, anchorDay);
    }
    return nextDate.toISOString();
  };

  const openEditBillingModal = () => {
    if (!tenant) return;

    setEditAutoGenerate(tenant.autoGeneratePayments === true);

    if (tenant.billingConfig) {
      setEditFrequency(tenant.billingConfig.billingCycle);
      setEditAnchorDay(tenant.billingConfig.anchorDay || 1);
      setEditDayWiseStartDate(tenant.billingConfig.dayWiseStartDate || tenant.joinDate || '');
    }
    setShowEditBillingModal(true);
  };

  const handleSaveBillingConfig = async () => {
    if (!tenant) return;

    try {
      setEditLoading(true);

      let nextBillingConfig: BillingConfig | null | undefined = tenant.billingConfig;

      if (editAutoGenerate) {
        const billingConfig: BillingConfig = {
          billingCycle: editFrequency,
          anchorDay: editAnchorDay,
          status: tenant.billingConfig?.status || 'due',
        };

        if (editFrequency === 'day-wise' && editDayWiseStartDate) {
          billingConfig.dayWiseStartDate = editDayWiseStartDate;
        }

        nextBillingConfig = billingConfig;
      } else {
        nextBillingConfig = undefined;
      }

      await tenantService.updateTenant(tenant.id, {
        autoGeneratePayments: editAutoGenerate,
        billingConfig: editAutoGenerate ? nextBillingConfig : null,
      });

      setTenant({
        ...tenant,
        autoGeneratePayments: editAutoGenerate,
        billingConfig: nextBillingConfig,
      });

      setShowEditBillingModal(false);
    } catch (err: any) {
      console.error('Failed to update billing config:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const calculateFinancialSummary = () => {
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => {
        const amount = typeof p.amount === 'string'
          ? parseFloat(p.amount.replace(/[^0-9]/g, ''))
          : p.amount;
        return sum + amount;
      }, 0);

    const latestPayment = payments[0] || null;

    const outstanding = latestPayment && latestPayment.status !== 'paid'
      ? typeof latestPayment.amount === 'string'
        ? parseFloat(latestPayment.amount.replace(/[^0-9]/g, ''))
        : latestPayment.amount
      : 0;

    return {
      totalPaid,
      latestPayment,
      outstanding,
    };
  };

  const handleAddPayment = () => {
    const { latestPayment } = calculateFinancialSummary();

    if (latestPayment && latestPayment.status !== 'paid') {
      router.push(`/edit-payment?paymentId=${latestPayment.id}`);
    } else {
      router.push(`/add-payment?tenantId=${tenantId}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateYYYYMMMDD = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateNextDueDate = (lastDueDate: string): string => {
    if (!lastDueDate) return '';
    const lastDue = new Date(lastDueDate);
    if (isNaN(lastDue.getTime())) return '';
    const nextDue = new Date(lastDue);
    nextDue.setMonth(nextDue.getMonth() + 1);
    return isNaN(nextDue.getTime()) ? '' : nextDue.toISOString();
  };

  const handleMarkAsPaid = async () => {
    if (!latestPayment) return;

    router.push(`/edit-payment?paymentId=${latestPayment.id}`);
  };

  const handleGenerateDue = () => {
    router.push(`/add-payment?tenantId=${tenantId}`);
  };

  const openEditTenantModal = () => {
    if (!tenant) return;
    setEditTenantName(tenant.name || '');
    setEditTenantPhone(tenant.phone || '');
    setEditTenantRent(tenant.rent || '');
    setShowEditTenantModal(true);
  };

  const handleUpdateTenant = async () => {
    if (!tenant) return;

    const name = editTenantName.trim();
    const phone = editTenantPhone.trim();
    const rent = editTenantRent.trim();

    if (!name || !phone || !rent) {
      Alert.alert('Validation', 'Name, phone, and rent are required.');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      Alert.alert('Validation', 'Phone must be 10 digits.');
      return;
    }

    try {
      setTenantActionLoading(true);
      const response = await tenantService.updateTenant(tenant.id, {
        name,
        phone,
        rent,
      });
      if (response.data) {
        setTenant((prev) => prev ? { ...prev, ...response.data } : prev);
      }
      setShowEditTenantModal(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update tenant');
    } finally {
      setTenantActionLoading(false);
    }
  };

  const handleDeleteTenant = () => {
    if (!tenant) return;

    Alert.alert(
      'Delete Tenant',
      `Are you sure you want to delete ${tenant.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setTenantActionLoading(true);
              await tenantService.deleteTenant(tenant.id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete tenant');
            } finally {
              setTenantActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
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
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Tenant Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Skeleton height={200} count={3} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!tenant) {
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
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Tenant Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <EmptyState
            icon={User}
            title="Tenant Not Found"
            subtitle="The selected tenant could not be found"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { totalPaid, latestPayment, outstanding } = calculateFinancialSummary();

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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Tenant Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconActionButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }]}
            onPress={openEditTenantModal}
            activeOpacity={0.7}
            disabled={tenantActionLoading}>
            <Pencil size={16} color={colors.primary[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconActionButton, { backgroundColor: colors.danger[50], borderColor: colors.danger[200] }]}
            onPress={handleDeleteTenant}
            activeOpacity={0.7}
            disabled={tenantActionLoading}>
            <Trash2 size={16} color={colors.danger[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ApiErrorCard error={error} onRetry={handleRetry} />
        ) : (
          <>
            <Card style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary[500] }]}>
                  <Text style={[styles.avatarText, { color: colors.white }]}>
                    {tenant.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.tenantName, { color: colors.text.primary }]}>
                    {tenant.name}
                  </Text>
                  {latestPayment && (
                    <StatusBadge status={latestPayment.status} />
                  )}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

              <View style={styles.contactSection}>
                <View style={styles.contactItem}>
                  <Text style={[styles.contactText, { color: colors.text.primary }]}>Document ID: {tenant.documentId}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Phone size={16} color={colors.text.secondary} />
                  <Text style={[styles.contactText, { color: colors.text.primary }]}>
                    {tenant.phone}
                  </Text>
                </View>
                <View style={styles.contactItem}>
                  <Calendar size={16} color={colors.text.secondary} />
                  <Text style={[styles.contactText, { color: colors.text.primary }]}>
                    Joined {formatDate(tenant.joinDate)}
                  </Text>
                </View>
                {tenant.roomNumber && tenant.bedNumber && (
                  <View style={styles.contactItem}>
                    <BedIcon size={16} color={colors.text.secondary} />
                    <Text style={[styles.contactText, { color: colors.text.primary }]}>Room {tenant.roomNumber} - Bed {tenant.bedNumber}</Text>
                  </View>
                )}
              </View>
            </Card>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Financial Summary
                </Text>
              </View>

              <Card style={styles.summaryCard}>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
                      Total Paid
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.success[500] }]}>
                      ₹{totalPaid.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
                      Monthly Rent
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                      {tenant.rent}
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
                      Outstanding
                    </Text>
                    <Text style={[styles.summaryValue, { color: outstanding > 0 ? colors.danger[500] : colors.text.primary }]}>
                      ₹{outstanding.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Billing Configuration
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary[500] }]}
                  onPress={openEditBillingModal}
                  activeOpacity={0.7}>
                  <Edit size={16} color={colors.white} />
                  <Text style={[styles.actionButtonText, { color: colors.white }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <Card style={styles.billingCard}>
                {tenant?.billingConfig ? (
                  <>
                    <View style={styles.billingRow}>
                      <Text style={[styles.billingLabel, { color: colors.text.secondary }]}>
                        Billing Frequency
                      </Text>
                      <Text style={[styles.billingValue, { color: colors.text.primary }]}>
                        {tenant.billingConfig.billingCycle ? (tenant.billingConfig.billingCycle.charAt(0).toUpperCase() + tenant.billingConfig.billingCycle.slice(1)) : ''}
                      </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                    <View style={styles.billingRow}>
                      <Text style={[styles.billingLabel, { color: colors.text.secondary }]}>
                        Anchor Day
                      </Text>
                      <Text style={[styles.billingValue, { color: colors.text.primary }]}>
                        {tenant.billingConfig.anchorDay}th of every month
                      </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                    <View style={styles.billingRow}>
                      <Text style={[styles.billingLabel, { color: colors.text.secondary }]}>
                        Next Billing Date
                      </Text>
                      <Text style={[styles.billingValue, { color: colors.primary[600] }]}>
                        {formatDateYYYYMMMDD(calculateNextBillingDate(tenant.billingConfig.anchorDay || 1, 'monthly'))}
                      </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                    {/* Auto-Generate logic removed, not present in BillingConfig type */}
                  </>
                ) : (
                  <Text style={[styles.noBillingText, { color: colors.text.secondary }]}>
                    No billing configuration set
                  </Text>
                )}
              </Card>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Payment History
                </Text>
                {latestPayment && latestPayment.status === 'due' ? (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.success[500] }]}
                    onPress={handleMarkAsPaid}
                    activeOpacity={0.7}>
                    <CheckCircle size={16} color={colors.white} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      Mark as Paid
                    </Text>
                  </TouchableOpacity>
                ) : !latestPayment ? (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary[500] }]}
                    onPress={handleGenerateDue}
                    activeOpacity={0.7}>
                    <Plus size={16} color={colors.white} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      Generate Due
                    </Text>
                  </TouchableOpacity>
                ) : latestPayment.status === 'paid' ? (
                  <View style={[styles.nextDueContainer, { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }]}>
                    <Calendar size={14} color={colors.primary[600]} />
                    <Text style={[styles.nextDueText, { color: colors.primary[700] }]}>
                      Next Due: {formatDateYYYYMMMDD(calculateNextDueDate(latestPayment.dueDate ?? ''))}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.warning[500] }]}
                    onPress={handleMarkAsPaid}
                    activeOpacity={0.7}>
                    <Edit size={16} color={colors.white} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      Edit Overdue
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {payments.length === 0 ? (
                <Card style={styles.emptyPaymentCard}>
                  <EmptyState
                    icon={Wallet}
                    title="No Payments Yet"
                    subtitle="Payment history will appear here"
                  />
                </Card>
              ) : (
                <>
                  {payments.map((payment, index) => (
                    <Card key={index} style={styles.paymentCard}>
                      <View style={styles.paymentHeader}>
                        <View style={styles.paymentLeft}>
                          <Text style={[styles.paymentAmount, { color: colors.text.primary }]}>
                            {payment.amount}
                          </Text>
                          <Text style={[styles.paymentMethod, { color: colors.text.secondary }]}>
                            {payment.method || 'Pending'}
                          </Text>
                        </View>
                        <StatusBadge status={payment.status} />
                      </View>

                      <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                      <View style={styles.paymentDetails}>
                        <View style={styles.paymentDetailRow}>
                          <Text style={[styles.paymentDetailLabel, { color: colors.text.secondary }]}>
                            Due Date:
                          </Text>
                          <Text style={[styles.paymentDetailValue, { color: colors.text.primary }]}>
                            {formatDate(payment.dueDate ?? '')}
                          </Text>
                        </View>

                        {/* Removed payment.date logic, not present in Payment type */}
                      </View>
                    </Card>
                  ))}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showEditTenantModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditTenantModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowEditTenantModal(false)}
              activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Edit Tenant</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Name</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.white, borderColor: colors.border.medium, color: colors.text.primary }]}
                  value={editTenantName}
                  onChangeText={setEditTenantName}
                  placeholder="Enter tenant name"
                  placeholderTextColor={colors.text.tertiary}
                  editable={!tenantActionLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Phone</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.white, borderColor: colors.border.medium, color: colors.text.primary }]}
                  value={editTenantPhone}
                  onChangeText={setEditTenantPhone}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="Enter 10-digit phone"
                  placeholderTextColor={colors.text.tertiary}
                  editable={!tenantActionLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Rent</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.white, borderColor: colors.border.medium, color: colors.text.primary }]}
                  value={editTenantRent}
                  onChangeText={setEditTenantRent}
                  placeholder="Enter rent amount"
                  placeholderTextColor={colors.text.tertiary}
                  editable={!tenantActionLoading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.primary[500],
                    opacity: tenantActionLoading ? 0.6 : 1,
                  },
                ]}
                onPress={handleUpdateTenant}
                activeOpacity={0.8}
                disabled={tenantActionLoading}>
                {tenantActionLoading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: colors.white }]}>Save Tenant</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showEditBillingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditBillingModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowEditBillingModal(false)}
              activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Edit Billing</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.formContainer}>
              <View style={[styles.toggleContainer, { backgroundColor: colors.white, borderColor: colors.border.medium }]}>
                <View style={styles.toggleLabel}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Enable Auto-Generate</Text>
                  <Text style={[styles.toggleHint, { color: colors.text.secondary }]}>
                    Automatically generate due payments
                  </Text>
                </View>
                <Switch
                  value={editAutoGenerate}
                  onValueChange={setEditAutoGenerate}
                  disabled={editLoading}
                  trackColor={{ false: colors.border.medium, true: colors.primary[200] }}
                  thumbColor={editAutoGenerate ? colors.primary[500] : colors.text.tertiary}
                />
              </View>

              {editAutoGenerate && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text.primary }]}>Billing Frequency</Text>
                    <TouchableOpacity
                      style={[
                        styles.pickerButton,
                        {
                          backgroundColor: colors.white,
                          borderColor: colors.border.medium,
                        },
                      ]}
                      onPress={() => setShowFrequencyPicker(true)}
                      activeOpacity={0.7}
                      disabled={editLoading}>
                      <Text
                        style={[
                          styles.pickerButtonText,
                          {
                            color: colors.text.primary,
                          },
                        ]}>
                        {editFrequency ? (editFrequency.charAt(0).toUpperCase() + editFrequency.slice(1)) : ''}
                      </Text>
                      <ChevronDown size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text.primary }]}>
                      {editFrequency === 'monthly' ? 'When is rent due each month?' : 'How often is rent due?'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.border.medium }]}
                      onPress={() => setShowAnchorDayPicker(true)}
                      activeOpacity={0.7}
                      disabled={editLoading}>
                      <Text style={[styles.pickerButtonText, { color: colors.text.primary }]}>
                        {editFrequency === 'monthly' ? `📅 Day ${editAnchorDay} • Every Month` : `⏰ Every ${editAnchorDay} days`}
                      </Text>
                      <ChevronDown size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    <Text style={[styles.summaryLabel, { color: colors.text.secondary, marginTop: spacing.xs }]}>
                      {editFrequency === 'monthly' 
                        ? 'Rent is due on the same day every month. Example: Day 2 = Jan 2, Feb 2, Mar 2, Apr 2, etc.' 
                        : 'Rent is due every X days from the join date. Example: Every 15 days = first payment on join date, then after 15 days, 30 days, etc.'}
                    </Text>

                    {/* For day-wise, select when the first payment starts */}
                    {editFrequency === 'day-wise' && (
                      <>
                        <DatePicker
                          value={editDayWiseStartDate}
                          onChange={setEditDayWiseStartDate}
                          label="When should the first payment start?"
                          disabled={editLoading}
                          required
                          restrictToNext30Days={true}
                        />
                        <Text style={[styles.summaryLabel, { color: colors.text.secondary, marginTop: spacing.xs }]}>
                          Select when the first payment is due. Subsequent payments will be every {editAnchorDay} days from this date.
                        </Text>
                      </>
                    )}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: colors.primary[500],
                    opacity: editLoading ? 0.6 : 1,
                  },
                ]}
                onPress={handleSaveBillingConfig}
                activeOpacity={0.8}
                disabled={editLoading}>
                {editLoading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: colors.white }]}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showFrequencyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFrequencyPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.white }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border.light }]}>
              <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>
                Select Frequency
              </Text>
            </View>

            <ScrollView style={styles.pickerScrollView}>
              {(['monthly', 'day-wise'] as BillingConfig['billingCycle'][]).map((freq, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pickerOption,
                    { borderBottomColor: colors.border.light },
                  ]}
                  onPress={() => {
                    setEditFrequency(freq);
                    setShowFrequencyPicker(false);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      {
                        color:
                          editFrequency === freq
                            ? colors.primary[500]
                            : colors.text.primary,
                        fontWeight:
                          editFrequency === freq
                            ? typography.fontWeight.semibold
                            : typography.fontWeight.regular,
                      },
                    ]}>
                    {freq ? (freq.charAt(0).toUpperCase() + freq.slice(1)) : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.pickerCloseButton, { borderTopColor: colors.border.light }]}
              onPress={() => setShowFrequencyPicker(false)}
              activeOpacity={0.7}>
              <Text style={[styles.pickerCloseButtonText, { color: colors.text.secondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Anchor Day Picker Modal */}
      <Modal
        visible={showAnchorDayPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAnchorDayPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.white }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border.light }]}>
              <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>
                {editFrequency === 'monthly' ? 'When is rent due each month?' : 'Rent due every how many days?'}
              </Text>
            </View>
            <ScrollView style={styles.pickerScrollView}>
              {(editFrequency === 'monthly' 
                ? Array.from({ length: 31 }, (_, i) => i + 1)
                : [1, 3, 5, 7, 10, 14, 15, 21, 30, 45, 60, 90]
              ).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.pickerOption, { borderBottomColor: colors.border.light }]}
                  onPress={() => {
                    setEditAnchorDay(day);
                    setShowAnchorDayPicker(false);
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      {
                        color:
                          editAnchorDay === day ? colors.primary[500] : colors.text.primary,
                        fontWeight:
                          editAnchorDay === day
                            ? typography.fontWeight.semibold
                            : typography.fontWeight.regular,
                      },
                    ]}>
                    {editFrequency === 'monthly' ? `Day ${day} • Every Month` : `Every ${day} days`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.pickerCloseButton, { borderTopColor: colors.border.light }]}
              onPress={() => setShowAnchorDayPicker(false)}
              activeOpacity={0.7}>
              <Text style={[styles.pickerCloseButtonText, { color: colors.text.secondary }]}>
                Cancel
              </Text>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconActionButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  tenantName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },
  contactSection: {
    gap: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactText: {
    fontSize: typography.fontSize.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  summaryCard: {
    paddingVertical: spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  emptyPaymentCard: {
    paddingVertical: spacing.xl,
  },
  paymentCard: {
    marginBottom: spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  paymentMethod: {
    fontSize: typography.fontSize.sm,
  },
  paymentDetails: {
    gap: spacing.sm,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentDetailLabel: {
    fontSize: typography.fontSize.sm,
  },
  paymentDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    ...shadows.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  nextDueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  nextDueText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  billingCard: {
    paddingVertical: spacing.lg,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  billingStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  billingLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  billingValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  infoBanner: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  infoBannerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  noBillingText: {
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  modalScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  formContainer: {
    width: '100%',
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  toggleLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleHint: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  textInput: {
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '50%',
    ...shadows.xl,
  },
  pickerHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
  pickerScrollView: {
    maxHeight: 250,
  },
  pickerOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  pickerOptionText: {
    fontSize: typography.fontSize.md,
  },
  pickerCloseButton: {
    padding: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  pickerCloseButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  infoBox: {
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

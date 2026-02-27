import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
  Bed as BedIcon,
  Plus,
  Edit,
} from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { tenantService, paymentService, roomService, bedService } from '@/services/apiClient';
import type { Tenant, Payment, Room, Bed } from '@/services/apiTypes';
import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';

export default function TenantDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [bed, setBed] = useState<Bed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantData = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tenantRes, paymentsRes, roomsRes, bedsRes] = await Promise.all([
        tenantService.getTenantById(tenantId),
        paymentService.getPayments(),
        roomService.getRooms(),
        bedService.getBeds(),
      ]);

      if (tenantRes.data) {
        setTenant(tenantRes.data);

        if (paymentsRes.data) {
          const tenantPayments = paymentsRes.data
            .filter(p => p.tenantId === tenantId)
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
          setPayments(tenantPayments);
        }

        if (bedsRes.data) {
          const tenantBed = bedsRes.data.find(b => b.id === tenantRes.data.bedId);
          setBed(tenantBed || null);

          if (tenantBed && roomsRes.data) {
            const tenantRoom = roomsRes.data.find(r => r.id === tenantBed.roomId);
            setRoom(tenantRoom || null);
          }
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
        <View style={styles.placeholder} />
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
                  <Mail size={16} color={colors.text.secondary} />
                  <Text style={[styles.contactText, { color: colors.text.primary }]}>
                    {tenant.email}
                  </Text>
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
                {room && bed && (
                  <View style={styles.contactItem}>
                    <BedIcon size={16} color={colors.text.secondary} />
                    <Text style={[styles.contactText, { color: colors.text.primary }]}>
                      Room {room.roomNumber} - Bed {bed.bedNumber}
                    </Text>
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
                  Payment History
                </Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary[500] }]}
                  onPress={handleAddPayment}
                  activeOpacity={0.7}>
                  {latestPayment && latestPayment.status !== 'paid' ? (
                    <Edit size={16} color={colors.white} />
                  ) : (
                    <Plus size={16} color={colors.white} />
                  )}
                  <Text style={[styles.addButtonText, { color: colors.white }]}>
                    {latestPayment && latestPayment.status !== 'paid' ? 'Edit' : 'Add'}
                  </Text>
                </TouchableOpacity>
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
                            {formatDate(payment.dueDate)}
                          </Text>
                        </View>

                        {payment.date && (
                          <View style={styles.paymentDetailRow}>
                            <Text style={[styles.paymentDetailLabel, { color: colors.text.secondary }]}>
                              Paid Date:
                            </Text>
                            <Text style={[styles.paymentDetailValue, { color: colors.success[500] }]}>
                              {formatDate(payment.date)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  ))}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
});

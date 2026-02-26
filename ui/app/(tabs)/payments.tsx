import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import PropertySwitcher from '@/components/PropertySwitcher';
import StatusBadge from '@/components/StatusBadge';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import UpgradeModal from '@/components/UpgradeModal';
import {
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Wallet,
  Building2,
} from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { paymentService } from '@/services/apiClient';
import type { Payment } from '@/services/apiTypes';

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedProperty, selectedPropertyId, loading: propertyLoading } = useProperty();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchPayments = async () => {
    if (!selectedPropertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.getPayments();
      const data = (response.data || []).filter(p => p.propertyId === selectedPropertyId);
      setPayments(data);
      setTotal(data.length);
    } catch (err: any) {
      if (err?.code === 'upgrade_required') {
        setShowUpgradeModal(true);
      } else {
        setError(err?.message || 'Failed to load payments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!propertyLoading) {
      fetchPayments();
    }
  }, [selectedPropertyId, propertyLoading]);

  const handleRetry = () => {
    fetchPayments();
  };

  const computeStats = () => {
    const collected = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => {
        const amount = typeof p.amount === 'string'
          ? parseFloat(p.amount.replace(/[^0-9]/g, ''))
          : p.amount;
        return sum + amount;
      }, 0);

    const pending = payments
      .filter((p) => p.status === 'due')
      .reduce((sum, p) => {
        const amount = typeof p.amount === 'string'
          ? parseFloat(p.amount.replace(/[^0-9]/g, ''))
          : p.amount;
        return sum + amount;
      }, 0);

    const overdue = payments
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => {
        const amount = typeof p.amount === 'string'
          ? parseFloat(p.amount.replace(/[^0-9]/g, ''))
          : p.amount;
        return sum + amount;
      }, 0);

    return {
      collected: `₹${collected.toLocaleString()}`,
      pending: `₹${pending.toLocaleString()}`,
      overdue: `₹${overdue.toLocaleString()}`,
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={20} color={colors.success[500]} />;
      case 'due':
        return <Clock size={20} color={colors.primary[500]} />;
      case 'overdue':
        return <AlertCircle size={20} color={colors.danger[500]} />;
    }
  };

  if (propertyLoading || loading) {
    return (
      <ScreenContainer edges={['top']}>
        <PropertySwitcher />
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Payments</Text>
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]} activeOpacity={0.7}>
            <Filter size={20} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.statsContainer}>
            <Skeleton height={80} count={3} />
          </View>
          <Skeleton height={150} count={2} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!selectedProperty) {
    return (
      <ScreenContainer edges={['top']}>
        <PropertySwitcher />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <EmptyState
            icon={Building2}
            title="No Properties Found"
            subtitle="Create your first property to get started"
            actionLabel="Create Property"
            onActionPress={() => router.push('/property-form')}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  const stats = computeStats();

  return (
    <ScreenContainer edges={['top']}>
      <PropertySwitcher />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Payments</Text>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]} activeOpacity={0.7}>
          <Filter size={20} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ApiErrorCard error={error} onRetry={handleRetry} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No Payments Yet"
            subtitle="Payment history will appear here once tenants start making payments"
          />
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Collected</Text>
                <Text style={[styles.statAmount, styles.collected, { color: colors.success[500] }]}>
                  {stats.collected}
                </Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Pending</Text>
                <Text style={[styles.statAmount, styles.pending, { color: colors.primary[500] }]}>
                  {stats.pending}
                </Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Overdue</Text>
                <Text style={[styles.statAmount, styles.overdue, { color: colors.danger[500] }]}>
                  {stats.overdue}
                </Text>
              </Card>
            </View>

            <View style={styles.paymentsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>All Payments</Text>

              {payments.map((payment, index) => (
                <Card key={index} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.statusIconContainer}>
                      {getStatusIcon(payment.status)}
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={[styles.tenantName, { color: colors.text.primary }]}>{payment.tenantName}</Text>
                      <Text style={[styles.propertyName, { color: colors.text.secondary }]}>{selectedProperty.name}</Text>
                      <Text style={[styles.bedNumber, { color: colors.text.tertiary }]}>Bed: {payment.bed}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                      <Text style={[styles.amount, { color: colors.text.primary }]}>{payment.amount}</Text>
                      <StatusBadge status={payment.status} />
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                  <View style={styles.paymentFooter}>
                    <View style={styles.dateRow}>
                      <Calendar size={14} color={colors.text.secondary} />
                      <Text style={[styles.dateLabel, { color: colors.text.secondary }]}>Due:</Text>
                      <Text style={[styles.dateValue, { color: colors.text.primary }]}>{payment.dueDate}</Text>
                    </View>
                    {payment.date && (
                      <View style={styles.methodRow}>
                        <Text style={[styles.methodLabel, { color: colors.text.secondary }]}>Paid via:</Text>
                        <Text style={[styles.methodValue, { color: colors.primary[500] }]}>{payment.method}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSelectPlan={() => setShowUpgradeModal(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.sm,
  },
  statAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  collected: {
  },
  pending: {
  },
  overdue: {
  },
  paymentsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  paymentCard: {
    marginBottom: spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusIconContainer: {
    marginRight: spacing.md,
  },
  paymentInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  propertyName: {
    fontSize: typography.fontSize.sm,
    marginBottom: 2,
  },
  bedNumber: {
    fontSize: typography.fontSize.xs,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  paymentFooter: {
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  dateValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodLabel: {
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs,
  },
  methodValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

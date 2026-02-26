import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import PropertySwitcher from '@/components/PropertySwitcher';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import SubscriptionSummaryCard from '@/components/SubscriptionSummaryCard';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import UpgradeModal from '@/components/UpgradeModal';
import {
  Building2,
  Users,
  Bed,
  TrendingUp,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import { spacing, typography, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import {
  tenantService,
  paymentService,
  bedService,
} from '@/services/apiClient';
import type { Tenant, Payment, Bed as BedType } from '@/services/apiTypes';

interface DashboardData {
  tenants: Tenant[];
  payments: Payment[];
  duePayments: Payment[];
  overduePayments: Payment[];
  beds: BedType[];
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedProperty, selectedPropertyId, loading: propertyLoading } = useProperty();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchDashboardData = async () => {
    if (!selectedPropertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tenantsRes, paymentsRes, bedsRes] = await Promise.all([
        tenantService.getTenants(),
        paymentService.getPayments(),
        bedService.getBeds(),
      ]);

      const tenants = (tenantsRes.data || []).filter(t => t.propertyId === selectedPropertyId);
      const payments = (paymentsRes.data || []).filter(p => p.propertyId === selectedPropertyId);
      const beds = (bedsRes.data || []).filter(b => b.propertyId === selectedPropertyId);

      const duePayments = payments.filter((p) => p.status === 'due');
      const overduePayments = payments.filter((p) => p.status === 'overdue');

      setDashboardData({
        tenants,
        payments,
        duePayments,
        overduePayments,
        beds,
      });
    } catch (err: any) {
      if (err?.code === 'upgrade_required') {
        setShowUpgradeModal(true);
      } else {
        setError(err?.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!propertyLoading) {
        fetchDashboardData();
      }
    }, [selectedPropertyId, propertyLoading])
  );

  const handleRetry = () => {
    fetchDashboardData();
  };

  if (propertyLoading || loading) {
    return (
      <ScreenContainer edges={['top']}>
        <PropertySwitcher />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.text.secondary }]}>Welcome back,</Text>
            <Text style={[styles.ownerName, { color: colors.text.primary }]}>Property Owner</Text>
          </View>
          <Skeleton height={120} count={2} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!selectedProperty) {
    return (
      <ScreenContainer edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.text.secondary }]}>Welcome back,</Text>
            <Text style={[styles.ownerName, { color: colors.text.primary }]}>Property Owner</Text>
          </View>
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

  const totalBeds = dashboardData?.beds.length || 0;
  const occupiedBeds = dashboardData?.beds.filter(b => b.status === 'occupied').length || 0;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const stats = [
    {
      icon: Bed,
      label: 'Total Beds',
      value: String(totalBeds),
      color: colors.purple[500],
    },
    {
      icon: Users,
      label: 'Tenants',
      value: String(occupiedBeds),
      color: colors.success[500],
    },
    {
      icon: TrendingUp,
      label: 'Occupancy',
      value: `${occupancyRate}%`,
      color: colors.warning[500],
    },
  ];

  return (
    <ScreenContainer edges={['top']}>
      <PropertySwitcher />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <>
            <View style={styles.header}>
              <Text style={[styles.greeting, { color: colors.text.secondary }]}>Welcome back,</Text>
              <Text style={[styles.ownerName, { color: colors.text.primary }]}>Property Owner</Text>
            </View>
            <ApiErrorCard error={error} onRetry={handleRetry} />
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={[styles.greeting, { color: colors.text.secondary }]}>Welcome back,</Text>
              <Text style={[styles.ownerName, { color: colors.text.primary }]}>Property Owner</Text>
            </View>

            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <Card key={index} style={styles.statCard}>
                  <View style={[styles.iconContainer, { backgroundColor: stat.color }]}>
                    <stat.icon size={20} color={colors.white} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{stat.label}</Text>
                </Card>
              ))}
            </View>

            <SubscriptionSummaryCard />

            {dashboardData && dashboardData.duePayments.length > 0 && (
              <View style={styles.section}>
                <SectionHeader icon={Clock} iconColor={colors.primary[500]} title="Due Soon" />
                {dashboardData.duePayments.map((payment, index) => (
                  <Card key={index} style={styles.paymentCard}>
                    <View style={styles.paymentRow}>
                      <View style={styles.paymentInfo}>
                        <Text style={[styles.paymentName, { color: colors.text.primary }]}>
                          {payment.tenantName}
                        </Text>
                        <Text style={[styles.paymentRoom, { color: colors.text.secondary }]}>
                          Room {payment.bed}
                        </Text>
                      </View>
                      <View style={styles.paymentRight}>
                        <Text style={[styles.paymentAmount, { color: colors.text.primary }]}>
                          {payment.amount}
                        </Text>
                        <Text style={[styles.paymentDate, { color: colors.primary[500] }]}>
                          {payment.dueDate}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {dashboardData && dashboardData.overduePayments.length > 0 && (
              <View style={styles.section}>
                <SectionHeader icon={AlertCircle} iconColor={colors.danger[500]} title="Overdue" />
                {dashboardData.overduePayments.map((payment, index) => {
                  const dueDate = new Date(payment.dueDate);
                  const today = new Date();
                  const diffTime = Math.abs(today.getTime() - dueDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  return (
                    <Card key={index} style={styles.paymentCard}>
                      <View style={styles.paymentRow}>
                        <View style={styles.paymentInfo}>
                          <Text style={[styles.paymentName, { color: colors.text.primary }]}>
                            {payment.tenantName}
                          </Text>
                          <Text style={[styles.paymentRoom, { color: colors.text.secondary }]}>
                            Room {payment.bed}
                          </Text>
                        </View>
                        <View style={styles.paymentRight}>
                          <Text style={[styles.paymentAmount, { color: colors.text.primary }]}>
                            {payment.amount}
                          </Text>
                          <View style={[styles.overdueTag, { backgroundColor: colors.danger[100] }]}>
                            <Text style={[styles.overdueText, { color: colors.danger[700] }]}>
                              {diffDays} {diffDays === 1 ? 'day' : 'days'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
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
    paddingVertical: spacing.xl,
  },
  greeting: {
    fontSize: typography.fontSize.md,
    marginBottom: spacing.xs,
  },
  ownerName: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '31.33%',
    marginHorizontal: '1%',
    marginBottom: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  paymentCard: {
    marginBottom: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  paymentRoom: {
    fontSize: typography.fontSize.sm,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  paymentDate: {
    fontSize: typography.fontSize.sm,
  },
  overdueTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  overdueText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

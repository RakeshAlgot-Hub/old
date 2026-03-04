import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import StatusBadge from '@/components/StatusBadge';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import FAB from '@/components/FAB';
import {
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Wallet,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { paymentService } from '@/services/apiClient';
import type { Payment, PaginatedResponse } from '@/services/apiTypes';
import { cacheKeys, getScreenCache, setScreenCache, clearScreenCache } from '@/services/screenCache';
import UpgradeModal from '@/components/UpgradeModal';

const PAYMENTS_CACHE_STALE_MS = 30 * 1000;

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedProperty, selectedPropertyId, loading: propertyLoading } = useProperty();
  
  // Initialize with cached data synchronously to avoid glitch
  const { initialPayments, initialTotal } = (() => {
    if (!selectedPropertyId) return { initialPayments: [], initialTotal: 0 };
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cacheKey = cacheKeys.payments(selectedPropertyId, monthKey);
    const cachedResponse = getScreenCache<PaginatedResponse<Payment>>(cacheKey, PAYMENTS_CACHE_STALE_MS);
    return {
      initialPayments: cachedResponse?.data || [],
      initialTotal: cachedResponse?.meta?.total || 0
    };
  })();
  
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(initialTotal);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Month navigation state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);

  // Get month/year display string
  const monthYearString = useMemo(() => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [selectedDate]);

  // Get start and end dates for current month
  const dateRange = useMemo(() => {
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [selectedDate]);

  const monthKey = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedDate]);

  const isFetchingRef = useRef(false);
  const lastFocusRefreshRef = useRef<number>(Date.now());

  const fetchPayments = async () => {
    if (!selectedPropertyId) {
      setPayments([]);
      setTotal(0);
      setError(null);
      setIsRefreshing(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    const cacheKey = cacheKeys.payments(selectedPropertyId, monthKey);
    const cachedResponse = getScreenCache<PaginatedResponse<Payment>>(cacheKey, PAYMENTS_CACHE_STALE_MS);
    if (cachedResponse) {
      const cachedData = cachedResponse.data || [];
      setPayments(cachedData);
      setTotal(cachedResponse.meta?.total || cachedData.length);
      setError(null);
      setIsRefreshing(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      // Only show loading if we don't already have data
      if (!payments.length) {
        setIsRefreshing(true);
      }
      setError(null);

      const response = await paymentService.getPayments(selectedPropertyId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        page: currentPage,
        pageSize: 50,
      });
      const data = response.data || [];
      setPayments(data);
      setTotal(response.meta?.total || data.length);
      setScreenCache(cacheKey, response);
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      if (err?.code === 'SUBSCRIPTION_LIMIT_EXCEEDED' || err?.details?.status === 402) {
        setShowUpgradeModal(true);
      } else {
        setError(err?.message || 'Failed to load payments');
      }
      if (!payments.length) {
        setPayments([]);
      }
    } finally {
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!propertyLoading && selectedPropertyId) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastFocusRefreshRef.current;
        const shouldRefresh = timeSinceLastRefresh > PAYMENTS_CACHE_STALE_MS;

        if (shouldRefresh) {
          lastFocusRefreshRef.current = now;
          fetchPayments();
        }
      }
    }, [selectedPropertyId, propertyLoading, monthKey, currentPage])
  );

  // Refetch payments when month changes
  useEffect(() => {
    if (!propertyLoading && selectedPropertyId) {
      // Check cache synchronously first to avoid skeleton flash
      const cacheKey = cacheKeys.payments(selectedPropertyId, monthKey);
      const cachedResponse = getScreenCache<PaginatedResponse<Payment>>(cacheKey, PAYMENTS_CACHE_STALE_MS);
      
      if (cachedResponse) {
        // Use cached data immediately
        setPayments(cachedResponse.data || []);
        setTotal(cachedResponse.meta?.total || 0);
        setError(null);
        setIsRefreshing(false);
      } else if (!payments.length) {
        // Only show skeleton if we have no data yet
        setIsRefreshing(true);
        fetchPayments();
      }
    } else if (!selectedPropertyId && !propertyLoading) {
      setPayments([]);
      setTotal(0);
      setError(null);
      setIsRefreshing(false);
    }
  }, [monthKey, selectedPropertyId, propertyLoading]);

  const handlePreviousMonth = () => {
    clearScreenCache('payments:');
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    clearScreenCache('payments:');
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    setCurrentPage(1);
  };

  const handleRetry = () => {
    fetchPayments();
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    // Clear cache immediately
    clearScreenCache('payments:');
    
    // Reset to current month
    setSelectedDate(new Date());
    setCurrentPage(1);
    
    try {
      // Fetch with fresh data (cache is cleared)
      await fetchPayments();
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPropertyId]);

  const handleFabPress = () => {
    router.push('/manual-payment');
  };

  const computeStats = () => {
    try {
      const collected = payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => {
          const amount = typeof p.amount === 'string'
            ? parseFloat(p.amount.replace(/[^0-9]/g, ''))
            : p.amount;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

      const pending = payments
        .filter((p) => p.status === 'due')
        .reduce((sum, p) => {
          const amount = typeof p.amount === 'string'
            ? parseFloat(p.amount.replace(/[^0-9]/g, ''))
            : p.amount;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

      const overdue = payments
        .filter((p) => p.status === 'overdue')
        .reduce((sum, p) => {
          const amount = typeof p.amount === 'string'
            ? parseFloat(p.amount.replace(/[^0-9]/g, ''))
            : p.amount;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

      return {
        collected: `₹${collected.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        pending: `₹${pending.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        overdue: `₹${overdue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      };
    } catch (error) {
      console.error('Error computing stats:', error);
      return {
        collected: '₹0',
        pending: '₹0',
        overdue: '₹0',
      };
    }
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

  const stats = computeStats();
  const isLoadingState = isRefreshing && payments.length === 0;

  return (
    <ScreenContainer edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Payments</Text>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]} activeOpacity={0.7}>
          <Filter size={20} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <View style={[styles.monthNavigator, { backgroundColor: colors.background.secondary, borderColor: colors.border.light, opacity: selectedProperty && !isLoadingState ? 1 : 0.5 }]}>
        <TouchableOpacity
          onPress={handlePreviousMonth}
          style={[styles.monthNavButton, { backgroundColor: colors.primary[50] }]}
          activeOpacity={0.7}
          disabled={isRefreshing || !selectedProperty || isLoadingState}
        >
          <ChevronLeft size={18} color={colors.primary[500]} />
        </TouchableOpacity>
        
        <View style={styles.monthDisplay}>
          <Calendar size={14} color={colors.primary[500]} />
          <Text style={[styles.monthYearText, { color: colors.text.primary }]}>
            {monthYearString}
          </Text>
          {isRefreshing && (
            <ActivityIndicator size="small" color={colors.primary[500]} style={styles.monthLoader} />
          )}
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.monthNavButton, { backgroundColor: colors.primary[50] }]}
          activeOpacity={0.7}
          disabled={isRefreshing || !selectedProperty || isLoadingState}
        >
          <ChevronRight size={18} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }>
        {isLoadingState ? (
          <>
            <View style={styles.statsContainer}>
              <Skeleton height={80} count={3} />
            </View>
            <Skeleton height={150} count={2} />
          </>
        ) : !selectedProperty ? (
          <EmptyState
            icon={Building2}
            title="No Properties Found"
            subtitle="Create your first property to start tracking payments"
            actionLabel="Create Property"
            onActionPress={() => router.push('/property-form')}
          />
        ) : error ? (
          <ApiErrorCard error={error} onRetry={handleRetry} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No Payments Yet"
            subtitle="Payment history will appear here once tenants start making payments"
          />
        ) : (
          <View style={{ opacity: isRefreshing ? 0.5 : 1 }}>
            <View style={styles.statsContainer}>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Collected</Text>
                <Text style={[styles.statAmount, { color: colors.success[500] }]}>
                  {stats.collected}
                </Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Pending</Text>
                <Text style={[styles.statAmount, { color: colors.primary[500] }]}>
                  {stats.pending}
                </Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Overdue</Text>
                <Text style={[styles.statAmount, { color: colors.danger[500] }]}>
                  {stats.overdue}
                </Text>
              </Card>
            </View>

            <View style={styles.paymentsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>All Payments</Text>

              {payments.map((payment, index) => (
                <TouchableOpacity key={index} activeOpacity={0.7} onPress={() => router.push(`/edit-payment?paymentId=${payment.id}`)}>
                  <Card style={styles.paymentCard}>
                    <View style={styles.paymentHeader}>
                      <View style={styles.statusIconContainer}>
                        {getStatusIcon(payment.status)}
                      </View>
                      <View style={styles.paymentInfo}>
                        <Text style={[styles.tenantName, { color: colors.text.primary }]}>
                          {payment.tenantName || 'Unknown Tenant'}
                        </Text>
                        <Text style={[styles.bedNumber, { color: colors.text.tertiary }]}>Room: {payment.roomNumber || 'N/A'}</Text>
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
                        {payment.status === 'paid' ? (
                          <>
                            <Text style={[styles.dateLabel, { color: colors.text.secondary }]}>Paid On:</Text>
                            <Text style={[styles.dateValue, { color: colors.text.primary }]}>{payment.paidDate || payment.dueDate || '-'}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.dateLabel, { color: colors.text.secondary }]}>Due:</Text>
                            <Text style={[styles.dateValue, { color: colors.text.primary }]}>{payment.dueDate || '-'}</Text>
                          </>
                        )}
                      </View>
                      {/* Show payment method if present */}
                      {payment.method && (
                        <View style={styles.methodRow}>
                          <Text style={[styles.methodLabel, { color: colors.text.secondary }]}>Method:</Text>
                          <Text style={[styles.methodValue, { color: colors.primary[500] }]}>{payment.method}</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      {selectedProperty && !isLoadingState && <FAB onPress={handleFabPress} />}
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
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: 2,
    fontWeight: typography.fontWeight.semibold,
  },
  statAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
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
    marginBottom: spacing.xs,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 40,
  },
  statusIconContainer: {
    marginRight: spacing.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 2,
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
    fontFamily: 'System',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    marginBottom: spacing.sm,
  },
  paymentFooter: {
    gap: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  dateLabel: {
    fontSize: typography.fontSize.xs,
    marginLeft: spacing.xs,
    marginRight: 2,
  },
  dateValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  methodLabel: {
    fontSize: typography.fontSize.xs,
    marginRight: 2,
  },
  methodValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  monthYearText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    minWidth: 120,
    textAlign: 'center',
  },
  monthLoader: {
    marginLeft: spacing.sm,
  },
});
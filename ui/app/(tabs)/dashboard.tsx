import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import PropertySwitcher from '@/components/PropertySwitcher';
import SectionHeader from '@/components/SectionHeader';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
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
  paymentService,
  dashboardService,
} from '@/services/apiClient';
import type { Payment, DashboardStats } from '@/services/apiTypes';
import { cacheKeys, getScreenCache, setScreenCache, clearScreenCache } from '@/services/screenCache';

interface DashboardData {
  stats: DashboardStats;
  duePayments: Payment[];
}

const DASHBOARD_CACHE_STALE_MS = 60 * 1000;

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { selectedProperty, selectedPropertyId, loading: propertyLoading } = useProperty();
  
  // Initialize with cached data synchronously to avoid glitch
  const initialDashboardData = (() => {
    if (!selectedPropertyId) return null;
    const cacheKey = cacheKeys.dashboard(selectedPropertyId);
    return getScreenCache<DashboardData>(cacheKey, DASHBOARD_CACHE_STALE_MS);
  })();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(initialDashboardData);
  const lastFocusRefreshRef = useRef<number>(Date.now());
  const isFetchingRef = useRef(false);

  const fetchDashboardData = async () => {
    if (!selectedPropertyId) {
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    const cacheKey = cacheKeys.dashboard(selectedPropertyId);
    const cachedData = getScreenCache<DashboardData>(cacheKey, DASHBOARD_CACHE_STALE_MS);
    if (cachedData) {
      setDashboardData(cachedData);
      setError(null);
      return;
    }

    try {
      isFetchingRef.current = true;
      // Only show loading if we don't already have data
      if (!dashboardData) {
        setLoading(true);
      }
      setError(null);

      // Fetch aggregated stats and payments data
      const [statsRes, dueRes] = await Promise.all([
        dashboardService.getStats(selectedPropertyId),
        paymentService.getPayments(selectedPropertyId, { status: 'due', page: 1, pageSize: 10 }),
      ]);

      const stats = statsRes.data || {
        totalTenants: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        occupancyRate: 0,
      };
      const duePayments = dueRes.data || [];

      setDashboardData({
        stats,
        duePayments,
      });
      setScreenCache(cacheKey, {
        stats,
        duePayments,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!propertyLoading && selectedPropertyId) {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastFocusRefreshRef.current;
        const shouldRefresh = timeSinceLastRefresh > DASHBOARD_CACHE_STALE_MS;

        // Only fetch if data is stale
        if (shouldRefresh) {
          lastFocusRefreshRef.current = now;
          fetchDashboardData();
        }
      } else if (!propertyLoading && !selectedPropertyId) {
        // If property loading is done but there are no properties, set loading to false
        setLoading(false);
      }
    }, [selectedPropertyId, propertyLoading, dashboardData])
  );

  // Fetch data on initial mount or when property changes
  useEffect(() => {
    if (!propertyLoading && selectedPropertyId && !dashboardData) {
      // Only fetch if we don't have any data yet
      const cacheKey = cacheKeys.dashboard(selectedPropertyId);
      const cachedData = getScreenCache<DashboardData>(cacheKey, DASHBOARD_CACHE_STALE_MS);
      if (!cachedData) {
        fetchDashboardData();
      }
    }
  }, [selectedPropertyId, propertyLoading, dashboardData]);

  const handleRetry = () => {
    fetchDashboardData();
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      clearScreenCache();
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, [selectedPropertyId]);

  const totalBeds = dashboardData?.stats.totalBeds || 0;
  const occupiedBeds = dashboardData?.stats.occupiedBeds || 0;
  const occupancyRate = dashboardData?.stats.occupancyRate || 0;

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
      value: String(dashboardData?.stats.totalTenants || 0),
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }>
          {loading && !dashboardData ? (
          <>
            <View style={styles.header}>
              <Text style={[styles.greeting, { color: colors.text.secondary }]}>Welcome back,</Text>
              <Text style={[styles.ownerName, { color: colors.text.primary }]}>Property Owner</Text>
            </View>
            <Skeleton height={120} count={2} />
          </>
        ) : error ? (
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

            {!selectedProperty ? (
              <EmptyState
                icon={Building2}
                title="No Properties Found"
                subtitle="Create your first property to start using dashboard features"
                actionLabel="Create Property"
                onActionPress={() => router.push('/property-form')}
              />
            ) : (
              <>
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
              </>
            )}
          </>
        )}
      </ScrollView>
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
});


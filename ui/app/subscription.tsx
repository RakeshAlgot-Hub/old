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
import Card from '@/components/Card';
import UpgradeModal from '@/components/UpgradeModal';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import {
  ChevronLeft,
  Crown,
  Building2,
  Users,
  MessageSquare,
  Check,
  Lock,
} from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { subscriptionService } from '@/services/apiClient';
import type { Subscription, Usage, PlanLimits } from '@/services/apiTypes';

type Plan = 'free' | 'pro' | 'premium';

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [subscriptionRes, usageRes] = await Promise.all([
        subscriptionService.getSubscription(),
        subscriptionService.getUsage(),
      ]);

      const subscriptionData = subscriptionRes.data;
      const usageData = usageRes.data;

      setSubscription(subscriptionData);
      setUsage(usageData);

      const limitsRes = await subscriptionService.getLimits(subscriptionData.plan);
      setLimits(limitsRes.data);
    } catch (err: any) {
      if (err?.code === 'upgrade_required') {
        setShowUpgradeModal(true);
      } else {
        setError(err?.message || 'Failed to load subscription data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleRetry = () => {
    fetchSubscriptionData();
  };

  const handleSelectPlan = async (plan: Plan) => {
    try {
      const response = await subscriptionService.updateSubscription(plan);
      setSubscription(response.data);

      const limitsRes = await subscriptionService.getLimits(plan);
      setLimits(limitsRes.data);
    } catch (err: any) {
      console.error('Failed to update subscription:', err);
    }
  };

  const comparisonPlans = [
    {
      id: 'free' as const,
      name: 'Free',
      price: '₹0',
      features: [
        'Up to 2 properties',
        'Up to 20 tenants',
        '50 SMS credits/month',
        'Basic reporting',
      ],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '₹999',
      popular: true,
      features: [
        'Up to 10 properties',
        'Up to 100 tenants',
        '500 SMS credits/month',
        'Advanced reporting',
        'Priority support',
      ],
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      price: '₹2,499',
      features: [
        'Unlimited properties',
        'Unlimited tenants',
        'Unlimited SMS credits',
        'Custom reporting',
        '24/7 support',
        'White-label option',
      ],
    },
  ];

  const currentPlan = subscription?.plan || 'free';
  const isLocked = currentPlan === 'free';

  const formatLimit = (value: number) => {
    return value === 999 ? '∞' : value;
  };

  const calculateProgressPercentage = (used: number, limit: number) => {
    if (limit === 999) return 10;
    return Math.min((used / limit) * 100, 100);
  };

  return (
    <ScreenContainer edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Subscription & Billing</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <Skeleton height={120} count={1} />
            <View style={{ marginTop: spacing.lg }}>
              <Skeleton height={100} count={3} />
            </View>
          </>
        ) : error ? (
          <ApiErrorCard error={error} onRetry={handleRetry} />
        ) : subscription && usage && limits ? (
          <>
            <Card style={styles.currentPlanCard}>
              <View style={[styles.planBadge, { backgroundColor: colors.warning[50] }]}>
                <Crown size={20} color={colors.warning[500]} />
                <Text style={[styles.planBadgeText, { color: colors.warning[700] }]}>Current Plan</Text>
              </View>
              <Text style={[styles.currentPlanName, { color: colors.text.primary }]}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </Text>
              <Text style={[styles.currentPlanPrice, { color: colors.text.secondary }]}>
                {currentPlan === 'free'
                  ? 'Free forever'
                  : `${currentPlan === 'pro' ? '₹999' : '₹2,499'}/month`}
              </Text>
            </Card>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Usage Limits</Text>

              <Card style={styles.limitCard}>
                <View style={styles.limitHeader}>
                  <View style={[styles.limitIcon, { backgroundColor: colors.background.tertiary }]}>
                    <Building2 size={20} color={colors.primary[500]} />
                  </View>
                  <View style={styles.limitInfo}>
                    <Text style={[styles.limitLabel, { color: colors.text.secondary }]}>Properties</Text>
                    <Text style={[styles.limitValue, { color: colors.text.primary }]}>
                      {usage.properties} / {formatLimit(limits.properties)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.neutral[200] }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${calculateProgressPercentage(usage.properties, limits.properties)}%`,
                        backgroundColor:
                          usage.properties > limits.properties
                            ? colors.danger[500]
                            : colors.primary[500],
                      },
                    ]}
                  />
                </View>
              </Card>

              <Card style={styles.limitCard}>
                <View style={styles.limitHeader}>
                  <View style={[styles.limitIcon, { backgroundColor: colors.background.tertiary }]}>
                    <Users size={20} color={colors.success[500]} />
                  </View>
                  <View style={styles.limitInfo}>
                    <Text style={[styles.limitLabel, { color: colors.text.secondary }]}>Tenants</Text>
                    <Text style={[styles.limitValue, { color: colors.text.primary }]}>
                      {usage.tenants} / {formatLimit(limits.tenants)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.neutral[200] }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${calculateProgressPercentage(usage.tenants, limits.tenants)}%`,
                        backgroundColor:
                          usage.tenants > limits.tenants
                            ? colors.danger[500]
                            : colors.success[500],
                      },
                    ]}
                  />
                </View>
              </Card>

              <Card style={styles.limitCard}>
                <View style={styles.limitHeader}>
                  <View style={[styles.limitIcon, { backgroundColor: colors.background.tertiary }]}>
                    <MessageSquare size={20} color={colors.warning[500]} />
                  </View>
                  <View style={styles.limitInfo}>
                    <Text style={[styles.limitLabel, { color: colors.text.secondary }]}>SMS Credits</Text>
                    <Text style={[styles.limitValue, { color: colors.text.primary }]}>
                      {usage.smsCredits} / {formatLimit(limits.smsCredits)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.neutral[200] }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${calculateProgressPercentage(usage.smsCredits, limits.smsCredits)}%`,
                        backgroundColor: colors.warning[500],
                      },
                    ]}
                  />
                </View>
              </Card>

              {isLocked && (
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: colors.primary[500] }]}
                  onPress={() => setShowUpgradeModal(true)}
                  activeOpacity={0.7}>
                  <Lock size={20} color={colors.white} />
                  <Text style={[styles.upgradeButtonText, { color: colors.white }]}>
                    Upgrade to Add More
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Compare Plans</Text>

              {comparisonPlans.map((plan) => (
                <View key={plan.id} style={styles.comparisonCardWrapper}>
                  {isLocked && plan.id !== 'free' && (
                    <View style={styles.lockedOverlay}>
                      <View style={styles.lockedContent}>
                        <Lock size={32} color={colors.white} />
                        <Text style={[styles.lockedText, { color: colors.white }]}>Upgrade Required</Text>
                      </View>
                    </View>
                  )}
                  <Card
                    style={[
                      styles.comparisonCard,
                      isLocked && plan.id !== 'free' ? styles.comparisonCardBlurred : undefined,
                      plan.popular ? { borderWidth: 2, borderColor: colors.primary[500] } : undefined,
                    ] as any}>
                    {plan.popular && (
                      <View style={[styles.popularBadge, { backgroundColor: colors.primary[500] }]}>
                        <Text style={[styles.popularBadgeText, { color: colors.white }]}>Most Popular</Text>
                      </View>
                    )}
                    <Text style={[styles.comparisonPlanName, { color: colors.text.primary }]}>{plan.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.comparisonPrice, { color: colors.primary[500] }]}>{plan.price}</Text>
                      {plan.id !== 'free' && (
                        <Text style={[styles.pricePeriod, { color: colors.text.secondary }]}>/month</Text>
                      )}
                    </View>

                    <View style={styles.featuresContainer}>
                      {plan.features.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                          <Check size={16} color={colors.success[500]} />
                          <Text style={[styles.featureText, { color: colors.text.primary }]}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                    {currentPlan === plan.id && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.success[100] }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.success[700] }]}>Current Plan</Text>
                      </View>
                    )}
                  </Card>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSelectPlan={handleSelectPlan}
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
  currentPlanCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginVertical: spacing.lg,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  planBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  currentPlanName: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  currentPlanPrice: {
    fontSize: typography.fontSize.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  limitCard: {
    marginBottom: spacing.sm,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  limitIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  limitInfo: {
    flex: 1,
  },
  limitLabel: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  limitValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  progressBar: {
    height: 8,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    ...shadows.md,
  },
  upgradeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  comparisonCardWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  comparisonCard: {
    padding: spacing.lg,
  },
  comparisonCardBlurred: {
    opacity: 0.4,
  },
  comparisonCardPopular: {
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lockedContent: {
    alignItems: 'center',
  },
  lockedText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.sm,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  popularBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  comparisonPlanName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  comparisonPrice: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
  },
  pricePeriod: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.xs,
  },
  featuresContainer: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  currentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  currentBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

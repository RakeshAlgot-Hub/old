import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'free' | 'pro' | 'premium') => void;
}

export default function UpgradeModal({
  visible,
  onClose,
  onSelectPlan,
}: UpgradeModalProps) {
  const { colors } = useTheme();
  const plans = [
    {
      id: 'free' as const,
      name: 'Free',
      price: '₹0',
      features: ['Up to 2 properties', 'Up to 20 tenants', '50 SMS credits/month'],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '₹999',
      features: ['Up to 10 properties', 'Up to 100 tenants', '500 SMS credits/month'],
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      price: '₹2,499',
      features: ['Unlimited properties', 'Unlimited tenants', 'Unlimited SMS credits'],
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
          <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Choose Your Plan</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            {plans.map((plan) => (
              <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.background.tertiary }]}>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: colors.text.primary }]}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: colors.primary[500] }]}>{plan.price}</Text>
                    {plan.id !== 'free' && (
                      <Text style={[styles.period, { color: colors.text.secondary }]}>/month</Text>
                    )}
                  </View>
                </View>

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Check size={16} color={colors.success[500]} />
                      <Text style={[styles.featureText, { color: colors.text.primary }]}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    { backgroundColor: plan.id === 'premium' ? colors.primary[500] : colors.white, borderColor: plan.id === 'premium' ? colors.primary[500] : colors.border.medium },
                  ]}
                  onPress={() => {
                    onSelectPlan(plan.id);
                    onClose();
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.selectButtonText,
                      { color: plan.id === 'premium' ? colors.white : colors.text.primary },
                    ]}>
                    Select {plan.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.cancelButton, { borderTopColor: colors.border.light }]}
            onPress={onClose}
            activeOpacity={0.7}>
            <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  scrollView: {
    padding: spacing.lg,
  },
  planCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  planHeader: {
    marginBottom: spacing.lg,
  },
  planName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
  },
  period: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.xs,
  },
  featuresContainer: {
    marginBottom: spacing.lg,
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
  selectButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  selectButtonPrimary: {
  },
  selectButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  selectButtonTextPrimary: {
  },
  cancelButton: {
    padding: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});

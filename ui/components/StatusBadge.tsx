import { View, Text, StyleSheet } from 'react-native';
import { spacing, radius, typography } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface StatusBadgeProps {
  status: 'paid' | 'due' | 'overdue' | 'occupied' | 'vacant' | 'maintenance';
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const { colors } = useTheme();

  const statusConfig = {
    paid: {
      bg: colors.success[100],
      text: colors.success[700],
      label: label || 'PAID',
    },
    due: {
      bg: colors.primary[50],
      text: colors.primary[700],
      label: label || 'DUE',
    },
    overdue: {
      bg: colors.danger[100],
      text: colors.danger[700],
      label: label || 'OVERDUE',
    },
    occupied: {
      bg: colors.primary[50],
      text: colors.primary[700],
      label: label || 'OCCUPIED',
    },
    vacant: {
      bg: colors.success[100],
      text: colors.success[700],
      label: label || 'VACANT',
    },
    maintenance: {
      bg: colors.warning[100],
      text: colors.warning[700],
      label: label || 'MAINTENANCE',
    },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

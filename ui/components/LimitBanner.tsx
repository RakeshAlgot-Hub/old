import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { spacing, typography, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface LimitBannerProps {
  message: string;
  onUpgrade: () => void;
}

export default function LimitBanner({ message, onUpgrade }: LimitBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.warning[50],
          borderColor: colors.warning[200],
        },
      ]}>
      <View style={styles.content}>
        <AlertCircle size={18} color={colors.warning[600]} />
        <Text style={[styles.message, { color: colors.warning[800] }]}>{message}</Text>
      </View>
      <TouchableOpacity onPress={onUpgrade} activeOpacity={0.7}>
        <Text style={[styles.upgradeText, { color: colors.warning[700] }]}>Upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  message: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
    flex: 1,
  },
  upgradeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});

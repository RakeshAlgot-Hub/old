import { View, StyleSheet } from 'react-native';
import { spacing, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';

interface SkeletonProps {
  height?: number;
  count?: number;
}

export default function Skeleton({ height = 200, count = 3 }: SkeletonProps) {
  const { colors } = useTheme();

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeleton,
            {
              backgroundColor: colors.neutral[200],
              height,
              marginBottom: spacing.md,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: radius.lg,
  },
});

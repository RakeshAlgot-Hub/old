import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { shadows } from '@/theme';
import { useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface FABProps {
  onPress: () => void;
}

export default function FAB({ onPress }: FABProps) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const TAB_BAR_HEIGHT = 56;
  const bottomOffset = (insets.bottom || 0) + TAB_BAR_HEIGHT + 16;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ scale: scaleAnim }],
        },
      ]}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary[500] }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}>
        <Plus size={28} color={colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});

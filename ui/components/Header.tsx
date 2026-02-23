import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
}

export function Header({ title, showBack = false, onBack, rightComponent }: HeaderProps) {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}> 
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack || router.back}>
              <ArrowLeft size={24} color={colors.background.paper} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { fontSize: fonts.size.xl, fontWeight: fonts.weight.semiBold, color: colors.background.paper }]}>
            {title}
          </Text>
        </View>
        {rightComponent && <View style={styles.rightSection}>{rightComponent}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    flex: 1,
  },
  rightSection: {
    marginLeft: 12,
  },
});

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreVertical, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { Menu } from '@/components/Menu';
import { useTheme } from '@/contexts/ThemeContext';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showMenu?: boolean;
}

export function AppHeader({ title = 'TenantTracker', showBack, onBack, showMenu = true }: AppHeaderProps) {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const buttonRef = useRef<View>(null);
  const insets = useSafeAreaInsets();

  const menuOptions = [
    { label: 'Settings', onPress: () => router.push('/settings') },
  ];

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
        {showMenu && (
          <>
            <View ref={buttonRef}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setMenuVisible(true)}>
                <MoreVertical size={24} color={colors.background.paper} />
              </TouchableOpacity>
            </View>
            <Menu
              visible={menuVisible}
              onClose={() => setMenuVisible(false)}
              options={menuOptions}
              anchorRef={buttonRef}
            />
          </>
        )}
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
  menuButton: {
    padding: 4,
  },
});

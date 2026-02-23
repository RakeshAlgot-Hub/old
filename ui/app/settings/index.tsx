import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import {
  User,
  Building,
  Bell,
  Download,
  HelpCircle,
  Lock,
  ChevronRight
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingItem {
  label: string;
  route: string;
  icon: React.ComponentType<any>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, fonts, spacing, borderRadius } = useTheme();

  const settingsItems: SettingItem[] = [
    { label: 'Account', route: '/settings/account', icon: User },
    { label: 'Properties', route: '/settings/properties', icon: Building },
    { label: 'Notifications', route: '/settings/notifications', icon: Bell },
    { label: 'Import & Export', route: '/settings/import-export', icon: Download },
    { label: 'Help & Security', route: '/settings/help-security', icon: HelpCircle },
    { label: 'Privacy', route: '/settings/privacy', icon: Lock },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <SafeAreaView edges={["top"]}>
      <Header title="Settings" showBack />
      </SafeAreaView>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { padding: spacing.base }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.background.paper, borderRadius: borderRadius.lg, borderColor: colors.border.light }]}>
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.settingItem,
                  { borderBottomColor: colors.border.light },
                  index === settingsItems.length - 1 && styles.lastItem,
                ]}
                onPress={() => router.push(item.route as any)}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Icon size={20} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.settingLabel, { fontSize: fonts.size.md, fontWeight: fonts.weight.medium, color: colors.text.primary }]}>
                    {item.label}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  section: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
  },
});

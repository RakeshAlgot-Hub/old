import { View, Text, StyleSheet } from 'react-native';
import { Header } from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const { colors, fonts } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <SafeAreaView edges={["top"]}>
        <Header title="Notifications" showBack />
      </SafeAreaView> 
      <View style={styles.content}>
        <Text style={[styles.text, { fontSize: fonts.size.lg, fontWeight: fonts.weight.semiBold, color: colors.text.secondary }]}>
          Notifications – Upcoming
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
  },
});

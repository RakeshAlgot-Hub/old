import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTheme } from '@/context/ThemeContext';

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  const { colors } = useTheme();

  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.warning[500] }]}>
      <Text style={[styles.text, { color: colors.warning[900] }]}>📡 Offline Mode - Data cached from last sync</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});

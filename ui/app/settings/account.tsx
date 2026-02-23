
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { LogOut, Calendar, Mail } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AccountScreen() {
  const { user, logout, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const { colors, fonts, spacing, borderRadius, shadows } = useTheme();

  // Passive error banner for auth/user errors
  const renderPassiveError = () => {
    if (!error) return null;
    return (
      <View style={{ backgroundColor: '#fdecea', padding: 12, borderRadius: 8, margin: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: '#b71c1c', flex: 1 }}>{error}</Text>
        <TouchableOpacity onPress={clearError} style={{ marginLeft: 8 }}>
          <Text style={{ color: '#b71c1c', fontWeight: 'bold' }}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background.default }]}> 
      <SafeAreaView edges={["top"]}>
        <Header title="Account" showBack />
      </SafeAreaView>
        {renderPassiveError()}
        <View style={styles.content}>
          <Text style={[styles.emptyStateText, { color: colors.text.secondary, fontSize: fonts.size.md, fontWeight: fonts.weight.medium }]}> 
            No user data available.
          </Text>
        </View>
      </View>
    );
  }

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <View style={[styles.page, { backgroundColor: colors.background.default }]}> 
    <SafeAreaView edges={["top"]}>
      <Header title="Account" showBack />
    </SafeAreaView>
      {renderPassiveError()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { padding: spacing.base }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.background.paper, borderRadius: borderRadius.xl, borderColor: colors.border.light, ...shadows.md }]}> 
          <View style={styles.avatarSection}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: borderRadius.full }]}> 
              <Image
                source={require('@/assets/images/icon.png')}
                style={[styles.avatar, { borderRadius: borderRadius.full }]}
              />
            </View>
          </View>

          <View style={[styles.infoSection, { gap: spacing.base }]}> 
            <Text style={[styles.displayName, { fontSize: fonts.size.xxxl, fontWeight: fonts.weight.bold, color: colors.text.primary }]}> 
              {user.name}
            </Text>

            <View style={[styles.detailRow, { gap: spacing.md }]}> 
              <Mail size={16} color={colors.text.secondary} />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { fontSize: fonts.size.xs, fontWeight: fonts.weight.semiBold, color: colors.text.secondary }]}> 
                  Email
                </Text>
                <Text style={[styles.detailValue, { fontSize: fonts.size.md, fontWeight: fonts.weight.medium, color: colors.text.primary }]}> 
                  {user.email}
                </Text>
              </View>
            </View>

            {joinedDate && (
              <View style={[styles.detailRow, { gap: spacing.md }]}> 
                <Calendar size={16} color={colors.text.secondary} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { fontSize: fonts.size.xs, fontWeight: fonts.weight.semiBold, color: colors.text.secondary }]}> 
                    Member Since
                  </Text>
                  <Text style={[styles.detailValue, { fontSize: fonts.size.md, fontWeight: fonts.weight.medium, color: colors.text.primary }]}> 
                    {joinedDate}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.danger, borderRadius: borderRadius.lg }, isLoading && { backgroundColor: colors.neutral[300] }]}
            onPress={async () => {
              await logout();
              router.push('/logout');
            }}
            disabled={isLoading}
            activeOpacity={0.8}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.background.paper} />
            ) : (
              <>
                <LogOut size={18} color={colors.background.paper} />
                <Text style={[styles.logoutText, { color: colors.background.paper, fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold }]}> 
                  Sign Out
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
  },
  profileCard: {
    padding: 24,
    borderWidth: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
  },
  avatar: {
    width: 100,
    height: 100,
  },
  infoSection: {
    marginBottom: 24,
  },
  displayName: {
    textAlign: 'center',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    minHeight: 48,
  },
  logoutText: {
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
  },
});

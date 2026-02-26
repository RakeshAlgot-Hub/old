import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import StatusBadge from '@/components/StatusBadge';
import { ChevronLeft, Bed as BedIcon, User } from 'lucide-react-native';
import { spacing, typography, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { bedService, roomService, tenantService } from '@/services/apiClient';
import type { Bed, Room, Tenant } from '@/services/apiTypes';

export default function ManageBedsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { selectedPropertyId } = useProperty();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!roomId || !selectedPropertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [bedsRes, roomRes, tenantsRes] = await Promise.all([
        bedService.getBeds(),
        roomService.getRoomById(roomId),
        tenantService.getTenants(),
      ]);

      if (bedsRes.data) {
        const filteredBeds = bedsRes.data.filter(b => b.roomId === roomId);
        setBeds(filteredBeds);
      }

      if (roomRes.data) {
        setRoom(roomRes.data);
      }

      if (tenantsRes.data) {
        const filteredTenants = tenantsRes.data.filter(t => t.roomId === roomId);
        setTenants(filteredTenants);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load beds');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [roomId, selectedPropertyId])
  );

  const handleRetry = () => {
    fetchData();
  };

  const getTenantForBed = (bedId: string) => {
    return tenants.find(t => t.bedId === bedId);
  };

  if (loading) {
    return (
      <ScreenContainer edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Beds</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Skeleton height={100} count={3} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!room) {
    return (
      <ScreenContainer edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Beds</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <EmptyState
            icon={BedIcon}
            title="Room Not Found"
            subtitle="The selected room could not be found"
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Beds</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ApiErrorCard error={error} onRetry={handleRetry} />
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={[styles.summaryText, { color: colors.text.secondary }]}>
                Room {room.roomNumber}
              </Text>
              <Text style={[styles.propertyName, { color: colors.text.primary }]}>
                {beds.length} {beds.length === 1 ? 'Bed' : 'Beds'}
              </Text>
            </View>

            {beds.length === 0 ? (
              <EmptyState
                icon={BedIcon}
                title="No Beds Found"
                subtitle="This room has no beds configured"
              />
            ) : (
              beds.map((bed, index) => {
                const tenant = getTenantForBed(bed.id);
                return (
                  <Card key={index} style={styles.bedCard}>
                    <View style={styles.bedHeader}>
                      <View style={[styles.bedIconContainer, { backgroundColor: colors.primary[50] }]}>
                        <BedIcon size={24} color={colors.primary[500]} />
                      </View>
                      <View style={styles.bedInfo}>
                        <Text style={[styles.bedNumber, { color: colors.text.primary }]}>
                          Bed {bed.bedNumber}
                        </Text>
                      </View>
                      <StatusBadge status={bed.status} />
                    </View>

                    {tenant && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
                        <View style={styles.tenantInfo}>
                          <View style={styles.tenantRow}>
                            <User size={16} color={colors.text.secondary} />
                            <Text style={[styles.tenantLabel, { color: colors.text.secondary }]}>
                              Tenant
                            </Text>
                          </View>
                          <Text style={[styles.tenantName, { color: colors.text.primary }]}>
                            {tenant.name}
                          </Text>
                        </View>
                      </>
                    )}

                    {bed.status === 'maintenance' && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
                        <View style={[styles.maintenanceInfo, { backgroundColor: colors.warning[50] }]}>
                          <Text style={[styles.maintenanceText, { color: colors.warning[700] }]}>
                            Under Maintenance
                          </Text>
                        </View>
                      </>
                    )}
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  placeholder: {
    width: 40,
  },
  summaryContainer: {
    marginVertical: spacing.lg,
  },
  summaryText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  propertyName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  bedCard: {
    marginBottom: spacing.md,
  },
  bedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  bedInfo: {
    flex: 1,
  },
  bedNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  tenantInfo: {
    gap: spacing.sm,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tenantLabel: {
    fontSize: typography.fontSize.xs,
    marginLeft: spacing.xs,
  },
  tenantName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  maintenanceInfo: {
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  maintenanceText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

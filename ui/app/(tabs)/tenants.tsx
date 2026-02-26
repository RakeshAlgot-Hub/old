import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import PropertySwitcher from '@/components/PropertySwitcher';
import StatusBadge from '@/components/StatusBadge';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import FAB from '@/components/FAB';
import UpgradeModal from '@/components/UpgradeModal';
import { Search, Filter, Phone, Mail, MapPin, Users } from 'lucide-react-native';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { tenantService, roomService, bedService } from '@/services/apiClient';
import type { Tenant, Room, Bed } from '@/services/apiTypes';

export default function TenantsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedProperty, selectedPropertyId, loading: propertyLoading } = useProperty();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchTenants = async () => {
    if (!selectedPropertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [tenantsRes, roomsRes, bedsRes] = await Promise.all([
        tenantService.getTenants(),
        roomService.getRooms(),
        bedService.getBeds(),
      ]);

      if (tenantsRes.data) {
        const filteredTenants = tenantsRes.data.filter(t => t.propertyId === selectedPropertyId);
        setTenants(filteredTenants);
        setTotal(filteredTenants.length);
      }

      if (roomsRes.data) {
        const filteredRooms = roomsRes.data.filter(r => r.propertyId === selectedPropertyId);
        setRooms(filteredRooms);
      }

      if (bedsRes.data) {
        const filteredBeds = bedsRes.data.filter(b => b.propertyId === selectedPropertyId);
        setBeds(filteredBeds);
      }
    } catch (err: any) {
      if (err?.code === 'upgrade_required') {
        setShowUpgradeModal(true);
      } else {
        setError(err?.message || 'Failed to load tenants');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!propertyLoading) {
      fetchTenants();
    }
  }, [selectedPropertyId, propertyLoading]);

  const handleRetry = () => {
    fetchTenants();
  };

  const handleFabPress = () => {
    router.push('/add-tenant');
  };

  const getBedInfo = (bedId: string) => {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return 'N/A';
    const room = rooms.find(r => r.id === bed.roomId);
    if (!room) return `Bed ${bed.bedNumber}`;
    return `Room ${room.roomNumber} - Bed ${bed.bedNumber}`;
  };

  if (propertyLoading || loading) {
    return (
      <ScreenContainer edges={['top']}>
        <PropertySwitcher />
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Tenants</Text>
          <Text style={[styles.headerCount, { color: colors.text.secondary }]}>0 Total</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Skeleton height={200} count={3} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!selectedProperty) {
    return (
      <ScreenContainer edges={['top']}>
        <PropertySwitcher />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <EmptyState
            icon={Users}
            title="No Properties Found"
            subtitle="Create your first property to get started"
            actionLabel="Create Property"
            onActionPress={() => router.push('/property-form')}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  const showEmptyState = !loading && tenants.length === 0 && !error;

  return (
    <ScreenContainer edges={['top']}>
      <PropertySwitcher />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Tenants</Text>
        <Text style={[styles.headerCount, { color: colors.text.secondary }]}>{total} Total</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.white, borderColor: colors.border.medium }]}>
          <Search size={20} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search tenants..."
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]} activeOpacity={0.7}>
          <Filter size={20} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ApiErrorCard error={error} onRetry={handleRetry} />
        ) : showEmptyState ? (
          <EmptyState
            icon={Users}
            title="No Tenants Yet"
            subtitle="Add tenants to start tracking rent payments and occupancy"
            actionLabel="Add Tenant"
            onActionPress={handleFabPress}
          />
        ) : (
          <>
            {tenants.map((tenant, index) => (
              <Card key={index} style={styles.tenantCard}>
            <View style={styles.tenantHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary[500] }]}>
                <Text style={[styles.avatarText, { color: colors.white }]}>
                  {tenant.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </Text>
              </View>
              <View style={styles.tenantInfo}>
                <Text style={[styles.tenantName, { color: colors.text.primary }]}>{tenant.name}</Text>
                <View style={styles.propertyRow}>
                  <MapPin size={14} color={colors.text.secondary} />
                  <Text style={[styles.propertyText, { color: colors.text.secondary }]}>{selectedProperty.name}</Text>
                </View>
              </View>
              <StatusBadge status={tenant.status} />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

            <View style={styles.detailsRow}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Bed</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>{getBedInfo(tenant.bedId)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Rent</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>{tenant.rent}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.text.tertiary }]}>Since</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>{tenant.joinDate}</Text>
              </View>
            </View>

            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <Phone size={14} color={colors.text.secondary} />
                <Text style={[styles.contactText, { color: colors.text.secondary }]}>{tenant.phone}</Text>
              </View>
              <View style={styles.contactItem}>
                <Mail size={14} color={colors.text.secondary} />
                <Text style={[styles.contactText, { color: colors.text.secondary }]}>{tenant.email}</Text>
              </View>
            </View>
          </Card>
        ))}
          </>
        )}
      </ScrollView>
      <FAB onPress={handleFabPress} />
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSelectPlan={() => setShowUpgradeModal(false)}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
  },
  headerCount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.md,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tenantCard: {
    marginBottom: spacing.md,
  },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.xs,
  },
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  contactRow: {
    gap: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.sm,
  },
});

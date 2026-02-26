import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import FAB from '@/components/FAB';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import { ChevronLeft, DoorOpen, Bed, IndianRupee, Eye } from 'lucide-react-native';
import { spacing, typography, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { roomService } from '@/services/apiClient';
import type { Room } from '@/services/apiTypes';

export default function ManageRoomsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedPropertyId, selectedProperty, loading: propertyLoading } = useProperty();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async () => {
    if (!selectedPropertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await roomService.getRooms();

      if (response.data) {
        const filteredRooms = response.data.filter(r => r.propertyId === selectedPropertyId);
        setRooms(filteredRooms);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!propertyLoading) {
      fetchRooms();
    }
  }, [selectedPropertyId, propertyLoading]);

  const handleRetry = () => {
    fetchRooms();
  };

  const handleAddRoom = () => {
    if (!selectedPropertyId) {
      return;
    }
    router.push('/room-form');
  };

  if (propertyLoading || loading) {
    return (
      <ScreenContainer edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Rooms</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Skeleton height={150} count={3} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!selectedProperty) {
    return (
      <ScreenContainer edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Rooms</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <EmptyState
            icon={DoorOpen}
            title="No Property Selected"
            subtitle="Please select a property first to manage rooms"
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Rooms</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <ApiErrorCard error={error} onRetry={handleRetry} />
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No Rooms Yet"
            subtitle="Add rooms to your property to get started"
            actionLabel="Add Room"
            onActionPress={handleAddRoom}
          />
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={[styles.summaryText, { color: colors.text.secondary }]}>
                {rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'}
              </Text>
              <Text style={[styles.propertyName, { color: colors.text.primary }]}>
                {selectedProperty.name}
              </Text>
            </View>

            {rooms.map((room, index) => (
              <Card key={index} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <View style={[styles.roomIconContainer, { backgroundColor: colors.primary[50] }]}>
                    <DoorOpen size={24} color={colors.primary[500]} />
                  </View>
                  <View style={styles.roomInfo}>
                    <Text style={[styles.roomNumber, { color: colors.text.primary }]}>
                      Room {room.roomNumber}
                    </Text>
                    <Text style={[styles.roomFloor, { color: colors.text.secondary }]}>
                      Floor: {room.floor}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconRow}>
                      <IndianRupee size={16} color={colors.success[500]} />
                      <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
                        Price
                      </Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                      ₹{room.price.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIconRow}>
                      <Bed size={16} color={colors.primary[500]} />
                      <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
                        Beds
                      </Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                      {room.numberOfBeds}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

                <TouchableOpacity
                  style={[styles.viewBedsButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }]}
                  onPress={() => router.push(`/manage-beds?roomId=${room.id}`)}
                  activeOpacity={0.7}>
                  <Eye size={16} color={colors.primary[600]} />
                  <Text style={[styles.viewBedsText, { color: colors.primary[600] }]}>
                    View Beds
                  </Text>
                </TouchableOpacity>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <FAB onPress={handleAddRoom} />
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
  roomCard: {
    marginBottom: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  roomIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roomInfo: {
    flex: 1,
  },
  roomNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  roomFloor: {
    fontSize: typography.fontSize.sm,
  },
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailItem: {
    flex: 1,
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    marginLeft: spacing.xs,
  },
  detailValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  viewBedsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  viewBedsText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
  },
});

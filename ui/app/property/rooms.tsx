import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '@/store/property';
import { useRoomStore } from '@/store/rooms';
import { Plus, Trash2 } from 'lucide-react-native';
import { Header } from '@/components/Header';


export default function ManageRoomsScreen() {
  const router = useRouter();
  const { getSelectedProperty } = usePropertyStore();
  const { rooms, deleteRoom, fetchRooms, isLoading } = useRoomStore();
  const property = getSelectedProperty();

  useEffect(() => {
    if (property) {
      fetchRooms(property.id);
    }
  }, [property]);

  if (!property) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']}>
          <Header title="Manage Rooms" showBack />
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Property not found</Text>
        </View>
      </View>
    );
  }

  const getBuildingName = (buildingId: string) => {
    return property.buildings.find((b) => b.id === buildingId)?.name || 'Unknown';
  };

  const handleDeleteRoom = (roomId: string, roomNumber: string) => {
    Alert.alert('Delete Room', `Delete room "${roomNumber}"?`, [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteRoom(roomId);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete room');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <Header title="Manage Rooms" showBack />
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
          </View>
        ) : (rooms || []).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Rooms Added</Text>
            <Text style={styles.emptyText}>
              Add your first room to start managing occupancy
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/property/add-room')}>
              <Plus size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Room</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.roomsList}>
            {(rooms || []).map((room) => {
              const building = property.buildings.find((b) => b.id === room.buildingId);
              const totalBeds = room.shareType || 1;
              const occupiedCount = typeof room.occupiedCount === 'number' ? room.occupiedCount : 0;
              const occupancyPercent = totalBeds > 0 ? Math.round((occupiedCount / totalBeds) * 100) : 0;

              return (
                <View key={room.id} style={styles.roomCard}>
                  <View style={styles.roomHeader}>
                    <View style={styles.roomNumber}>
                      <Text style={styles.roomNumberText}>{room.roomNumber}</Text>
                    </View>
                    <View style={styles.roomDetails}>
                      <Text style={styles.building}>
                        {building?.name || 'Unknown'} • Floor {room.floor}
                      </Text>
                      <Text style={styles.shareType}>
                        {room.shareType}-sharing • {totalBeds} beds
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteRoom(room.id, room.roomNumber)}>
                      <Trash2 size={18} color="#dc3545" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.occupancySection}>
                    <View style={styles.occupancyBar}>
                      <View
                        style={[
                          styles.occupancyFill,
                          { width: `${occupancyPercent}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.occupancyInfo}>
                      <Text style={styles.occupancyText}>
                        {occupiedCount}/{totalBeds} occupied
                      </Text>
                      <View
                        style={[
                          styles.occupancyBadge,
                          occupancyPercent === 100 && styles.occupancyFull,
                          occupancyPercent === 0 && styles.occupancyEmpty,
                          occupancyPercent > 0 &&
                            occupancyPercent < 100 &&
                            styles.occupancyPartial,
                        ]}>
                        <Text style={styles.badgeText}>{occupancyPercent}%</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {(rooms || []).length > 0 && (
        <SafeAreaView edges={['bottom']}>
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.addRoomButton}
              onPress={() => router.push('/property/add-room')}>
              <Plus size={20} color="#075E54" />
              <Text style={styles.addRoomButtonText}>Add Room</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  roomsList: {
    gap: 12,
    paddingBottom: 20,
  },
  roomCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  roomNumber: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  roomDetails: {
    flex: 1,
    gap: 2,
  },
  building: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  shareType: {
    fontSize: 13,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff3f3',
  },
  occupancySection: {
    gap: 8,
  },
  occupancyBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  occupancyFill: {
    height: '100%',
    backgroundColor: '#075E54',
  },
  occupancyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  occupancyText: {
    fontSize: 13,
    color: '#666',
  },
  occupancyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#e8f5e3',
  },
  occupancyFull: {
    backgroundColor: '#ffebee',
  },
  occupancyEmpty: {
    backgroundColor: '#e3f2fd',
  },
  occupancyPartial: {
    backgroundColor: '#fff3e0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#075E54',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#075E54',
    gap: 8,
  },
  addRoomButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
  },
});

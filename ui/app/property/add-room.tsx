import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '@/store/property';
import { useRoomStore } from '@/store/rooms';
import { ChevronDown } from 'lucide-react-native';
import { unitService } from '@/services/unitService';
import { Header } from '@/components/Header';

interface DropdownOption {
  label: string;
  value: string | number;
  isOther?: boolean;
}

export default function AddRoomScreen() {
  const router = useRouter();
  const { getSelectedProperty } = usePropertyStore();
  const { addRoom } = useRoomStore();
  const property = getSelectedProperty();

  const [roomNumber, setRoomNumber] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedShareType, setSelectedShareType] = useState<number | null>(null);
  // Removed totalBeds state, as shareType covers this

  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [showShareTypeDropdown, setShowShareTypeDropdown] = useState(false);
  const [showOtherFloorInput, setShowOtherFloorInput] = useState(false);
  const [showOtherShareTypeInput, setShowOtherShareTypeInput] = useState(false);
  const [otherFloor, setOtherFloor] = useState('');
  const [otherShareType, setOtherShareType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!property) {
    return (
      <View style={styles.container}>
        <Header title="Add Room" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Property not found</Text>
        </View>
      </View>
    );
  }

  // Dynamic dropdowns from property
  const buildingOptions: DropdownOption[] = Array.isArray(property.buildings)
    ? property.buildings.map((b: any) =>
        typeof b === 'object' && b.name && b.id
          ? { label: b.name, value: b.id }
          : { label: String(b), value: String(b) }
      )
    : [];

  const floorOptions: DropdownOption[] = Array.isArray(property.floors)
    ? property.floors.map((f: any) =>
        typeof f === 'object' && f.label && f.name
          ? { label: `${f.name} (${f.label})`, value: f.label }
          : { label: String(f), value: String(f) }
      )
    : [];
  floorOptions.push({ label: 'Other', value: 'other', isOther: true });

  const shareTypeOptions: DropdownOption[] = Array.isArray(property.shareTypes)
    ? property.shareTypes.map((st: any) => ({ label: `${st}-sharing`, value: st }))
    : [];
  shareTypeOptions.push({ label: 'Other', value: 'other', isOther: true });

  const getSelectedBuildingName = () => {
    if (!property || !property.buildings) return '';
    const found = property.buildings.find(
      (b: any) => typeof b === 'object' && b.id === selectedBuilding
    );
    if (found && found.name) return found.name;
    // fallback for string array or if not found
    const option = buildingOptions.find((opt) => opt.value === selectedBuilding);
    return option ? option.label : selectedBuilding || '';
  };

  const handleFloorSelect = (floor: string | number) => {
    if (floor === 'other') {
      setShowOtherFloorInput(true);
      setShowFloorDropdown(false);
    } else {
      setSelectedFloor(floor as string);
      setShowFloorDropdown(false);
      setShowOtherFloorInput(false);
    }
  };

  const handleShareTypeSelect = (shareType: number | string) => {
    if (shareType === 'other') {
      setShowOtherShareTypeInput(true);
      setShowShareTypeDropdown(false);
    } else {
      setSelectedShareType(shareType as number);
      setShowShareTypeDropdown(false);
      setShowOtherShareTypeInput(false);
    }
  };

  const handleAddOtherFloor = () => {
    if (!otherFloor.trim()) {
      Alert.alert('Error', 'Please enter a floor name');
      return;
    }

    setSelectedFloor(otherFloor.trim());
    setOtherFloor('');
    setShowOtherFloorInput(false);
  };

  const handleAddOtherShareType = () => {
    if (!otherShareType.trim()) {
      Alert.alert('Error', 'Please enter a share type');
      return;
    }

    const shareTypeNum = parseInt(otherShareType, 10);
    if (isNaN(shareTypeNum) || shareTypeNum < 1) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    setSelectedShareType(shareTypeNum);
    setOtherShareType('');
    setShowOtherShareTypeInput(false);
  };

  const validateRoomNumber = () => {
    // Use roomStore.rooms for validation
    const { rooms } = useRoomStore.getState();
    const exists = Array.isArray(rooms) && rooms.some((r: any) => r && r.roomNumber === roomNumber.trim());
    if (exists) {
      Alert.alert('Error', 'Room number already exists in this property');
      return false;
    }
    return true;
  };

  const canSubmit = () => {
    return (
      roomNumber.trim() &&
      selectedBuilding &&
      selectedFloor &&
      selectedShareType !== null
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validateRoomNumber()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { room, status } = await addRoom(
        property.id,
        selectedBuilding,
        roomNumber.trim(),
        selectedFloor,
        selectedShareType!
      );
      if (room && status === 201) {
        router.replace('/property/rooms');
      } else {
        Alert.alert('Error', 'Failed to add room');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add room');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <Header title="Add Room" showBack />
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Room Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 101"
              placeholderTextColor="#999"
              value={roomNumber}
              onChangeText={setRoomNumber}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Building *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowBuildingDropdown(true)}
              disabled={isSubmitting}>
              <Text
                style={[
                  styles.dropdownButtonText,
                  !selectedBuilding && styles.dropdownPlaceholder,
                ]}>
                {selectedBuilding ? getSelectedBuildingName() : 'Select building'}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Floor *</Text>
            {!showOtherFloorInput ? (
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowFloorDropdown(true)}
                disabled={isSubmitting}>
                <Text
                  style={[
                    styles.dropdownButtonText,
                    !selectedFloor && styles.dropdownPlaceholder,
                  ]}>
                  {selectedFloor || 'Select floor'}
                </Text>
                <ChevronDown size={20} color="#666" />
              </TouchableOpacity>
            ) : (
              <View style={styles.otherInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter floor name"
                  placeholderTextColor="#999"
                  value={otherFloor}
                  onChangeText={setOtherFloor}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.addOtherButton}
                  onPress={handleAddOtherFloor}
                  disabled={isSubmitting}>
                  <Text style={styles.addOtherButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Share Type *</Text>
            {!showOtherShareTypeInput ? (
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowShareTypeDropdown(true)}
                disabled={isSubmitting}>
                <Text
                  style={[
                    styles.dropdownButtonText,
                    selectedShareType === null && styles.dropdownPlaceholder,
                  ]}>
                  {selectedShareType !== null ? `${selectedShareType}-sharing` : 'Select type'}
                </Text>
                <ChevronDown size={20} color="#666" />
              </TouchableOpacity>
            ) : (
              <View style={styles.otherInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 6"
                  placeholderTextColor="#999"
                  value={otherShareType}
                  onChangeText={setOtherShareType}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.addOtherButton}
                  onPress={handleAddOtherShareType}
                  disabled={isSubmitting}>
                  <Text style={styles.addOtherButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Removed Total Beds input as shareType covers this */}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']}>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={!canSubmit() || isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Room</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal
        visible={showBuildingDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBuildingDropdown(false)}>
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowBuildingDropdown(false)}>
          <View style={styles.dropdownContent}>
            {buildingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownOption}
                onPress={() => {
                  setSelectedBuilding(option.value as string);
                  setShowBuildingDropdown(false);
                }}>
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showFloorDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFloorDropdown(false)}>
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowFloorDropdown(false)}>
          <View style={styles.dropdownContent}>
            {floorOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownOption}
                onPress={() => handleFloorSelect(option.value)}>
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showShareTypeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareTypeDropdown(false)}>
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowShareTypeDropdown(false)}>
          <View style={styles.dropdownContent}>
            {shareTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownOption}
                onPress={() => handleShareTypeSelect(option.value)}>
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: '100%',
    maxWidth: 400,
    maxHeight: 300,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  otherInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addOtherButton: {
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addOtherButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#075E54',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

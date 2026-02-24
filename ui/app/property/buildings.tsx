import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '@/store/property';
import { Plus, X, Check } from 'lucide-react-native';
import { propertyService } from '@/services/propertyService';
import { Header } from '@/components/Header';

type PropertyType = 'Hostel' | 'Apartment';

export default function AddPropertyScreen() {
  const router = useRouter();
  const { addProperty } = usePropertyStore();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('Hostel');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([
    { id: '', name: '' },
  ]);
  const addBuilding = () => {
    setBuildings([...buildings, { id: '', name: '' }]);
  };
  const removeBuilding = (index: number) => {
    if (buildings.length > 1) {
      setBuildings(buildings.filter((_, i) => i !== index));
    }
  };
  const updateBuildingName = (index: number, name: string) => {
    setBuildings(buildings.map((b, i) => (i === index ? { ...b, name, id: name.trim().toLowerCase().replace(/\s+/g, '-') } : b)));
  };

  const canProceedFromStep1 = () => {
    return name.trim() && city.trim() && address.trim();
  };

  const canProceedFromStep2 = () => {
    return buildings.every((b) => b.name.trim());
  };

  const handleNext = () => {
    if (step === 1 && !canProceedFromStep1()) {
      Alert.alert('Incomplete', 'Please fill in all required fields');
      return;
    }

    if (step === 2 && !canProceedFromStep2()) {
      Alert.alert('Incomplete', 'Please name all buildings');
      return;
    }

    setStep(step + 1);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { property, status } = await addProperty(
        name.trim(),
        type,
        city.trim(),
        address.trim(),
        buildings
      );
      if (status === 201) {
        router.replace('/settings/properties');
        Alert.alert('Success', 'Property added successfully');
      } else {
        Alert.alert('Error', 'Failed to add property');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                s <= step && styles.stepCircleActive,
                s < step && styles.stepCircleComplete,
              ]}>
              {s < step ? (
                <Check size={16} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    s <= step && styles.stepNumberActive,
                  ]}>
                  {s}
                </Text>
              )}
            </View>
            {s < 3 && (
              <View
                style={[
                  styles.stepLine,
                  s < step && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStep1 = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepSubtitle}>
          Enter the basic details of your property
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Property Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Green Valley Hostel"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Property Type *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'Hostel' && styles.typeButtonActive,
                ]}
                onPress={() => setType('Hostel')}>
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'Hostel' && styles.typeButtonTextActive,
                  ]}>
                  Hostel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'Apartment' && styles.typeButtonActive,
                ]}
                onPress={() => setType('Apartment')}>
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'Apartment' && styles.typeButtonTextActive,
                  ]}>
                  Apartment
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mumbai"
              placeholderTextColor="#999"
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter full address"
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderStep2 = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Add Buildings</Text>
        <Text style={styles.stepSubtitle}>
          Add the buildings in your property
        </Text>

        <View style={styles.form}>
          {buildings.map((building, index) => (
            <View key={index} style={styles.buildingItem}>
              <View style={styles.buildingInputContainer}>
                <Text style={styles.label}>Building {index + 1} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`e.g., Building ${String.fromCharCode(65 + index)}`}
                  placeholderTextColor="#999"
                  value={building.name}
                  onChangeText={(text) => updateBuildingName(index, text)}
                />
              </View>
              {buildings.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBuilding(index)}>
                  <X size={20} color="#dc3545" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addBuildingButton} onPress={addBuilding}>
            <Plus size={20} color="#075E54" />
            <Text style={styles.addBuildingButtonText}>Add Another Building</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep3 = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review & Save</Text>
        <Text style={styles.stepSubtitle}>
          Review your property details before saving
        </Text>

        <View style={styles.reviewCard}>
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Basic Information</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Property Name:</Text>
              <Text style={styles.reviewValue}>{name}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Type:</Text>
              <Text style={styles.reviewValue}>{type}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>City:</Text>
              <Text style={styles.reviewValue}>{city}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Address:</Text>
              <Text style={styles.reviewValue}>{address}</Text>
            </View>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>
              Buildings ({buildings.length})
            </Text>
            {buildings.map((building, index) => (
              <View key={index} style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{index + 1}.</Text>
                <Text style={styles.reviewValue}>{building.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setStep(1)}>
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <Header title="Add Property" showBack />
      </SafeAreaView>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {renderStepIndicator()}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        <SafeAreaView edges={['bottom']}>
          <View style={styles.footer}>
            {step > 1 && step < 3 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStep(step - 1)}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  step === 1 ? styles.primaryButtonFull : {},
                ]}
                onPress={handleNext}
                disabled={
                  (step === 1 && !canProceedFromStep1()) ||
                  (step === 2 && !canProceedFromStep2())
                }>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, styles.primaryButtonFull]}
                onPress={handleSave}
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Property</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#075E54',
  },
  stepCircleComplete: {
    backgroundColor: '#25D366',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#25D366',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: -12,
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
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#075E54',
    borderColor: '#075E54',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  buildingItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  buildingInputContainer: {
    flex: 1,
    gap: 8,
  },
  removeButton: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc3545',
    marginBottom: 2,
  },
  addBuildingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#075E54',
    gap: 8,
    marginTop: 8,
  },
  addBuildingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 20,
  },
  reviewSection: {
    gap: 12,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    minWidth: 100,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#075E54',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#075E54',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

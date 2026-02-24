import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { ArrowRight, Info, Camera, ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { UnitResponse } from '@/services/unitService';
import { Colors } from '@/constants/Colors';
import { Fonts, Spacing, BorderRadius } from '@/constants/Theme';

export interface TenantForm {
  fullName: string;
  phoneNumber: string;
  address: string;
  documentId: string;
  profilePictureUrl: string;
  profilePictureFile?: any;
  checkInDate: string;
  depositAmount: string;
  rentType: 'monthly' | 'daywise';
  nextDueDate: string;
  status?: 'stay' | 'vacate';
}

export interface PaymentStatusForm {
  paymentStatus: 'paid' | 'due';
}

interface Step2Props {
  tenant: TenantForm;
  setTenant: (t: TenantForm) => void;
  paymentStatus: 'paid' | 'due';
  setPaymentStatus: (status: 'paid' | 'due') => void;
  onNext: () => void;
  onBack: () => void;
  selectedUnit: UnitResponse | null;
  loading: boolean;
  showNextButton?: boolean;
  nextButtonLabel?: string;
  nextButtonDisabled?: boolean;
}

export function Step2TenantDetails({
  tenant,
  setTenant,
  paymentStatus,
  setPaymentStatus,
  onNext,
  onBack,
  selectedUnit,
  loading,
  showNextButton = true,
  nextButtonLabel = 'Continue',
  nextButtonDisabled,
}: Step2Props) {
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const requiredFields: (keyof TenantForm)[] = [
    'fullName',
    'phoneNumber',
    'address',
    'documentId',
    'checkInDate',
    'depositAmount',
    'rentType',
    'nextDueDate',
    // 'status',
  ];
  // Calculate nextDueDate when checkInDate or rentType changes
  React.useEffect(() => {
    if (!tenant.checkInDate) return;
    if (paymentStatus === 'due') {
      // If due, nextDueDate defaults to checkInDate (editable)
      if (tenant.nextDueDate !== tenant.checkInDate) {
        setTenant({ ...tenant, nextDueDate: tenant.checkInDate });
      }
    } else {
      // If paid, nextDueDate is calculated as per rentType
      if (!tenant.rentType) return;
      let nextDue = '';
      const checkIn = new Date(tenant.checkInDate);
      if (tenant.rentType === 'monthly') {
        const d = new Date(checkIn);
        d.setMonth(d.getMonth() + 1);
        nextDue = d.toISOString().split('T')[0];
      } else if (tenant.rentType === 'daywise') {
        const d = new Date(checkIn);
        d.setDate(d.getDate() + 1);
        nextDue = d.toISOString().split('T')[0];
      }
      if (tenant.nextDueDate !== nextDue) {
        setTenant({ ...tenant, nextDueDate: nextDue });
      }
    }
  }, [tenant.checkInDate, tenant.rentType, paymentStatus]);
            {/* Payment Status Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Status *</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {['paid', 'due'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: paymentStatus === opt ? Colors.primary : Colors.border.medium,
                      backgroundColor: paymentStatus === opt ? Colors.primary : Colors.background.paper,
                      marginRight: 8,
                    }}
                    onPress={() => setPaymentStatus(opt as 'paid' | 'due')}
                    disabled={loading}
                  >
                    <Text style={{ color: paymentStatus === opt ? Colors.background.paper : Colors.text.primary }}>
                      {opt === 'paid' ? 'Paid' : 'Due'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
  // Rent Type selection
  const rentTypeOptions: Array<{ label: string; value: 'monthly' | 'daywise' }> = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Daywise', value: 'daywise' },
  ];

  // Status selection removed for creation
// ...existing code...
// Insert these inside the <View style={styles.form}> ... </View> block, after deposit amount input
// ...existing code...

  const isValid = requiredFields.every((f) => tenant[f]);

  const handleChange = (field: keyof TenantForm, value: string) => {
    setTenant({ ...tenant, [field]: value });
    setTouched({ ...touched, [field]: true });
  };

  const getBedInfo = () => {
    if (!selectedUnit) return null;
    const building =
      ('buildingName' in selectedUnit
        ? (selectedUnit as any).buildingName
        : undefined) || selectedUnit.buildingId;
    const floor =
      ('floorName' in selectedUnit ? (selectedUnit as any).floorName : undefined) ||
      selectedUnit.floorId;
    const room =
      ('roomNumber' in selectedUnit
        ? (selectedUnit as any).roomNumber
        : undefined) || selectedUnit.roomId;
    return { building, floor, room, bed: selectedUnit.bedNumber };
  };

  const bedInfo = getBedInfo();

  const pickImage = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to take photos');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required to select photos');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        handleChange('profilePictureUrl', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    handleChange('profilePictureUrl', '');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Tenant Details</Text>
          <Text style={styles.subtitle}>
            Fill in the tenant information to complete registration
          </Text>
        </View>

        {bedInfo && (
          <View style={styles.bedInfoCard}>
            <View style={styles.bedInfoHeader}>
              <Info size={16} color={Colors.info} />
              <Text style={styles.bedInfoTitle}>Selected Bed</Text>
            </View>
            <Text style={styles.bedInfoText}>
              Building {bedInfo.building} • Floor {bedInfo.floor} • Room{' '}
              {bedInfo.room} • Bed {bedInfo.bed}
            </Text>
            <TouchableOpacity
              style={styles.changeBedButton}
              onPress={onBack}
              disabled={loading}>
              <Text style={styles.changeBedText}>Change Bed</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[
                styles.input,
                !tenant.fullName && touched.fullName && styles.inputError,
              ]}
              value={tenant.fullName}
              onChangeText={(v) => handleChange('fullName', v)}
              editable={!loading}
              placeholder="Enter full name"
              placeholderTextColor={Colors.text.hint}
            />
            {!tenant.fullName && touched.fullName && (
              <Text style={styles.errorText}>Full name is required</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[
                styles.input,
                !tenant.phoneNumber && touched.phoneNumber && styles.inputError,
              ]}
              value={tenant.phoneNumber}
              onChangeText={(v) => handleChange('phoneNumber', v)}
              editable={!loading}
              placeholder="Enter phone number"
              placeholderTextColor={Colors.text.hint}
              keyboardType="phone-pad"
            />
            {!tenant.phoneNumber && touched.phoneNumber && (
              <Text style={styles.errorText}>Phone number is required</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                !tenant.address && touched.address && styles.inputError,
              ]}
              value={tenant.address}
              onChangeText={(v) => handleChange('address', v)}
              editable={!loading}
              placeholder="Enter full address"
              placeholderTextColor={Colors.text.hint}
              multiline
              numberOfLines={3}
            />
            {!tenant.address && touched.address && (
              <Text style={styles.errorText}>Address is required</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Document Id *</Text>
            <TextInput
              style={[
                styles.input,
                !tenant.documentId && touched.documentId && styles.inputError,
              ]}
              value={tenant.documentId}
              onChangeText={(v) => handleChange('documentId', v)}
              editable={!loading}
              placeholder="Enter Document Id here ( e,g. Aadhar number, Passport number or URL to the document )"
              placeholderTextColor={Colors.text.hint}
            />
            {!tenant.documentId && touched.documentId && (
              <Text style={styles.errorText}>Document URL is required</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Picture (Optional)</Text>
            {tenant.profilePictureUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: tenant.profilePictureUrl }}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeImage}
                  disabled={loading}>
                  <X size={20} color={Colors.background.paper} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePickerButtons}>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={() => pickImage(true)}
                  disabled={loading}>
                  <Camera size={24} color={Colors.primary} />
                  <Text style={styles.imagePickerButtonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={() => pickImage(false)}
                  disabled={loading}>
                  <ImageIcon size={24} color={Colors.primary} />
                  <Text style={styles.imagePickerButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Check-in Date *</Text>
            <TouchableOpacity
              style={[
                styles.input,
                !tenant.checkInDate && touched.checkInDate && styles.inputError,
                { justifyContent: 'center' },
              ]}
              onPress={() => setShowDatePicker(true)}
              disabled={loading}
            >
              <Text style={{ color: tenant.checkInDate ? Colors.text.primary : Colors.text.hint }}>
                {tenant.checkInDate || 'Select date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={tenant.checkInDate ? new Date(tenant.checkInDate) : new Date()}
                mode="date"
                display="default"
                onChange={(
                  event: DateTimePickerEvent,
                  date?: Date | undefined
                ) => {
                  setShowDatePicker(false);
                  if (date) handleChange('checkInDate', date.toISOString().split('T')[0]);
                }}
              />
            )}
            {!tenant.checkInDate && touched.checkInDate && (
              <Text style={styles.errorText}>Check-in date is required</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deposit Amount *</Text>
            <TextInput
              style={[
                styles.input,
                !tenant.depositAmount && touched.depositAmount && styles.inputError,
              ]}
              value={tenant.depositAmount}
              onChangeText={(v) => handleChange('depositAmount', v)}
              editable={!loading}
              placeholder="Enter deposit amount"
              placeholderTextColor={Colors.text.hint}
              keyboardType="decimal-pad"
            />
            {!tenant.depositAmount && touched.depositAmount && (
              <Text style={styles.errorText}>Deposit amount is required</Text>
            )}
          </View>


          {/* Rent Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rent Type *</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {rentTypeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: tenant.rentType === opt.value ? Colors.primary : Colors.border.medium,
                    backgroundColor: tenant.rentType === opt.value ? Colors.primary : Colors.background.paper,
                    marginRight: 8,
                  }}
                  onPress={() => handleChange('rentType', opt.value)}
                  disabled={loading}
                >
                  <Text style={{ color: tenant.rentType === opt.value ? Colors.background.paper : Colors.text.primary }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!tenant.rentType && touched.rentType && (
              <Text style={styles.errorText}>Rent type is required</Text>
            )}
          </View>

          {/* Payment Status Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Status *</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {['paid', 'due'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: paymentStatus === opt ? Colors.primary : Colors.border.medium,
                    backgroundColor: paymentStatus === opt ? Colors.primary : Colors.background.paper,
                    marginRight: 8,
                  }}
                  onPress={() => setPaymentStatus(opt as 'paid' | 'due')}
                  disabled={loading}
                >
                  <Text style={{ color: paymentStatus === opt ? Colors.background.paper : Colors.text.primary }}>
                    {opt === 'paid' ? 'Paid' : 'Due'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Next Due Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Next Due Date *</Text>
            <TouchableOpacity
              style={[
                styles.input,
                !tenant.nextDueDate && touched.nextDueDate && styles.inputError,
                { justifyContent: 'center' },
              ]}
              onPress={() => setShowDatePicker(true)}
              disabled={loading}
            >
              <Text style={{ color: tenant.nextDueDate ? Colors.text.primary : Colors.text.hint }}>
                {tenant.nextDueDate || 'Select date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={tenant.nextDueDate ? new Date(tenant.nextDueDate) : new Date()}
                mode="date"
                display="default"
                onChange={(
                  event: DateTimePickerEvent,
                  date?: Date | undefined
                ) => {
                  setShowDatePicker(false);
                  if (date) handleChange('nextDueDate', date.toISOString().split('T')[0]);
                }}
              />
            )}
            {!tenant.nextDueDate && touched.nextDueDate && (
              <Text style={styles.errorText}>Next due date is required</Text>
            )}
          </View>


        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={loading}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        {showNextButton && (
          <TouchableOpacity
            style={[
              styles.nextButton,
              ((typeof nextButtonDisabled === 'boolean'
                ? nextButtonDisabled
                : !isValid) ||
                loading) &&
                styles.disabledButton,
            ]}
            onPress={onNext}
            disabled={
              (typeof nextButtonDisabled === 'boolean'
                ? nextButtonDisabled
                : !isValid) || loading
            }>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.background.paper} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{nextButtonLabel}</Text>
                <ArrowRight size={18} color={Colors.background.paper} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.paper,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  title: {
    fontSize: Fonts.size.xxxl,
    fontWeight: Fonts.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Fonts.size.base,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  bedInfoCard: {
    backgroundColor: Colors.infoLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.info,
  },
  bedInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  bedInfoTitle: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
  },
  bedInfoText: {
    fontSize: Fonts.size.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
  },
  changeBedButton: {
    alignSelf: 'flex-start',
  },
  changeBedText: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.info,
  },
  form: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.md,
  },
  label: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.background.paper,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    borderRadius: BorderRadius.md,
    padding: 14,
    fontSize: Fonts.size.base,
    color: Colors.text.primary,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: Fonts.size.xs,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.base,
    backgroundColor: Colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.paper,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.background.paper,
  },
  disabledButton: {
    backgroundColor: Colors.neutral[300],
  },
  imagePreviewContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background.elevated,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: '35%',
    backgroundColor: Colors.danger,
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background.paper,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
  },
  imagePickerButtonText: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.primary,
  },
});

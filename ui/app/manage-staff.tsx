import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { staffService, subscriptionService } from '@/services/apiClient';
import { Staff, Subscription, PlanLimits } from '@/services/apiTypes';
import { ChevronLeft, Plus, Trash2, Edit2, X, Users, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import UpgradeModal from '@/components/UpgradeModal';

const STAFF_ROLES = [
  { label: 'Cooker', value: 'cooker' },
  { label: 'Worker', value: 'worker' },
  { label: 'Cleaner', value: 'cleaner' },
  { label: 'Manager', value: 'manager' },
  { label: 'Security', value: 'security' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Assistant', value: 'assistant' },
  { label: 'Other', value: 'other' },
];

const STAFF_STATUS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'On Leave', value: 'on_leave' },
  { label: 'Terminated', value: 'terminated' },
];

export default function ManageStaffScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedProperty } = useProperty();
  const isOnline = useNetworkStatus();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    mobileNumber: '',
    address: '',
    status: 'active',
    joiningDate: '',
    salary: '',
    emergencyContact: '',
    emergencyContactNumber: '',
    notes: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    if (!selectedProperty?.id) return;
    try {
      setLoading(true);
      const [staffResponse, subResponse] = await Promise.all([
        staffService.getStaff(
          selectedProperty.id,
          search || undefined,
          selectedRole || undefined,
          selectedStatus || undefined,
          1,
          100
        ),
        subscriptionService.getSubscription(),
      ]);
      setStaffList(staffResponse.data || []);
      setSubscription(subResponse.data || null);
    } catch (error) {
      console.error('Failed to load staff or subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProperty?.id, search, selectedRole, selectedStatus]);

  useFocusEffect(
    useCallback(() => {
      loadStaff();
    }, [loadStaff])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadStaff();
    } finally {
      setRefreshing(false);
    }
  }, [loadStaff]);

  useEffect(() => {
    if (!subscription) {
      setPlanLimits(null);
      return;
    }

    // Use limits directly from subscription object instead of separate API call
    const limits: PlanLimits = {
      properties: subscription.propertyLimit,
      tenants: subscription.tenantLimit,
      rooms: subscription.roomLimit,
      staff: subscription.staffLimit,
      price: subscription.price,
    };
    setPlanLimits(limits);
  }, [subscription]);

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      mobileNumber: '',
      address: '',
      status: 'active',
      joiningDate: '',
      salary: '',
      emergencyContact: '',
      emergencyContactNumber: '',
      notes: '',
    });
    setFormError(null);
    setEditingStaff(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (staff: Staff) => {
    setFormData({
      name: staff.name || '',
      role: staff.role || '',
      mobileNumber: staff.mobileNumber || '',
      address: staff.address || '',
      status: staff.status || 'active',
      joiningDate: staff.joiningDate || '',
      salary: staff.salary ? staff.salary.toString() : '',
      emergencyContact: staff.emergencyContact || '',
      emergencyContactNumber: staff.emergencyContactNumber || '',
      notes: staff.notes || '',
    });
    setEditingStaff(staff);
    setShowAddModal(true);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('Staff name is required');
      return false;
    }
    if (!formData.role) {
      setFormError('Please select a role');
      return false;
    }
    if (!formData.mobileNumber.trim()) {
      setFormError('Mobile number is required');
      return false;
    }
    if (!formData.address.trim()) {
      setFormError('Address is required');
      return false;
    }
    if (!/^\d{10}$/.test(formData.mobileNumber)) {
      setFormError('Mobile number must be 10 digits');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedProperty?.id) return;

    try {
      setFormLoading(true);
      setFormError(null);

      const staffData = {
        propertyId: selectedProperty.id,
        name: formData.name,
        role: formData.role as Staff['role'],
        mobileNumber: formData.mobileNumber,
        address: formData.address,
        status: formData.status as Staff['status'],
        joiningDate: formData.joiningDate || undefined,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyContactNumber: formData.emergencyContactNumber || undefined,
        notes: formData.notes || undefined,
      };

      if (editingStaff?.id) {
        await staffService.updateStaff(editingStaff.id, staffData);
      } else {
        await staffService.createStaff(staffData);
      }

      await loadStaff();
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      const message = error?.message || 'Failed to save staff';
      if (error?.code === 'SUBSCRIPTION_LIMIT_EXCEEDED' || error?.details?.status === 402) {
        setShowUpgradeModal(true);
        setShowAddModal(false);
        setFormError(message);
      } else if (message.includes('limit') || message.includes('Upgrade')) {
        setFormError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (staff: Staff) => {
    Alert.alert(
      'Remove Staff',
      `Are you sure you want to remove ${staff.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Remove',
          onPress: async () => {
            try {
              await staffService.deleteStaff(staff.id);
              await loadStaff();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove staff member');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const StaffCard = ({ item }: { item: Staff }) => (
    <Card style={{ ...styles.staffCard, marginBottom: spacing.md } as any}>
      <View style={styles.staffHeader}>
        <View style={styles.staffInfo}>
          <View style={styles.staffNameRow}>
            <Text style={[styles.staffName, { color: colors.text.primary }]}>{item.name}</Text>
            <View style={styles.staffActionIcons}>
              <TouchableOpacity
                style={styles.staffIconButton}
                onPress={() => openEditModal(item)}
                activeOpacity={0.6}
                disabled={!isOnline}>
                <Edit2 size={16} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.staffIconButton}
                onPress={() => handleDelete(item)}
                activeOpacity={0.6}
                disabled={!isOnline}>
                <Trash2 size={16} color={colors.danger[500]} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.staffRole, { color: colors.text.secondary }]}>
            {STAFF_ROLES.find((r) => r.value === item.role)?.label || item.role}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'active'
                  ? colors.background.tertiary
                  : item.status === 'on_leave'
                    ? colors.background.tertiary
                    : colors.background.tertiary,
            },
          ]}>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'active'
                    ? colors.success[500]
                    : item.status === 'on_leave'
                      ? colors.warning[500]
                      : colors.danger[500],
              },
            ]}>
            {STAFF_STATUS.find((s) => s.value === item.status)?.label || item.status}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

      <View style={styles.staffDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Mobile</Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.mobileNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Address</Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
        {item.joiningDate && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Joined</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {new Date(item.joiningDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        {item.salary && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Salary</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>₹ {item.salary}</Text>
          </View>
        )}
        {item.emergencyContact && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Emergency Contact</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]}>
              {item.emergencyContact}
            </Text>
          </View>
        )}
        {item.notes && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Notes</Text>
            <Text style={[styles.detailValue, { color: colors.text.primary }]} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  const hasPlanLimits = !!planLimits;
  const staffLimit = planLimits?.staff ?? 0;
  const hasReachedStaffLimit = !!subscription && hasPlanLimits && staffList.length >= staffLimit;
  const staffUsagePercent = hasPlanLimits && staffLimit > 0
    ? Math.min((staffList.length / staffLimit) * 100, 100)
    : 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Staff</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary[500], opacity: subscription && hasReachedStaffLimit ? 0.5 : 1 }]}
          onPress={openAddModal}
          disabled={!!(subscription && hasReachedStaffLimit)}
          activeOpacity={0.8}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Quota Banner */}
      {subscription && (
        <View style={[styles.quotaContainer, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.light }]}>
          <View style={styles.quotaRow}>
            <View style={styles.quotaInfo}>
              <Text style={[styles.quotaLabel, { color: colors.text.secondary }]}>Staff Members</Text>
              <View style={styles.quotaBar}>
                <View
                  style={[
                    styles.quotaFill,
                    {
                      backgroundColor: hasReachedStaffLimit ? colors.danger[500] : colors.primary[500],
                      width: `${staffUsagePercent}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.quotaText, { color: colors.text.primary }]}>
                {hasPlanLimits ? `${staffList.length} / ${staffLimit}` : 'Loading limits...'}
              </Text>
            </View>
            {subscription.plan !== 'premium' && (
              <TouchableOpacity
                onPress={() => router.push('/subscription')}
                style={[styles.upgradeButton, { backgroundColor: colors.background.tertiary }]}
                activeOpacity={0.7}>
                <Text style={[styles.upgradeText, { color: colors.primary[500] }]}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
          {hasReachedStaffLimit && (
            <View style={[styles.limitWarning, { backgroundColor: colors.background.tertiary, borderLeftColor: colors.danger[500] }]}>
              <AlertCircle size={16} color={colors.danger[500]} />
              <Text style={[styles.limitWarningText, { color: colors.danger[500] }]}>
                You've reached your staff limit. Upgrade to add more.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Filters */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background.secondary }]}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.background.secondary,
              color: colors.text.primary,
              borderColor: colors.border.light,
            },
          ]}
          placeholder="Search by name or mobile..."
          placeholderTextColor={colors.text.tertiary}
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedRole === null ? colors.primary[500] : colors.background.secondary,
                borderColor: selectedRole === null ? colors.primary[500] : colors.border.light,
              },
            ]}
            onPress={() => setSelectedRole(null)}>
            <Text
              style={[
                styles.filterChipText,
                { color: selectedRole === null ? colors.white : colors.text.secondary },
              ]}>
              All Roles
            </Text>
          </TouchableOpacity>

          {STAFF_ROLES.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedRole === role.value ? colors.primary[500] : colors.background.secondary,
                  borderColor: selectedRole === role.value ? colors.primary[500] : colors.border.light,
                },
              ]}
              onPress={() => setSelectedRole(selectedRole === role.value ? null : role.value)}>
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedRole === role.value ? colors.white : colors.text.secondary },
                ]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Staff List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : staffList.length === 0 ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.emptyContainer}>
          <EmptyState
            icon={Users}
            title="No Staff Added"
            subtitle="Add staff members to manage your team"
            actionLabel="Add Staff"
            onActionPress={openAddModal}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={staffList}
          renderItem={({ item }) => <StaffCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.header, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.light }]}>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
              activeOpacity={0.7}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              {editingStaff ? 'Edit Staff' : 'Add Staff Member'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.formContainer}>
            <ScrollView
              contentContainerStyle={styles.formScroll}
              keyboardShouldPersistTaps="handled">
              {formError && (
                <View style={[styles.errorBox, { backgroundColor: colors.background.tertiary, borderColor: colors.danger[200] }]}>
                  <Text style={[styles.errorText, { color: colors.danger[500] }]}>{formError}</Text>
                </View>
              )}

              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Staff Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="Enter staff name"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              {/* Role */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Role *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {STAFF_ROLES.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleOption,
                        {
                          backgroundColor: formData.role === role.value ? colors.primary[500] : colors.background.secondary,
                          borderColor: colors.border.light,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, role: role.value })}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.roleOptionText,
                          { color: formData.role === role.value ? colors.white : colors.text.secondary },
                        ]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Mobile Number */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Mobile Number *</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                  value={formData.mobileNumber}
                  onChangeText={(text) => setFormData({ ...formData, mobileNumber: text })}
                  maxLength={10}
                />
              </View>

              {/* Address */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Address *</Text>
                <TextInput
                  style={[
                    styles.textarea,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="Enter residential address"
                  placeholderTextColor={colors.text.tertiary}
                  multiline={true}
                  numberOfLines={3}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                />
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {STAFF_STATUS.map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.roleOption,
                        {
                          backgroundColor: formData.status === status.value ? colors.primary[500] : colors.background.secondary,
                          borderColor: colors.border.light,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, status: status.value })}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.roleOptionText,
                          { color: formData.status === status.value ? colors.white : colors.text.secondary },
                        ]}>
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Joining Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Joining Date</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.joiningDate}
                  onChangeText={(text) => setFormData({ ...formData, joiningDate: text })}
                />
              </View>

              {/* Salary */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Salary (Optional)</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="Enter monthly salary"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="decimal-pad"
                  value={formData.salary}
                  onChangeText={(text) => setFormData({ ...formData, salary: text })}
                />
              </View>

              {/* Emergency Contact */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Emergency Contact Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="Enter emergency contact name"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.emergencyContact}
                  onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
                />
              </View>

              {/* Emergency Contact Number */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Emergency Contact Number</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="Enter emergency contact mobile"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="phone-pad"
                  value={formData.emergencyContactNumber}
                  onChangeText={(text) => setFormData({ ...formData, emergencyContactNumber: text })}
                  maxLength={10}
                />
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text.primary }]}>Notes</Text>
                <TextInput
                  style={[
                    styles.textarea,
                    {
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.light,
                    },
                  ]}
                  placeholder="Add any additional notes"
                  placeholderTextColor={colors.text.tertiary}
                  multiline={true}
                  numberOfLines={3}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                />
              </View>

              {!isOnline && (
                <View style={[styles.offlineWarning, { backgroundColor: colors.background.tertiary, borderColor: colors.warning[200] }]}>
                  <Text style={[styles.offlineWarningText, { color: colors.warning[900] }]}>
                    📡 Offline - You cannot add or update staff without internet connection
                  </Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary[500], opacity: !isOnline ? 0.6 : 1 }]}
                onPress={handleSubmit}
                disabled={formLoading || !isOnline}
                activeOpacity={0.8}>
                {formLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={[styles.submitButtonText, { color: colors.white }]}>
                    {!isOnline ? 'Offline' : (editingStaff ? 'Update Staff' : 'Add Staff')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSelectPlan={() => {
          setShowUpgradeModal(false);
          loadStaff();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    fontSize: typography.fontSize.md,
  },
  filterScroll: {
    marginTop: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginRight: spacing.md,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  staffCard: {
    overflow: 'hidden',
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  staffInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  staffName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  staffActionIcons: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  staffIconButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffRole: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },
  staffDetails: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 0.35,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    flex: 0.65,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  formContainer: {
    flex: 1,
  },
  formScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.md,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.md,
    textAlignVertical: 'top',
  },
  roleOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginRight: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  roleOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  offlineWarning: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  offlineWarningText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  quotaContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quotaInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  quotaLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  quotaBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  quotaFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  quotaText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  upgradeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  upgradeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  limitWarningText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
});

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '@/components/ScreenContainer';
import { spacing, typography, radius, shadows } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';
import { staffService, subscriptionService } from '@/services/apiClient';
import { Staff, Subscription } from '@/services/apiTypes';
import { ChevronLeft, Plus, Trash2, Edit2, X, Users, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import { PLAN_LIMITS } from '@/config/planConfig';

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

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

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
      if (message.includes('limit') || message.includes('Upgrade')) {
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
          <Text style={[styles.staffName, { color: colors.text.primary }]}>{item.name}</Text>
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
                  ? colors.success[50]
                  : item.status === 'on_leave'
                    ? colors.warning[50]
                    : colors.danger[50],
            },
          ]}>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'active'
                    ? colors.success[600]
                    : item.status === 'on_leave'
                      ? colors.warning[600]
                      : colors.danger[600],
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

      <View style={[styles.divider, { backgroundColor: colors.border.light }]} />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary[50] }]}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}>
          <Edit2 size={18} color={colors.primary[500]} />
          <Text style={[styles.actionText, { color: colors.primary[500] }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.danger[50] }]}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}>
          <Trash2 size={18} color={colors.danger[500]} />
          <Text style={[styles.actionText, { color: colors.danger[500] }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Staff</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary[500], opacity: subscription && staffList.length >= (PLAN_LIMITS[subscription.plan as keyof typeof PLAN_LIMITS]?.staff || 4) ? 0.5 : 1 }]}
          onPress={openAddModal}
          disabled={!!(subscription && staffList.length >= (PLAN_LIMITS[subscription.plan as keyof typeof PLAN_LIMITS]?.staff || 4))}
          activeOpacity={0.8}>
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Quota Banner */}
      {subscription && (
        <View style={[styles.quotaContainer, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
          <View style={styles.quotaRow}>
            <View style={styles.quotaInfo}>
              <Text style={[styles.quotaLabel, { color: colors.text.secondary }]}>Staff Members</Text>
              <View style={styles.quotaBar}>
                <View
                  style={[
                    styles.quotaFill,
                    {
                      backgroundColor: staffList.length >= (PLAN_LIMITS[subscription.plan as keyof typeof PLAN_LIMITS]?.staff || 4) ? colors.danger[500] : colors.primary[500],
                      width: `${Math.min((staffList.length / (PLAN_LIMITS[subscription.plan as keyof typeof PLAN_LIMITS]?.staff || 4)) * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.quotaText, { color: colors.text.primary }]}>
                {staffList.length} / {PLAN_LIMITS[subscription.plan as keyof typeof PLAN_LIMITS]?.staff || 4}
              </Text>
            </View>
            {subscription.plan !== 'premium' && (
              <TouchableOpacity
                onPress={() => router.push('/subscription')}
                style={[styles.upgradeButton, { backgroundColor: colors.primary[50] }]}
                activeOpacity={0.7}>
                <Text style={[styles.upgradeText, { color: colors.primary[600] }]}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
          {staffList.length >= (PLAN_LIMITS[subscription.plan as keyof typeof PLAN_LIMITS]?.staff || 4) && (
            <View style={[styles.limitWarning, { backgroundColor: colors.danger[50], borderLeftColor: colors.danger[500] }]}>
              <AlertCircle size={16} color={colors.danger[600]} />
              <Text style={[styles.limitWarningText, { color: colors.danger[700] }]}>
                You've reached your staff limit. Upgrade to add more.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Filters */}
      <View style={[styles.filterContainer, { backgroundColor: colors.white }]}>
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
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
          <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
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
                <View style={[styles.errorBox, { backgroundColor: colors.danger[50], borderColor: colors.danger[200] }]}>
                  <Text style={[styles.errorText, { color: colors.danger[700] }]}>{formError}</Text>
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

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary[500] }]}
                onPress={handleSubmit}
                disabled={formLoading}
                activeOpacity={0.8}>
                {formLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={[styles.submitButtonText, { color: colors.white }]}>
                    {editingStaff ? 'Update Staff' : 'Add Staff'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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

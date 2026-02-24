import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/Header';
import { Colors } from '@/constants/Colors';
import { Fonts, Spacing, BorderRadius, Shadows } from '@/constants/Theme';
import { Edit2, Trash2, User, Phone, MapPin, FileText, Calendar, DollarSign } from 'lucide-react-native';
import { tenantService, TenantResponse } from '@/services/tenantService';
import { EditTenantModal } from '@/components/EditTenantModal';
import { usePropertyStore } from '@/store/property';

export default function TenantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tenant: string }>();
  const tenant: TenantResponse = params.tenant ? JSON.parse(params.tenant as string) : null;
  const { getSelectedProperty } = usePropertyStore();
  const property = getSelectedProperty();

  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!tenant) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']}>
          <Header title="Tenant Details" showBack />
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tenant not found</Text>
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await tenantService.deleteTenant(tenant.id);
      setDeleteModalVisible(false);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete tenant');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    router.back();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <Header
          title="Tenant Details"
          showBack
          rightComponent={
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowEditModal(true)}>
                <Edit2 size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setDeleteModalVisible(true)}>
                <Trash2 size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          {tenant.profilePictureUrl ? (
            <Image
              source={{ uri: tenant.profilePictureUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <User size={48} color={Colors.text.secondary} strokeWidth={1.5} />
            </View>
          )}
          <Text style={styles.tenantName}>{tenant.fullName}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{tenant.status}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Phone size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{tenant.phoneNumber || '-'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <MapPin size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>
                {(tenant as any).address || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <FileText size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Document ID</Text>
              <Text style={styles.detailValue}>{tenant.documentId || '-'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Calendar size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Check-in Date</Text>
              <Text style={styles.detailValue}>
                {formatDate(tenant.checkInDate)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <DollarSign size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Deposit Amount</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(tenant.depositAmount)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {property && (
        <EditTenantModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          propertyId={property.id}
          tenant={tenant}
          onSuccess={handleEditSuccess}
        />
      )}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !deleting && setDeleteModalVisible(false)}>
          <Pressable style={styles.deleteModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.deleteModalIcon}>
              <Trash2 size={32} color={Colors.danger} />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Tenant</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete{' '}
              <Text style={styles.deleteModalBold}>{tenant.fullName}</Text>?
              This action cannot be undone.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={handleDelete}
                disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color={Colors.background.paper} />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Fonts.size.md,
    color: Colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background.elevated,
    marginBottom: Spacing.base,
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  tenantName: {
    fontSize: Fonts.size.xxxl,
    fontWeight: Fonts.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.success,
    textTransform: 'capitalize',
  },
  detailsCard: {
    backgroundColor: Colors.background.paper,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadows.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.base,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Fonts.size.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModal: {
    backgroundColor: Colors.background.paper,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalBold: {
    fontWeight: '600',
    color: Colors.text.primary,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.paper,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background.paper,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { UnitResponse } from '@/services/unitService';
import { TenantForm } from './AddTenantStep2TenantDetails';
import { Colors } from '@/constants/Colors';
import { Fonts, Spacing, BorderRadius } from '@/constants/Theme';

interface Step3Props {
  selectedUnit: UnitResponse | null;
  tenant: TenantForm;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function Step3ReviewConfirm({
  selectedUnit,
  tenant,
  onBack,
  onConfirm,
  loading,
}: Step3Props) {
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

  const formatLabel = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .replace(/Url/g, 'URL');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Review & Confirm</Text>
          <Text style={styles.subtitle}>
            Please review all details before confirming
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Bed</Text>
          <View style={styles.card}>
            {bedInfo ? (
              <Text style={styles.bedText}>
                Building {bedInfo.building} • Floor {bedInfo.floor} • Room{' '}
                {bedInfo.room} • Bed {bedInfo.bed}
              </Text>
            ) : (
              <Text style={styles.emptyText}>No bed selected</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tenant Information</Text>
          <View style={styles.card}>
            {Object.entries(tenant).map(([key, value], index) => {
              // Only show relevant fields (status removed)
              if ([
                'fullName',
                'phoneNumber',
                'address',
                'documentId',
                'checkInDate',
                'depositAmount',
                'rentType',
                'nextDueDate',
              ].includes(key)) {
                return (
                  <View
                    key={key}
                    style={[
                      styles.detailRow,
                      index < Object.entries(tenant).length - 1 && styles.detailRowBorder,
                    ]}>
                    <Text style={styles.detailLabel}>{formatLabel(key)}</Text>
                    <Text style={styles.detailValue}>{value || '-'}</Text>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            By confirming, you agree that all information provided is accurate and
            complete.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={loading}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.disabledButton]}
          onPress={onConfirm}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.background.paper} />
          ) : (
            <>
              <Check size={18} color={Colors.background.paper} />
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </>
          )}
        </TouchableOpacity>
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
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  bedText: {
    fontSize: Fonts.size.base,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: Fonts.size.base,
    color: Colors.text.disabled,
    fontStyle: 'italic',
  },
  detailRow: {
    paddingVertical: Spacing.md,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  detailLabel: {
    fontSize: Fonts.size.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Fonts.size.base,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
  },
  warningBox: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    fontSize: Fonts.size.sm,
    color: Colors.text.primary,
    lineHeight: 18,
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
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmButtonText: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.background.paper,
  },
  disabledButton: {
    backgroundColor: Colors.neutral[300],
  },
});

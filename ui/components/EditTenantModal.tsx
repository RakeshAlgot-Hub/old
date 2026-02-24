import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { AppHeader } from './AppHeader';
import { Step2TenantDetails, TenantForm } from './AddTenantStep2TenantDetails';
import { Step1SelectBed } from './AddTenantStep1SelectBed';
import { unitService, UnitResponse } from '@/services/unitService';
import { tenantService, TenantResponse } from '@/services/tenantService';
import { Colors } from '@/constants/Colors';

interface EditTenantModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  tenant: TenantResponse;
  onSuccess: () => void;
}

function mapTenantResponseToForm(t: TenantResponse): TenantForm {
  return {
    fullName: t.fullName || '',
    phoneNumber: t.phoneNumber || '',
    address: (t as any).address || '',
    documentId: t.documentId || '',
    profilePictureUrl: (t as any).profilePictureUrl || '',
    checkInDate: t.checkInDate || '',
    depositAmount: t.depositAmount || '',
    rentType: (t as any).rentType || 'monthly',
    nextDueDate: (t as any).nextDueDate || '',
    status: (t as any).status || 'stay',
  };
}

export function EditTenantModal({
  visible,
  onClose,
  propertyId,
  tenant: initialTenant,
  onSuccess,
}: EditTenantModalProps) {
  const [tenant, setTenant] = useState<TenantForm>(
    mapTenantResponseToForm(initialTenant)
  );
  const [loading, setLoading] = useState(false);
  const [showBedSelect, setShowBedSelect] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<UnitResponse[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialTenant.unitId);

  const original = mapTenantResponseToForm(initialTenant);
  const isChanged =
    Object.keys(original).some((k) => (tenant as any)[k] !== (original as any)[k]) ||
    selectedUnitId !== initialTenant.unitId;

  useEffect(() => {
    if (visible) {
      setTenant(mapTenantResponseToForm(initialTenant));
      setSelectedUnitId(initialTenant.unitId);
      setShowBedSelect(false);
      setAvailableUnits([]);
    }
  }, [visible, initialTenant]);

  const handleSave = async () => {
    if (!isChanged) {
      return;
    }
    setLoading(true);
    try {
      await tenantService.updateTenant(initialTenant.id, {
        ...tenant,
        unitId: selectedUnitId,
      });
      setLoading(false);
      onSuccess();
      onClose();
    } catch (e) {
      setLoading(false);
    }
  };

  const handleOpenBedSelect = async () => {
    setLoading(true);
    try {
      const response = await unitService.getUnits(propertyId);
      setAvailableUnits(
        response.data.filter((u) => u.status === 'available' || u.id === initialTenant.unitId)
      );
      setShowBedSelect(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBedSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
    setShowBedSelect(false);
  };

  const selectedUnit = availableUnits.find((u) => u.id === selectedUnitId) || null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="formSheet">
      <View style={styles.modalContent}>
        <AppHeader
          title={showBedSelect ? 'Change Bed' : 'Edit Tenant'}
          showBack={true}
          onBack={showBedSelect ? () => setShowBedSelect(false) : onClose}
          showMenu={false}
        />
        {showBedSelect ? (
          <Step1SelectBed
            availableUnits={availableUnits}
            selectedUnitId={selectedUnitId}
            onSelect={handleBedSelect}
            onNext={() => setShowBedSelect(false)}
            loading={loading}
          />
        ) : (
          <Step2TenantDetails
            tenant={tenant}
            setTenant={setTenant}
            paymentStatus={"paid"}
            setPaymentStatus={() => {}}
            onNext={handleSave}
            onBack={handleOpenBedSelect}
            selectedUnit={selectedUnit}
            loading={loading}
            showNextButton={true}
            nextButtonLabel="Save Changes"
            nextButtonDisabled={!isChanged || loading}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    backgroundColor: Colors.background.paper,
  },
});

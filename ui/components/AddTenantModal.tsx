import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { AppHeader } from './AppHeader';
import { Step1SelectBed } from './AddTenantStep1SelectBed';
import { Step2TenantDetails, TenantForm } from './AddTenantStep2TenantDetails';
import { Step3ReviewConfirm } from './AddTenantStep3ReviewConfirm';
import { unitService, UnitResponse } from '@/services/unitService';
import { tenantService } from '@/services/tenantService';
import { paymentService } from '@/services/paymentService';
import { Colors } from '@/constants/Colors';

interface AddTenantModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  onSuccess: () => void;
}

export function AddTenantModal({ visible, onClose, propertyId, onSuccess }: AddTenantModalProps) {
  const [step, setStep] = useState(1);
  const [availableUnits, setAvailableUnits] = useState<UnitResponse[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitResponse | null>(null);
  const [tenant, setTenant] = useState<TenantForm>({
    fullName: '',
    phoneNumber: '',
    address: '',
    documentId: '',
    profilePictureUrl: '',
    checkInDate: '',
    depositAmount: '',
    rentType: 'monthly',
    nextDueDate: '',
    status: 'stay',
  });
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'due'>('paid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedUnitId(null);
      setTenant({
        fullName: '',
        phoneNumber: '',
        address: '',
        documentId: '',
        profilePictureUrl: '',
        checkInDate: '',
        depositAmount: '',
        rentType: 'monthly',
        nextDueDate: '',
        status: 'stay',
      });
      setLoading(true);
      setPaymentStatus('paid');
      unitService.getUnits(propertyId, { status: 'available' })
        .then(response => setAvailableUnits(response.data))
        .catch(() => setError('Failed to load beds'))
        .finally(() => setLoading(false));
    }
  }, [visible, propertyId]);

  useEffect(() => {
    setSelectedUnit((availableUnits || []).find(u => u.id === selectedUnitId) || null);
  }, [selectedUnitId, availableUnits]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleConfirm = async () => {
    if (!selectedUnit) return;
    setLoading(true);
    try {
      // 1. Create tenant in backend
      const tenantRes = await tenantService.createTenant({
        propertyId,
        unitId: selectedUnit.id,
        fullName: tenant.fullName,
        documentId: tenant.documentId,
        phoneNumber: tenant.phoneNumber,
        checkInDate: tenant.checkInDate,
        depositAmount: tenant.depositAmount,
        rentType: tenant.rentType,
        nextDueDate: tenant.nextDueDate,
        address: tenant.address,
        paymentStatus,
      });
      if (!tenantRes || !tenantRes.id) {
        throw new Error('Tenant creation failed');
      }
      setLoading(false);
      onSuccess();
      onClose();
    } catch (e) {
      setLoading(false);
      setError('Failed to add tenant');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="formSheet">
      <View style={styles.modalContent}>
        <AppHeader
          title={step === 1 ? 'Select Bed' : step === 2 ? 'Tenant Details' : 'Review & Confirm'}
          showBack={true}
          onBack={step === 1 ? onClose : handleBack}
          showMenu={false}
        />
        {step === 1 && (
          <Step1SelectBed
            availableUnits={availableUnits}
            selectedUnitId={selectedUnitId}
            onSelect={setSelectedUnitId}
            onNext={selectedUnitId ? handleNext : () => {}}
            loading={loading}
          />
        )}
        {step === 2 && (
          <Step2TenantDetails
            tenant={tenant}
            setTenant={setTenant}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            onNext={handleNext}
            onBack={handleBack}
            selectedUnit={selectedUnit}
            loading={loading}
          />
        )}
        {step === 3 && (
          <Step3ReviewConfirm
            selectedUnit={selectedUnit}
            tenant={tenant}
            onBack={handleBack}
            onConfirm={handleConfirm}
            loading={loading}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    backgroundColor: Colors.background.paper
  },
});

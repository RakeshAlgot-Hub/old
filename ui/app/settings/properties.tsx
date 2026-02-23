import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '@/store/property';
import { Building, Home, ChevronDown, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PropertiesScreen() {
  const router = useRouter();
  const { properties, selectedPropertyId, isInitialized, initialize, selectProperty, deleteProperty, error, clearError } = usePropertyStore();
  const { colors, fonts, spacing, borderRadius, shadows } = useTheme();
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditProperty = (propertyId: string) => {
    router.push(`/property/add-property?propertyId=${propertyId}`);
  } 

  // Passive error banner for fetch/init errors
  const renderPassiveError = () => {
    if (!error) return null;
    return (
      <View style={{ backgroundColor: '#fdecea', padding: 12, borderRadius: 8, margin: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: '#b71c1c', flex: 1 }}>{error}</Text>
        <TouchableOpacity onPress={clearError} style={{ marginLeft: 8 }}>
          <Text style={{ color: '#b71c1c', fontWeight: 'bold' }}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleDeleteProperty = (propertyId: string, propertyName: string) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${propertyName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteProperty(propertyId);
              Alert.alert('Success', 'Property deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete property');
            } finally {
              setIsDeleting(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  useEffect(() => {
    initialize();
  }, []);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  if (!isInitialized) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.default }]}> 
        <SafeAreaView edges={["top"]}>
          <Header title="Properties" showBack />
        </SafeAreaView>
        {renderPassiveError()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.default }]}> 
        <SafeAreaView edges={["top"]}>
          <Header title="Properties" showBack />
        </SafeAreaView>
        {renderPassiveError()}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconContainer}>
              <Building size={64} color={colors.neutral[400]} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: fonts.size.xl, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}> 
              No Properties Added
            </Text>
            <Text style={[styles.emptyText, { fontSize: fonts.size.base, color: colors.text.secondary }]}> 
              Add your first property to start managing tenants and rent
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary, borderRadius: borderRadius.lg, gap: spacing.sm, paddingVertical: spacing.base, paddingHorizontal: spacing.xl }]}
              onPress={() => router.push('/property/add-property')}>
              <Plus size={20} color={colors.background.paper} />
              <Text style={[styles.addButtonText, { color: colors.background.paper, fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold }]}> 
                Add Property
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}> 
      <SafeAreaView edges={["top"]}>
        <Header title="Properties" showBack />
      </SafeAreaView>
      {renderPassiveError()}
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { padding: spacing.base, gap: spacing.base }]}> 
        <TouchableOpacity
          style={[styles.propertySelector, { backgroundColor: colors.background.paper, borderRadius: borderRadius.lg, borderColor: colors.border.medium, padding: spacing.base }]}
          onPress={() => setShowPropertyPicker(true)}>
          <View style={[styles.propertySelectorLeft, { gap: spacing.md }]}> 
            <Home size={20} color={colors.primary} />
            <View style={styles.propertySelectorText}>
              <Text style={[styles.propertySelectorLabel, { fontSize: fonts.size.xs, color: colors.text.secondary }]}> 
                Selected Property
              </Text>
              <Text style={[styles.propertySelectorValue, { fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}> 
                {selectedProperty?.name || 'Select Property'}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {selectedProperty && (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.background.paper, borderRadius: borderRadius.lg, borderColor: colors.border.medium, padding: spacing.base, gap: spacing.md }]}>
              <View style={[styles.summaryHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={[styles.summaryTitle, { fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}>
                  Property Details
                </Text>
                <View style={[styles.actionButtons, { flexDirection: 'row', gap: spacing.sm }]}>
                  <TouchableOpacity
                    style={[styles.iconButton, { padding: spacing.sm }]}
                    onPress={() => handleEditProperty(selectedProperty.id)}>
                    <Edit2 size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconButton, { padding: spacing.sm }]}
                    onPress={() => handleDeleteProperty(selectedProperty.id, selectedProperty.name)}
                    disabled={isDeleting}>
                    <Trash2 size={18} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: fonts.size.base, color: colors.text.secondary }]}>Type:</Text>
                <Text style={[styles.summaryValue, { fontSize: fonts.size.base, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}>
                  {selectedProperty.type}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: fonts.size.base, color: colors.text.secondary }]}>City:</Text>
                <Text style={[styles.summaryValue, { fontSize: fonts.size.base, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}>
                  {selectedProperty.city}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: fonts.size.base, color: colors.text.secondary }]}>Address:</Text>
                <Text style={[styles.summaryValue, { fontSize: fonts.size.base, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}>
                  {selectedProperty.address}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { fontSize: fonts.size.base, color: colors.text.secondary }]}>Buildings:</Text>
                <Text style={[styles.summaryValue, { fontSize: fonts.size.base, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}> 
                  {selectedProperty.buildings?.length ?? 0}
                </Text>
              </View>
            </View>

            <View style={[styles.actionsContainer, { gap: spacing.md }]}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background.paper, borderRadius: borderRadius.lg, borderColor: colors.border.medium, padding: spacing.base, gap: spacing.md }]}
                onPress={() => router.push('/property/buildings')}>
                <Building size={24} color={colors.primary} />
                <Text style={[styles.actionButtonText, { fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}>
                  Manage Buildings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background.paper, borderRadius: borderRadius.lg, borderColor: colors.border.medium, padding: spacing.base, gap: spacing.md }]}
                onPress={() => router.push('/property/rooms')}>
                <Home size={24} color={colors.primary} />
                <Text style={[styles.actionButtonText, { fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}>
                  Manage {selectedProperty.type === 'Hostel' ? 'Rooms' : 'Flats'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {properties.length < 3 && (
          <TouchableOpacity
            style={[styles.addPropertyButton, { backgroundColor: colors.background.paper, borderRadius: borderRadius.lg, borderColor: colors.primary, padding: spacing.base, gap: spacing.sm }]}
            onPress={() => router.push('/property/add-property')}>
            <Plus size={20} color={colors.primary} />
            <Text style={[styles.addPropertyButtonText, { fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold, color: colors.primary }]}>
              Add Another Property
            </Text>
          </TouchableOpacity>
        )}

        {properties.length >= 3 && (
          <View style={[styles.limitNotice, { backgroundColor: colors.warningLight, borderRadius: borderRadius.md, padding: spacing.md }]}>
            <Text style={[styles.limitNoticeText, { fontSize: fonts.size.base, color: colors.text.primary }]}>
              Maximum limit reached (3 properties)
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showPropertyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPropertyPicker(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPropertyPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.paper, borderRadius: borderRadius.lg, padding: spacing.lg }]}>
            <Text style={[styles.modalTitle, { fontSize: fonts.size.lg, fontWeight: fonts.weight.semiBold, color: colors.text.primary, marginBottom: spacing.base }]}>
              Select Property
            </Text>
            {properties.map((property) => (
              <TouchableOpacity
                key={property.id}
                style={[
                  styles.propertyOption,
                  { backgroundColor: colors.background.elevated, borderRadius: borderRadius.md, padding: spacing.base, marginBottom: spacing.sm },
                  property.id === selectedPropertyId && { backgroundColor: colors.successLight, borderColor: colors.primary, borderWidth: 1 },
                ]}
                onPress={() => {
                  selectProperty(property.id);
                  setShowPropertyPicker(false);
                }}>
                <View>
                  <Text style={[styles.propertyOptionName, { fontSize: fonts.size.md, fontWeight: fonts.weight.semiBold, color: colors.text.primary }]}>
                    {property.name}
                  </Text>
                  <Text style={[styles.propertyOptionDetails, { fontSize: fonts.size.base, color: colors.text.secondary }]}>
                    {property.type} • {property.city}
                  </Text>
                </View>
                {property.id === selectedPropertyId && (
                  <View style={[styles.selectedIndicator, { backgroundColor: colors.primary, borderRadius: borderRadius.sm }]} />
                )}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
  },
  scrollView: {
    flex: 1,
  },
  content: {
  },
  propertySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  propertySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertySelectorText: {
    flex: 1,
  },
  propertySelectorLabel: {
    marginBottom: 2,
  },
  propertySelectorValue: {
  },
  summaryCard: {
    borderWidth: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
  },
  summaryTitle: {
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
  },
  summaryValue: {
  },
  actionsContainer: {
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonText: {
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addPropertyButtonText: {
  },
  limitNotice: {
    alignItems: 'center',
  },
  limitNoticeText: {
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
  },
  propertyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertyOptionName: {
    marginBottom: 4,
  },
  propertyOptionDetails: {
  },
  selectedIndicator: {
    width: 8,
    height: 8,
  },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import ArchiveWarningModal from '@/components/ArchiveWarningModal';
import FAB from '@/components/FAB';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import { ChevronLeft, Building2, MapPin, Trash2, Edit, Archive } from 'lucide-react-native';
import { spacing, typography, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';

export default function ManagePropertiesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { properties, loading, refreshProperties } = useProperty();
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [warningAction, setWarningAction] = useState<'edit' | 'delete' | null>(null);

  useEffect(() => {
    refreshProperties();
  }, []);

  const handleAddProperty = () => {
    router.push('/property-form');
  };

  const handleEditProperty = (property: any) => {
    if (property.active === false) {
      setSelectedProperty(property);
      setWarningAction('edit');
      setShowArchiveWarning(true);
    } else {
      // Navigate to edit screen (not implemented yet)
      console.log('Edit property:', property);
    }
  };

  const handleDeleteProperty = (property: any) => {
    if (property.active === false) {
      setSelectedProperty(property);
      setWarningAction('delete');
      setShowArchiveWarning(true);
    } else {
      // Show delete confirmation (not implemented yet)
      console.log('Delete property:', property);
    }
  };

  return (
    <ScreenContainer edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border.light }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Manage Properties</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <Skeleton height={150} count={3} />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Properties Yet"
            subtitle="Add your first property to get started with hostel management"
            actionLabel="Add Property"
            onActionPress={handleAddProperty}
          />
        ) : (
          properties.map((property, index) => (
            <Card key={index} style={styles.propertyCard}>
              <View style={styles.propertyHeader}>
                <View style={styles.propertyInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.propertyName, { color: colors.text.primary }]}>
                      {property.name}
                    </Text>
                    {property.active === false && (
                      <View style={[styles.archivedBadge, { backgroundColor: colors.warning[100] }]}>
                        <Archive size={12} color={colors.warning[600]} />
                        <Text style={[styles.archivedBadgeText, { color: colors.warning[600] }]}>Archived</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.addressRow}>
                    <MapPin size={14} color={colors.text.secondary} />
                    <Text style={[styles.addressText, { color: colors.text.secondary }]}>
                      {property.address}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[200] }]}
                  onPress={() => handleEditProperty(property)}
                  activeOpacity={0.7}>
                  <Edit size={16} color={colors.primary[600]} />
                  <Text style={[styles.actionText, { color: colors.primary[600] }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.danger[50], borderColor: colors.danger[200] }]}
                  onPress={() => handleDeleteProperty(property)}
                  activeOpacity={0.7}>
                  <Trash2 size={16} color={colors.danger[600]} />
                  <Text style={[styles.actionText, { color: colors.danger[600] }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB onPress={handleAddProperty} />

      <ArchiveWarningModal
        visible={showArchiveWarning}
        resourceName={selectedProperty?.name || 'Property'}
        resourceType="property"
        archivedReason={selectedProperty?.archivedReason}
        action={warningAction}
        onClose={() => {
          setShowArchiveWarning(false);
          setSelectedProperty(null);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  placeholder: {
    width: 40,
  },
  propertyCard: {
    marginBottom: spacing.md,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.xs,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  archivedBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});

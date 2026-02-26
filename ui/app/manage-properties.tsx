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
import FAB from '@/components/FAB';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';
import ApiErrorCard from '@/components/ApiErrorCard';
import { ChevronLeft, Building2, MapPin, Trash2, Edit } from 'lucide-react-native';
import { spacing, typography, radius } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useProperty } from '@/context/PropertyContext';

export default function ManagePropertiesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { properties, loading, refreshProperties } = useProperty();

  useEffect(() => {
    refreshProperties();
  }, []);

  const handleAddProperty = () => {
    router.push('/property-form');
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
                  <Text style={[styles.propertyName, { color: colors.text.primary }]}>
                    {property.name}
                  </Text>
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
                  activeOpacity={0.7}>
                  <Edit size={16} color={colors.primary[600]} />
                  <Text style={[styles.actionText, { color: colors.primary[600] }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.danger[50], borderColor: colors.danger[200] }]}
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
});

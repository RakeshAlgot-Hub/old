import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { TenantResponse } from '@/services/tenantService';

interface RecentTenantsProps {
  tenants: TenantResponse[];
  onViewAll?: () => void;
}

export function RecentTenants({ tenants, onViewAll }: RecentTenantsProps) {
  const recentTenants = tenants.slice(0, 5);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    if (!status) return Colors.neutral[500];
    switch (status.toLowerCase()) {
      case 'paid':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'overdue':
        return Colors.danger;
      default:
        return Colors.neutral[500];
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Tenants</Text>
        {onViewAll && tenants.length > 5 && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <ChevronRight size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {recentTenants.length === 0 ? (
        <View style={styles.emptyState}>
          <User size={32} color={Colors.neutral[400]} strokeWidth={1.5} />
          <Text style={styles.emptyText}>No tenants yet</Text>
          <Text style={styles.emptySubtext}>Add tenants to see them here</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {recentTenants.map((tenant, index) => (
            <View
              key={tenant.id}
              style={[
                styles.tenantItem,
                index < recentTenants.length - 1 && styles.tenantItemBorder,
              ]}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{getInitials(tenant.fullName)}</Text>
              </View>
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{tenant.fullName}</Text>
                <Text style={styles.tenantDate}>
                  Checked in {formatDate(tenant.checkInDate)}
                </Text>
              </View>
              {tenant.status ? (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(tenant.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(tenant.status) },
                    ]}
                  >
                    {tenant.status}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  list: {
    gap: 0,
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tenantItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.background.paper,
  },
  tenantInfo: {
    flex: 1,
    gap: 2,
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  tenantDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

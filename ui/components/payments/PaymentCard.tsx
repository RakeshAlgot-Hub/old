import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { paymentService } from '@/services/paymentService';
import { Calendar, DollarSign } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Fonts, Spacing, BorderRadius, Shadows } from '@/constants/Theme';
import { PaymentData } from '@/services/paymentService';

interface PaymentCardProps {
  payment: PaymentData;
  status: 'paid' | 'due';
  onStatusChanged?: () => void;
}

const statusConfig = {
  paid: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
    badgeColor: Colors.success,
    badgeText: 'Paid',
  },
  due: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.danger,
    badgeColor: Colors.danger,
    badgeText: 'Overdue',
  },
  // removed upcoming
};

export default function PaymentCard({ payment, status, onStatusChanged }: PaymentCardProps) {
  const [localStatus, setLocalStatus] = useState<'paid' | 'due'>(status as 'paid' | 'due');
  const config = statusConfig[localStatus];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  console.log('[DEBUG] Rendering PaymentCard with payment:', payment, 'and status:', status);
  // Fallbacks for missing data
  const tenantName = payment.tenantName || 'Unknown Tenant';
  const unitNumber = payment.unitName !== undefined && payment.unitName !== null ? `Unit ${payment.unitName}` : (payment.unitName || 'Unknown Unit');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={[styles.card, { backgroundColor: config.backgroundColor, borderColor: config.borderColor }]}> 
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={styles.header}> 
          <View style={styles.titleSection}> 
            <Text style={styles.tenantName}>{tenantName}</Text> 
            <Text style={styles.unitName}>{unitNumber}</Text> 
          </View> 
          <View style={[styles.badge, { backgroundColor: config.badgeColor }]}> 
            <Text style={styles.badgeText}>{config.badgeText}</Text> 
          </View> 
        </View>
        {/* Status change button */}
        <TouchableOpacity
          style={styles.statusButton}
          onPress={async () => {
            // Toggle between due and paid
            const next = localStatus === 'due' ? 'paid' : 'due';
            try {
              await paymentService.updatePaymentStatus(payment.id, next);
              setLocalStatus(next);
              if (onStatusChanged) onStatusChanged();
            } catch (e) {
              // Optionally show error
            }
          }}
        >
          <Text style={styles.statusButtonText}>Change</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <View style={styles.iconContainer}>
              <DollarSign size={18} color={config.badgeColor} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{formatCurrency(payment.amount)}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.iconContainer}>
              <Calendar size={18} color={config.badgeColor} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.detailLabel}>
                {status === 'paid' ? 'Paid On' : 'Due Date'}
              </Text>
              <Text style={styles.detailValue}>{formatDate(status === 'paid' ? payment.paidDate || payment.dueDate : payment.dueDate)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  tenantName: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  unitName: {
    fontSize: Fonts.size.sm,
    color: Colors.text.secondary,
    fontWeight: Fonts.weight.regular,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  badgeText: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.background.paper,
  },
  statusButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  statusButtonText: {
    color: Colors.background.paper,
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.md,
  },
  details: {
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Fonts.size.xs,
    color: Colors.text.secondary,
    fontWeight: Fonts.weight.regular,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
  },
});

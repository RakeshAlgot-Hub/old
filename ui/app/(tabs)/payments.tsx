import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Pressable } from 'react-native';
import PaymentCard from '@/components/payments/PaymentCard';
import { paymentService, PaymentData } from '@/services/paymentService';
import { usePropertyStore } from '@/store/property';
import { Colors } from '@/constants/Colors';
import { Fonts, Spacing, BorderRadius } from '@/constants/Theme';
import { Search } from 'lucide-react-native';

type TabType = 'paid' | 'due';


export default function PaymentsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('due');
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPayments = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (!selectedPropertyId) {
      setPayments([]);
      setError('No property selected');
      setLoading(false);
      return;
    }

    if (pageNum === 1) {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    } else {
      setLoadingMore(true);
    }

    try {
      setError(null);
      let data;

      switch (activeTab) {
        case 'paid':
          data = await paymentService.getPaidPayments(selectedPropertyId, {
            page: pageNum,
            limit: 20,
            search: searchDebounce
          });
          break;
        case 'due':
          data = await paymentService.getDuePayments(selectedPropertyId, {
            page: pageNum,
            limit: 20,
            search: searchDebounce
          });
          break;
      }

      if (pageNum === 1) {
        setPayments(Array.isArray(data.data) ? data.data : []);
        console.log('[DEBUG] Payments loaded:', data.data);
      } else {
        setPayments(prev => Array.isArray(data.data) ? [...prev, ...data.data] : prev);
        console.log('[DEBUG] Payments appended:', data.data);
      }

      setHasMore(pageNum < (data.totalPages || 1));
    } catch (err) {
      setError('Failed to load payments');
      console.error(err);
      if (pageNum === 1) {
        setPayments([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedPropertyId, searchDebounce]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadPayments(1);
  }, [activeTab, selectedPropertyId, searchDebounce]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPayments(nextPage);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    loadPayments(1, true);
  };

  const handleStatusChanged = () => {
    setPage(1);
    setHasMore(true);
    loadPayments(1);
  };

  const tabConfig = {
    paid: { label: 'Paid', count: Array.isArray(payments) ? payments.length : 0 },
    due: { label: 'Due', count: Array.isArray(payments) ? payments.length : 0 },
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No {activeTab} payments</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'paid' && 'All payments have been processed'}
        {activeTab === 'due' && 'No overdue payments'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {(['paid', 'due'] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tabConfig[tab].label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by tenant name..."
          placeholderTextColor={Colors.text.hint}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading && page === 1 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={({ item }) => (
            <PaymentCard
              payment={item}
              status={activeTab}
              onStatusChanged={handleStatusChanged}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState()}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.medium,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderBottomColor: Colors.primary,
  },
  tabLabel: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.secondary,
  },
  tabLabelActive: {
    color: Colors.background.paper,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.paper,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  errorText: {
    fontSize: Fonts.size.md,
    color: Colors.danger,
    fontWeight: Fonts.weight.semiBold,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.semiBold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Fonts.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

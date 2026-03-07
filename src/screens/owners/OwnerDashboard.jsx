import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ownerAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// --- REUSABLE COMPONENTS ---

/**
 * MetricCard Component
 * 2x2 Grid card for main metrics
 */
const MetricCard = React.memo(({ title, value, icon, backgroundColor, trend, trendColor, positive, isAlert, badge, onPress, loading }) => {
  if (loading) {
    return (
      <View style={[styles.metricCard, { backgroundColor: '#F3F4F6' }]}>
        <ActivityIndicator size="small" color="#9CA3AF" />
      </View>
    );
  }

  const isPositiveValue = typeof value === 'string' ? !value.includes('-') : value >= 0;
  const valueColor = isPositiveValue ? '#1F2937' : '#EF4444';

  return (
    <TouchableOpacity 
      style={[styles.metricCard, { backgroundColor }]} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <View style={styles.metricHeader}>
        <View style={styles.metricIconContainer}>
          {icon}
        </View>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
      {trend && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendText, { color: trendColor || '#6B7280' }]}>
            {positive ? '📈 ' : ''}{trend}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

/**
 * StatCard Component
 * Smaller cards for sub-metrics
 */
const StatCard = React.memo(({ title, value, icon, percentage, color }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardHeader}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
    </View>
    <Text style={styles.statCardTitle}>{title}</Text>
    {percentage !== undefined && (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    )}
  </View>
));

/**
 * RevenueDistributionChart Component
 */
const RevenueDistributionChart = React.memo(({ data }) => {
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#961919',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
    }
  };

  const chartData = {
    labels: data.map(d => d.category),
    datasets: [
      {
        data: data.map(d => d.value),
        colors: data.map(d => (opacity = 1) => d.color),
      },
    ],
  };

  return (
    <View style={styles.chartWrapper}>
      <BarChart
        data={chartData}
        width={width - 32}
        height={220}
        yAxisLabel="₹"
        chartConfig={chartConfig}
        verticalLabelRotation={0}
        fromZero
        withCustomBarColorFromData
        flatColor
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    </View>
  );
});

// --- MODALS ---

const DetailModal = ({ visible, onClose, title, children }) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// --- MAIN DASHBOARD TAB ---

export default function OwnerDashboard({ navigation, inTabbedView = false }) {
  const [selectedPeriod, setSelectedPeriod] = useState('Week');
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('SOURCE'); // SOURCE, METHOD, TOP
  const [selectedModal, setSelectedModal] = useState(null);

  const [customStartDate, setCustomStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const periods = ['Day', 'Week', 'Month', 'Custom'];
  const subTabs = useMemo(
    () => [
      { id: 'SOURCE', label: 'REVENUE BY SOURCE' },
      { id: 'METHOD', label: 'COLLECTION METHOD' },
      { id: 'TOP', label: 'TOP PERFORMING' },
    ],
    [],
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      const period = selectedPeriod.toLowerCase();
      let startStr = null;
      let endStr = null;
      if (period === 'custom') {
        startStr = customStartDate.toISOString();
        endStr = customEndDate.toISOString();
      }

      const response = await ownerAPI.getSummary(period, startStr, endStr);
      setDashboardData(response);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    setIsLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) setCustomStartDate(selectedDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) setCustomEndDate(selectedDate);
  };

  // Derived Data for Display
  const summary = dashboardData?.summary || {};
  const breakdown = summary.breakdown || {};
  
  const revenueValue = `₹${(summary.totalRevenue || 0).toLocaleString()}`;
  const expensesValue = `₹${(summary.expenses || 0).toLocaleString()}`;
  const profitValue = `₹${(summary.netProfit || 0).toLocaleString()}`;
  const creditsValue = `-₹${(dashboardData?.totalOwed || 0).toLocaleString()}`;
  
  const revenueTrend = dashboardData?.stats?.find(s => s.title === 'Total Revenue')?.trend || '+40%';
  const expensesTrend = `Expenses: ₹${(summary.expenses || 0).toLocaleString()}`;
  const profitTrend = `Expenses: ₹0.00`; // As per requirement
  const creditsBadge = `${dashboardData?.debtors?.length || 0} Members Overdue`;

  const chartData = [
    { category: 'Game Revenue', value: summary.gameRevenue || 0, color: '#FF9500' },
    { category: 'Food & Bev', value: summary.foodRevenue || 0, color: '#10B981' },
  ];

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF9500']} />
        }
      >
        {/* Date / Time Filter */}
        <View style={styles.dateSection}>
          <View style={styles.dateContainer}>
            <Icon name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.dateText}>
              {dashboardData?.currentDate || 'March 5, 2026'}
            </Text>
          </View>
          <View style={styles.periodSelector}>
            {periods.map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodBtn,
                  selectedPeriod === period && styles.periodBtnActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === period && styles.periodTextActive,
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedPeriod === 'Custom' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.datePickerBtnText}>{customStartDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <Text style={styles.dateSeparator}>to</Text>
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.datePickerBtnText}>{customEndDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showStartPicker && <DateTimePicker value={customStartDate} mode="date" onChange={onStartDateChange} />}
              {showEndPicker && <DateTimePicker value={customEndDate} mode="date" onChange={onEndDateChange} />}
            </View>
          )}
        </View>

        {/* SECTION 1: KEY METRICS (2x2 Grid) */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="REVENUE"
            value={revenueValue}
            icon={<Icon name="business-outline" size={24} color="#FFFFFF" />}
            backgroundColor="#FF9500"
            trend={revenueTrend}
            positive={true}
            onPress={() => setSelectedModal('REVENUE')}
            loading={isLoading}
          />
          <MetricCard
            title="EXPENSES"
            value={expensesValue}
            icon={<Icon name="document-text-outline" size={24} color="#4B5563" />}
            backgroundColor="#F3F4F6"
            trend={expensesTrend}
            onPress={() => setSelectedModal('EXPENSES')}
            loading={isLoading}
          />
          <MetricCard
            title="NET PROFIT"
            value={profitValue}
            icon={<Icon name="trending-up-outline" size={24} color="#FFFFFF" />}
            backgroundColor="#10B981"
            trend={profitTrend}
            onPress={() => setSelectedModal('PROFIT')}
            loading={isLoading}
          />
          <MetricCard
            title="CREDITS"
            value={creditsValue}
            icon={<Icon name="star-outline" size={24} color="#FF9500" />}
            backgroundColor="#FFF7ED"
            badge={creditsBadge}
            onPress={() => setSelectedModal('CREDITS')}
            loading={isLoading}
          />
        </View>

        {/* SECTION 2: REVENUE SUB-SECTIONS */}
        <View style={styles.subTabContainer}>
          <TouchableOpacity 
            style={[styles.subTab, activeSubTab === 'SOURCE' && styles.subTabActive]} 
            onPress={() => setActiveSubTab('SOURCE')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'SOURCE' && styles.subTabTextActive]}>REVENUE BY SOURCE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, activeSubTab === 'METHOD' && styles.subTabActive]} 
            onPress={() => setActiveSubTab('METHOD')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'METHOD' && styles.subTabTextActive]}>COLLECTION METHOD</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.subTab, activeSubTab === 'TOP' && styles.subTabActive]} 
            onPress={() => setActiveSubTab('TOP')}
          >
            <Text style={[styles.subTabText, activeSubTab === 'TOP' && styles.subTabTextActive]}>TOP PERFORMING</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Card */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredHeader}>
            <View style={styles.featuredIconBg}>
              <Icon name="business" size={20} color="#FF9500" />
            </View>
            <Text style={styles.featuredTitle}>TOTAL REVENUE</Text>
          </View>
          <Text style={styles.featuredValue}>{revenueValue}</Text>
        </View>

        {/* Side Metrics Row */}
        <View style={styles.sideMetricsRow}>
          <StatCard
            title="REVENUE BY GAME"
            value={summary.gameRevenueFormatted || '₹0'}
            icon={<Icon name="game-controller-outline" size={20} color="#FF9500" />}
            percentage={((summary.gameRevenue || 0) / (summary.totalRevenue || 1)) * 100}
            color="#FF9500"
          />
          <StatCard
            title="REVENUE BY FOOD"
            value={summary.foodRevenueFormatted || '₹0'}
            icon={<Icon name="fast-food-outline" size={20} color="#10B981" />}
            percentage={((summary.foodRevenue || 0) / (summary.totalRevenue || 1)) * 100}
            color="#10B981"
          />
        </View>

        {/* SECTION 3: OVERALL REVENUE DISTRIBUTION CHART */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Overall Revenue Distribution</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Real-time data</Text>
            </View>
          </View>
          <RevenueDistributionChart data={chartData} />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* --- MODALS --- */}

      {/* Revenue Detail Modal */}
      <DetailModal
        visible={selectedModal === 'REVENUE'}
        onClose={() => setSelectedModal(null)}
        title="Revenue Details"
      >
        <View style={styles.modalCardLarge}>
          <Text style={styles.modalCardLabel}>Total Revenue</Text>
          <Text style={styles.modalCardValueLarge}>{revenueValue}</Text>
        </View>
        <View style={styles.detailList}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Revenue by Game</Text>
            <Text style={styles.detailValue}>{summary.gameRevenueFormatted}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Revenue by Food</Text>
            <Text style={styles.detailValue}>{summary.foodRevenueFormatted}</Text>
          </View>
        </View>
        <RevenueDistributionChart data={chartData} />
      </DetailModal>

      {/* Expenses Detail Modal */}
      <DetailModal
        visible={selectedModal === 'EXPENSES'}
        onClose={() => setSelectedModal(null)}
        title="Expenses Details"
      >
        <View style={styles.modalCardLarge}>
          <Text style={styles.modalCardLabel}>Total Expenses</Text>
          <Text style={styles.modalCardValueLarge}>{expensesValue}</Text>
          <Text style={styles.modalCardSub}>100% of declared costs</Text>
        </View>
        <View style={styles.statCardsGrid}>
          <StatCard
            title="Owner Expenses"
            value={`₹${(summary.expenseSegregation?.owner || 0).toLocaleString()}`}
            percentage={59}
            color="#FF9500"
          />
          <StatCard
            title="Food Expenses"
            value={`₹${(summary.expenseSegregation?.kitchen || 0).toLocaleString()}`}
            percentage={41}
            color="#10B981"
          />
        </View>
      </DetailModal>

      {/* Net Profit Detail Modal */}
      <DetailModal
        visible={selectedModal === 'PROFIT'}
        onClose={() => setSelectedModal(null)}
        title="Profit Details"
      >
        <View style={[styles.modalCardLarge, { backgroundColor: '#E1F5FE' }]}>
          <Text style={styles.modalCardLabel}>Net Profit</Text>
          <Text style={[styles.modalCardValueLarge, { color: summary.netProfit < 0 ? '#EF4444' : '#10B981' }]}>
            {profitValue}
          </Text>
        </View>
        <View style={styles.detailList}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Profit by Game</Text>
            <Text style={styles.detailValue}>₹{(summary.estimatedProfitBySource?.game || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Profit by Food</Text>
            <Text style={styles.detailValue}>₹{(summary.estimatedProfitBySource?.prepared || 0).toLocaleString()}</Text>
          </View>
        </View>
      </DetailModal>

      {/* Credits Detail Modal */}
      <DetailModal
        visible={selectedModal === 'CREDITS'}
        onClose={() => setSelectedModal(null)}
        title="Credits Details"
      >
        <View style={[styles.modalCardLarge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 }]}>
          <Text style={[styles.modalCardLabel, { color: '#EF4444' }]}>Recoverable Credit</Text>
          <Text style={[styles.modalCardValueLarge, { color: '#EF4444' }]}>{creditsValue}</Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>{dashboardData?.debtors?.length || 0} Members</Text>
          </View>
        </View>
        
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Overdue Members</Text>
        </View>
        
        {dashboardData?.debtors?.map(member => (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberStatus}>NEGATIVE</Text>
          </View>
        ))}

        <View style={styles.infoNotice}>
          <Icon name="information-circle" size={20} color="#6B7280" />
          <Text style={styles.infoNoticeText}>
            Negative balances indicate member credits that need to be recovered.
          </Text>
        </View>
      </DetailModal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  dateSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#FF9500',
    fontWeight: '700',
  },
  customDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  datePickerBtn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  datePickerBtnText: {
    fontSize: 14,
    color: '#1F2937',
  },
  dateSeparator: {
    color: '#9CA3AF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  metricCard: {
    width: (width - 32) / 2,
    minHeight: 140,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#B91C1C',
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 4,
  },
  trendContainer: {
    marginTop: 'auto',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subTab: {
    marginRight: 24,
    paddingBottom: 12,
  },
  subTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF9500',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  subTabTextActive: {
    color: '#FF9500',
  },
  featuredCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: '#FF9500',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  featuredIconBg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  featuredValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  sideMetricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statCardTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginTop: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  chartSection: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalCardLarge: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalCardLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  modalCardValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalCardSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  detailList: {
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  statCardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  memberBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  memberBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberName: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  memberStatus: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '700',
  },
  infoNotice: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 24,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

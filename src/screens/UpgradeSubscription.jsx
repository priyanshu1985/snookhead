import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function UpgradeSubscription({ navigation }) {
  const plans = [
    {
      id: 1,
      name: 'Basic',
      price: '₹99',
      period: '/month',
      color: '#E0E0E0',
      features: [
        '5 Tables',
        'Basic Reports',
        'Email Support',
        'Single Location',
      ],
      current: true,
    },
    {
      id: 2,
      name: 'Standard',
      price: '₹299',
      period: '/month',
      color: '#FF8C42',
      features: [
        '20 Tables',
        'Advanced Reports',
        'Priority Support',
        '3 Locations',
        'Mobile App',
      ],
      current: false,
    },
    {
      id: 3,
      name: 'Premium',
      price: '₹799',
      period: '/month',
      color: '#1E3A5F',
      features: [
        'Unlimited Tables',
        'Real-time Analytics',
        '24/7 Support',
        'Unlimited Locations',
        'Mobile App + Web',
        'API Access',
      ],
      current: false,
    },
  ];

  const handleUpgrade = planName => {
    Alert.alert('Upgrade', `Upgrade to ${planName} plan?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Upgrade',
        onPress: () =>
          Alert.alert('Success', `You've upgraded to ${planName} plan!`),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade Plan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Unlock premium features for your business
          </Text>
        </View>

        {/* Plans */}
        {plans.map(plan => (
          <View
            key={plan.id}
            style={[styles.planCard, { borderColor: plan.color }]}
          >
            {plan.current && (
              <View
                style={[styles.currentBadge, { backgroundColor: plan.color }]}
              >
                <Text style={styles.currentText}>Current Plan</Text>
              </View>
            )}

            <Text style={[styles.planName, { color: plan.color }]}>
              {plan.name}
            </Text>

            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: plan.color }]}>
                {plan.price}
              </Text>
              <Text style={styles.period}>{plan.period}</Text>
            </View>

            {/* Features */}
            {plan.features.map((feature, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Icon name="checkmark-circle" size={16} color={plan.color} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            {/* Button */}
            <TouchableOpacity
              style={[
                styles.upgradeBtn,
                {
                  backgroundColor: plan.current ? '#CCC' : plan.color,
                },
              ]}
              onPress={() => handleUpgrade(plan.name)}
              disabled={plan.current}
            >
              <Text
                style={[
                  styles.upgradeBtnText,
                  { color: plan.current ? '#999' : '#fff' },
                ]}
              >
                {plan.current ? 'Current Plan' : 'Choose Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          <Text style={styles.faqItem}>
            ❓ Can I cancel anytime? Yes, without penalties.
          </Text>
          <Text style={styles.faqItem}>
            ❓ Do I get a free trial? Yes, 7 days free on any plan.
          </Text>
          <Text style={styles.faqItem}>
            ❓ Is there a setup fee? No, completely free to set up.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  period: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
  },
  upgradeBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  faqSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  faqItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
});

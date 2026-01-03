import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING } from '../theme';

const DashboardCard = ({
  title,
  value,
  icon,
  color = COLORS.primary,
  subtitle,
  growth,
}) => {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardValue}>{value}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        {growth && (
          <View style={styles.growthContainer}>
            <Icon
              name={growth > 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={growth > 0 ? COLORS.success : COLORS.error}
            />
            <Text
              style={[
                styles.growthText,
                {
                  color: growth > 0 ? COLORS.success : COLORS.error,
                },
              ]}
            >
              {Math.abs(growth)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    marginLeft: 48, // Align with title
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default DashboardCard;

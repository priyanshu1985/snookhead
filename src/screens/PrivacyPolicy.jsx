import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PrivacyPolicy({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Privacy & Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: October 2025</Text>

        <Section title="1. Introduction">
          <Text style={styles.text}>
            Game Zone ("we", "us", "our") operates the Game Zone app. This page
            informs you of our policies regarding the collection, use, and
            disclosure of personal data when you use our Service.
          </Text>
        </Section>

        <Section title="2. Information Collection and Use">
          <Text style={styles.text}>
            We collect several different types of information for various
            purposes to provide and improve our Service to you:
          </Text>
          <Text style={styles.bulletPoint}>
            • Personal Data (name, email, phone)
          </Text>
          <Text style={styles.bulletPoint}>
            • Usage Data (app usage patterns)
          </Text>
          <Text style={styles.bulletPoint}>
            • Device Information (device type, OS)
          </Text>
        </Section>

        <Section title="3. Security of Data">
          <Text style={styles.text}>
            The security of your data is important to us but remember that no
            method of transmission over the Internet or method of electronic
            storage is 100% secure. While we strive to use commercially
            acceptable means to protect your Personal Data, we cannot guarantee
            its absolute security.
          </Text>
        </Section>

        <Section title="4. Changes to This Privacy Policy">
          <Text style={styles.text}>
            We may update our Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the "Last Updated" date.
          </Text>
        </Section>

        <Section title="5. Contact Us">
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact
            us at support@gamezone.com
          </Text>
        </Section>

        <View style={styles.footer}>
          <Icon name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.footerText}>You're protected with Game Zone</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8C42',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

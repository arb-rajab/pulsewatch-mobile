import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { findIncident } from '../../../../../lib/incidents';
import { useAsync } from '../../../../../lib/use-async';

export default function IncidentDetailScreen() {
  const { targetId, incidentId } = useLocalSearchParams<{
    targetId: string;
    incidentId: string;
  }>();
  const numericId = Number(incidentId);

  const load = useCallback(() => findIncident(targetId, numericId), [targetId, numericId]);
  const { data, error, loading, refresh } = useAsync(load, [targetId, numericId]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} testID="incident-detail-error">
          {error.message}
        </Text>
        <Pressable testID="incident-detail-retry" onPress={refresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <Text>Loading incident…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text testID="incident-not-found">Incident #{incidentId} was not found.</Text>
      </View>
    );
  }

  const isOpen = data.status === 'open';

  return (
    <View style={styles.content}>
      <Text style={styles.title} testID="incident-detail-title">
        Incident #{data.id}
      </Text>
      <View style={styles.section}>
        <View style={styles.statusRow}>
          <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeResolved]} />
          <Text style={styles.statusText}>{isOpen ? 'Open' : 'Resolved'}</Text>
        </View>
        <Text style={styles.detailLine}>Opened: {data.opened_at}</Text>
        <Text style={styles.detailLine}>Closed: {data.closed_at ?? 'still open'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  section: { backgroundColor: '#F5F6F8', borderRadius: 10, padding: 16, gap: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: { width: 10, height: 10, borderRadius: 5 },
  badgeOpen: { backgroundColor: '#C0271E' },
  badgeResolved: { backgroundColor: '#1B8A3D' },
  statusText: { fontSize: 16, fontWeight: '600' },
  detailLine: { fontSize: 14, color: '#333' },
  errorText: { color: '#B00020', textAlign: 'center' },
  retryButton: { backgroundColor: '#0B1220', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
});

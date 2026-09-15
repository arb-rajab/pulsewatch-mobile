import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { api } from '../../../../../lib/api-client';
import { useAsync } from '../../../../../lib/use-async';
import type { Incident } from '../../../../../lib/api-types';

export default function IncidentListScreen() {
  const { targetId } = useLocalSearchParams<{ targetId: string }>();
  const load = useCallback(() => api.listTargetIncidents(targetId), [targetId]);
  const { data, error, loading, refresh } = useAsync(load, [targetId]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} testID="incidents-error">
          {error.message}
        </Text>
        <Pressable testID="incidents-retry" onPress={refresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data && loading) {
    return (
      <View style={styles.center}>
        <Text>Loading incidents…</Text>
      </View>
    );
  }

  if (data && data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No incidents recorded for this target.</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="incidents-list"
      data={data ?? []}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      renderItem={({ item }) => <IncidentRow targetId={targetId} incident={item} />}
      contentContainerStyle={styles.listContent}
    />
  );
}

function IncidentRow({ targetId, incident }: { targetId: string; incident: Incident }) {
  const isOpen = incident.status === 'open';
  return (
    <Pressable
      testID={`incident-row-${incident.id}`}
      style={styles.row}
      onPress={() => router.push(`/targets/${targetId}/incidents/${incident.id}`)}
    >
      <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeResolved]} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>Incident #{incident.id}</Text>
        <Text style={styles.rowSubtitle}>
          {isOpen ? 'Open' : 'Resolved'} · opened {incident.opened_at}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  listContent: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F5F6F8',
    gap: 12,
  },
  badge: { width: 10, height: 10, borderRadius: 5 },
  badgeOpen: { backgroundColor: '#C0271E' },
  badgeResolved: { backgroundColor: '#1B8A3D' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  errorText: { color: '#B00020', textAlign: 'center' },
  retryButton: { backgroundColor: '#0B1220', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
});

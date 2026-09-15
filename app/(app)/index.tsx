import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { loadTargetsWithStatus, targetLabel, DISPLAY_STATE_COLOR, TargetWithStatus } from '../../lib/targets';
import { useAsync } from '../../lib/use-async';

export default function TargetsScreen() {
  const load = useCallback(() => loadTargetsWithStatus(), []);
  const { data, error, loading, refresh } = useAsync(load, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} testID="targets-error">
          {error.message}
        </Text>
        <Pressable testID="targets-retry" onPress={refresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data && loading) {
    return (
      <View style={styles.center}>
        <Text>Loading targets…</Text>
      </View>
    );
  }

  if (data && data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No targets registered yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="targets-list"
      data={data ?? []}
      keyExtractor={(item) => item.target.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      renderItem={({ item }) => <TargetRow item={item} />}
      contentContainerStyle={styles.listContent}
    />
  );
}

function TargetRow({ item }: { item: TargetWithStatus }) {
  const { target, status } = item;
  const state = status?.display_state ?? 'unknown';
  const color = DISPLAY_STATE_COLOR[state] ?? DISPLAY_STATE_COLOR.unknown;

  return (
    <Pressable
      testID={`target-row-${target.id}`}
      style={styles.row}
      onPress={() => router.push(`/targets/${target.id}`)}
    >
      <View style={[styles.badge, { backgroundColor: color }]} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{targetLabel(target)}</Text>
        <Text style={styles.rowSubtitle}>
          {target.type.toUpperCase()} · {state}
          {status?.open_incident ? ' · open incident' : ''}
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
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666', marginTop: 2, textTransform: 'capitalize' },
  errorText: { color: '#B00020', textAlign: 'center' },
  retryButton: { backgroundColor: '#0B1220', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
});

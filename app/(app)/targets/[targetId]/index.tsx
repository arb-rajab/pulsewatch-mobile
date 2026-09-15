import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { api } from '../../../../lib/api-client';
import { DISPLAY_STATE_COLOR, targetLabel } from '../../../../lib/targets';
import { useAsync } from '../../../../lib/use-async';
import type { Target, TargetSlo, TargetStatus } from '../../../../lib/api-types';

interface TargetDetail {
  target: Target;
  status: TargetStatus;
  slo: TargetSlo;
}

async function loadDetail(targetId: string): Promise<TargetDetail> {
  const [target, status, slo] = await Promise.all([
    api.getTarget(targetId),
    api.getTargetStatus(targetId),
    api.getTargetSlo(targetId),
  ]);
  return { target, status, slo };
}

export default function TargetDetailScreen() {
  const { targetId } = useLocalSearchParams<{ targetId: string }>();
  const load = useCallback(() => loadDetail(targetId), [targetId]);
  const { data, error, loading, refresh } = useAsync(load, [targetId]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText} testID="target-detail-error">
          {error.message}
        </Text>
        <Pressable testID="target-detail-retry" onPress={refresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const { target, status, slo } = data;
  const color = DISPLAY_STATE_COLOR[status.display_state] ?? DISPLAY_STATE_COLOR.unknown;

  return (
    <ScrollView
      testID="target-detail-scroll"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Text style={styles.title}>{targetLabel(target)}</Text>

      <View style={styles.section}>
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: color }]} />
          <Text style={styles.statusText} testID="target-display-state">
            {status.display_state}
          </Text>
        </View>
        <Text style={styles.detailLine}>Streak: {status.streak}</Text>
        <Text style={styles.detailLine}>
          Last checked: {status.last_checked_at ?? 'never'}
        </Text>
        {status.agent_stale && <Text style={styles.warnLine}>Agent is stale</Text>}
        {status.open_incident && (
          <Text style={styles.warnLine} testID="target-open-incident">
            Open incident since {status.open_incident.opened_at}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          SLO — last {slo.window_days} day{slo.window_days === 1 ? '' : 's'}
        </Text>
        <Text style={styles.detailLine}>Uptime: {slo.uptime_pct.toFixed(2)}%</Text>
        <Text style={styles.detailLine}>Target: {slo.slo_target_pct.toFixed(2)}%</Text>
        <Text style={styles.detailLine}>
          Error budget consumed: {slo.error_budget_consumed_pct.toFixed(1)}%
        </Text>
      </View>

      <Pressable
        testID="view-incidents"
        style={styles.button}
        onPress={() => router.push(`/targets/${target.id}/incidents`)}
      >
        <Text style={styles.buttonText}>View incidents</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  section: { backgroundColor: '#F5F6F8', borderRadius: 10, padding: 16, gap: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  detailLine: { fontSize: 14, color: '#333' },
  warnLine: { fontSize: 14, color: '#B00020', marginTop: 4 },
  button: { backgroundColor: '#0B1220', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  errorText: { color: '#B00020', textAlign: 'center' },
  retryButton: { backgroundColor: '#0B1220', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
});

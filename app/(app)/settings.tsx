import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { useAsync } from '../../lib/use-async';
import type { DeviceToken } from '../../lib/api-types';

function deviceStatusLabel(device: DeviceToken): string {
  if (device.revoked_at) return 'Signed out';
  if (device.dead_at) return `Unreachable (${device.dead_reason ?? 'unknown reason'})`;
  return 'Active';
}

export default function SettingsScreen() {
  const { session, logout } = useAuth();
  const load = useCallback(() => api.listDeviceTokens(), []);
  const { data, error, loading, refresh } = useAsync(load, []);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const onRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await api.unregisterDeviceToken(id);
      refresh();
    } finally {
      setRevokingId(null);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      {session && (
        <Text style={styles.email} testID="settings-email">
          {session.email}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Registered devices</Text>

      {error && (
        <Text style={styles.errorText} testID="devices-error">
          {error.message}
        </Text>
      )}

      <FlatList
        testID="devices-list"
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No devices registered.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.deviceRow} testID={`device-row-${item.id}`}>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceTitle}>
                {item.platform.toUpperCase()} · {item.provider.toUpperCase()}
              </Text>
              <Text style={styles.deviceSubtitle}>{deviceStatusLabel(item)}</Text>
            </View>
            {!item.revoked_at && (
              <Pressable
                testID={`revoke-device-${item.id}`}
                onPress={() => onRevoke(item.id)}
                disabled={revokingId === item.id}
                style={styles.revokeButton}
              >
                <Text style={styles.revokeText}>
                  {revokingId === item.id ? 'Revoking…' : 'Revoke'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      />

      <Pressable
        testID="sign-out"
        style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
        onPress={onSignOut}
        disabled={signingOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  email: { fontSize: 14, color: '#555' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F6F8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  deviceInfo: { flex: 1 },
  deviceTitle: { fontSize: 15, fontWeight: '600' },
  deviceSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  revokeButton: {
    borderWidth: 1,
    borderColor: '#B00020',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  revokeText: { color: '#B00020', fontWeight: '600' },
  emptyText: { color: '#777', textAlign: 'center', marginTop: 12 },
  errorText: { color: '#B00020' },
  signOutButton: {
    backgroundColor: '#B00020',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  signOutText: { color: '#fff', fontWeight: '600' },
});

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '../lib/auth-context';

export default function Gate() {
  const { status } = useAuth();

  switch (status) {
    case 'bootstrapping':
      return (
        <View style={styles.center} testID="bootstrapping">
          <ActivityIndicator />
        </View>
      );
    case 'needs-server':
      return <Redirect href="/server-setup" />;
    case 'signed-out':
      return <Redirect href="/login" />;
    case 'signed-in':
      return <Redirect href="/(app)" />;
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

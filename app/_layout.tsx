import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../lib/auth-context';
import { useNotificationDeepLinking } from '../lib/use-notification-deep-linking';

function DeepLinkListener() {
  useNotificationDeepLinking();
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DeepLinkListener />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="server-setup" options={{ title: 'Connect to server' }} />
          <Stack.Screen name="login" options={{ title: 'Sign in' }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

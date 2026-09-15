import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../lib/auth-context';

export default function ServerSetupScreen() {
  const { configureServer } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await configureServer(url);
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that server URL.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Connect to your pulsewatch server</Text>
      <Text style={styles.subtitle}>
        pulsewatch is self-hosted — enter the URL of the server you run it on.
      </Text>
      <TextInput
        testID="server-url-input"
        style={styles.input}
        placeholder="https://pulsewatch.example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        value={url}
        onChangeText={setUrl}
      />
      {error && (
        <Text style={styles.error} testID="server-setup-error">
          {error}
        </Text>
      )}
      <Pressable
        testID="server-setup-submit"
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0B1220',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#B00020' },
});

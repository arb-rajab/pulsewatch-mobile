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

import { ApiError } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';

export default function LoginScreen() {
  const { login, serverUrl } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/(app)');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.isUnauthorized ? 'Incorrect email or password.' : err.message);
      } else {
        setError('Could not reach the server. Check the URL and your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Sign in</Text>
      {serverUrl && (
        <Text style={styles.subtitle} testID="login-server-url">
          {serverUrl}
        </Text>
      )}
      <TextInput
        testID="email-input"
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="password-input"
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && (
        <Text style={styles.error} testID="login-error">
          {error}
        </Text>
      )}
      <Pressable
        testID="login-submit"
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      <Pressable testID="change-server-link" onPress={() => router.push('/server-setup')}>
        <Text style={styles.link}>Change server</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#777', marginBottom: 12 },
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
  link: { color: '#0B1220', textAlign: 'center', marginTop: 16, textDecorationLine: 'underline' },
});

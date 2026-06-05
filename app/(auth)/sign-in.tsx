import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { spacing } from '../../src/theme/tokens';

export default function SignIn() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    if (mode === 'signIn') {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    } else {
      const result = await signUp(email, password);
      if (result.error) setError(result.error);
      else if (result.needsConfirmation) {
        setMessage('Check your email to confirm your account, then sign in.');
        setMode('signIn');
      }
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
    setError(null);
    setMessage(null);
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <Text variant="titleXL" color="textPrimary">
          {mode === 'signIn' ? 'Welcome back' : 'Create account'}
        </Text>

        <View style={{ marginTop: spacing[6], gap: spacing[4] }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
          />
        </View>

        {error ? (
          <Text variant="caption" color="destructive" style={{ marginTop: spacing[3] }}>
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text variant="caption" color="accentText" style={{ marginTop: spacing[3] }}>
            {message}
          </Text>
        ) : null}

        <Button
          label={mode === 'signIn' ? 'Sign in' : 'Create account'}
          onPress={submit}
          loading={loading}
          disabled={!email || !password}
          style={{ marginTop: spacing[6] }}
        />
        <Button
          variant="tertiary"
          label={mode === 'signIn' ? 'New here? Create an account' : 'Have an account? Sign in'}
          onPress={toggleMode}
          style={{ marginTop: spacing[2] }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

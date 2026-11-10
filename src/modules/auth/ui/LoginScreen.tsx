
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../AuthProvider';
import { AppText, Button, Screen, colors, radii, spacing } from '@/ui';

export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing information', 'Please enter email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await signIn(email, password);
    } catch (error) {
      Alert.alert(
        'Login failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="screenTitle">FitAI</AppText>
          <AppText tone="secondary">
            Your personal fitness companion
          </AppText>
        </View>

        <View style={styles.form}>
          <AppText variant="title">Welcome back</AppText>
          <AppText tone="secondary">
            Sign in to continue your fitness journey.
          </AppText>

          <View style={styles.field}>
            <AppText variant="label">Email</AppText>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="label">Password</AppText>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />
          </View>

          {submitting ? (
            <ActivityIndicator color={colors.action} />
          ) : (
            <Button label="Login" onPress={handleLogin} />
          )}

          <View style={styles.footer}>
            <AppText tone="secondary">
              Don&apos;t have an account?
            </AppText>
            <Pressable onPress={() => router.push('/signup' as never)}>
              <AppText style={styles.link}>Sign up</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.section,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  form: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.card,
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: 16,
    backgroundColor: colors.canvas,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  link: {
    color: colors.action,
    fontWeight: '700',
  },
});

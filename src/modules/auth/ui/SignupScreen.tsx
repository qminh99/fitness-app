
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

export function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing information', 'Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'The passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);

      await signUp(email, password, fullName);

      Alert.alert(
        'Registration successful',
        'Your account has been created. If email confirmation is enabled, please check your inbox to verify your email.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/login' as never),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Registration failed',
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
            Start your fitness journey today
          </AppText>
        </View>

        <View style={styles.form}>
          <AppText variant="title">Create account</AppText>
          <AppText tone="secondary">
            Join FitAI and start tracking your progress.
          </AppText>

          <View style={styles.field}>
            <AppText variant="label">Full name</AppText>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

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
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="label">Confirm password</AppText>
            <TextInput
              style={styles.input}
              placeholder="Enter password again"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
          </View>

          {submitting ? (
            <ActivityIndicator color={colors.action} />
          ) : (
            <Button label="Create account" onPress={handleSignup} />
          )}

          <View style={styles.footer}>
            <AppText tone="secondary">
              Already have an account?
            </AppText>
            <Pressable onPress={() => router.replace('/login' as never)}>
              <AppText style={styles.link}>Login</AppText>
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

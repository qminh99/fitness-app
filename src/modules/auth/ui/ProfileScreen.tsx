
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from 'react-native';

import { useAuth } from '../AuthProvider';
import { supabase } from '@/lib/supabase';
import { AppText, Button, Screen, colors, radii, spacing } from '@/ui';

type Profile = {
  full_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
};

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, height_cm, weight_kg')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error('Load profile error:', error.message);
      } else {
        setProfile(data);
      }

      setLoading(false);
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await signOut();
      // AuthGuard sẽ tự chuyển người dùng về Login.
    } catch (error) {
      Alert.alert(
        'Logout failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="screenTitle">Profile</AppText>
          <AppText tone="secondary">
            Manage your account and personal information.
          </AppText>
        </View>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <AppText variant="title" style={styles.avatarText}>
              {(profile?.full_name || user?.email || 'U')
                .charAt(0)
                .toUpperCase()}
            </AppText>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.action} />
          ) : (
            <>
              <AppText variant="heading">
                {profile?.full_name || 'FitAI User'}
              </AppText>
              <AppText tone="secondary">
                {user?.email || 'No email'}
              </AppText>
            </>
          )}
        </View>

        <View style={styles.card}>
          <AppText variant="heading">Personal information</AppText>

          {loading ? (
            <ActivityIndicator color={colors.action} />
          ) : (
            <>
              <View style={styles.infoRow}>
                <AppText tone="secondary">Full name</AppText>
                <AppText variant="bodyStrong">
                  {profile?.full_name || 'Not provided'}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <AppText tone="secondary">Height</AppText>
                <AppText variant="bodyStrong">
                  {profile?.height_cm != null
                    ? `${profile.height_cm} cm`
                    : 'Not provided'}
                </AppText>
              </View>

              <View style={styles.infoRow}>
                <AppText tone="secondary">Weight</AppText>
                <AppText variant="bodyStrong">
                  {profile?.weight_kg != null
                    ? `${profile.weight_kg} kg`
                    : 'Not provided'}
                </AppText>
              </View>
            </>
          )}
        </View>

        <View style={styles.logout}>
          {signingOut ? (
            <ActivityIndicator color={colors.action} />
          ) : (
            <Button
              label="Logout"
              onPress={handleLogout}
              accessibilityHint="Sign out of your FitAI account"
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: {
    color: colors.action,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logout: {
    marginTop: spacing.md,
  },
});

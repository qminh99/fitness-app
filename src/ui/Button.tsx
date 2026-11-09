import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './AppText';
import { colors, radii, spacing } from './tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  disabled?: boolean;
};

export function Button({ label, onPress, accessibilityHint, disabled = false }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityState={{ disabled }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && { opacity: 0.5 }]}
    >
      <AppText variant="bodyStrong" style={styles.label}>
        {label}
      </AppText>
      <Ionicons
        name="arrow-forward"
        size={20}
        color={colors.onAction}
        accessible={false}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.action,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.actionPressed },
  label: { color: colors.onAction, flexShrink: 1, textAlign: 'center' },
});

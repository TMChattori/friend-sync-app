import { Pressable, StyleSheet, Text } from 'react-native';

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'dark';
  disabled?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'dark' && styles.dark,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.text,
          variant === 'secondary' && styles.secondaryText,
          disabled && styles.disabledText,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#1f6fff',
  },
  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7ebf3',
  },
  dark: {
    backgroundColor: '#152033',
  },
  disabled: {
    backgroundColor: '#e8eefc',
    borderColor: '#e8eefc',
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryText: {
    color: '#1f6fff',
  },
  disabledText: {
    color: '#1f6fff',
  },
});

import { ActivityIndicator, Pressable, Text } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  className?: string;
}

const variantStyles = {
  primary: {
    container: 'bg-primary rounded-xl py-4 items-center active:opacity-80',
    text: 'text-white font-semibold text-base',
  },
  outline: {
    container: 'border border-primary rounded-xl py-4 items-center active:opacity-80',
    text: 'text-primary font-semibold text-base',
  },
  ghost: {
    container: 'py-4 items-center active:opacity-60',
    text: 'text-primary font-medium text-base',
  },
};

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  className = '',
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${styles.container} ${isDisabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#6C47FF'} />
      ) : (
        <Text className={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

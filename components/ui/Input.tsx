import { Text, TextInput, View } from 'react-native';

import type { TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className="gap-1">
      {label ? <Text className="text-sm font-medium text-slate-700">{label}</Text> : null}
      <TextInput
        className={`
          border rounded-xl px-4 py-3.5 text-base text-slate-900 bg-white
          ${error ? 'border-red-400' : 'border-slate-200'}
          ${className}
        `}
        placeholderTextColor="#94A3B8"
        {...props}
      />
      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}

import { useState } from 'react';
import { Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { sendOtp } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/store';

const schema = z.object({
  phone: z
    .string()
    .min(10, 'Enter a valid 10-digit mobile number')
    .max(10, 'Enter a valid 10-digit mobile number')
    .regex(/^\d+$/, 'Only digits allowed'),
});

type FormData = z.infer<typeof schema>;

export function PhoneForm() {
  const router = useRouter();
  const setPendingPhone = useAuthStore((s) => s.setPendingPhone);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const onSubmit = async ({ phone }: FormData) => {
    setServerError(null);
    const fullPhone = `+91${phone}`;
    const error = await sendOtp(fullPhone);

    if (error) {
      setServerError(error);
      return;
    }

    setPendingPhone(fullPhone);
    router.push('/(auth)/verify');
  };

  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-900">Welcome to Splitkar!</Text>
        <Text className="text-base text-slate-500">Enter your mobile number to get started.</Text>
      </View>

      <View className="flex-row items-end gap-2">
        <View className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white">
          <Text className="text-base text-slate-900">🇮🇳 +91</Text>
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="98765 43210"
                keyboardType="number-pad"
                maxLength={10}
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.phone?.message}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />
        </View>
      </View>

      {serverError ? <Text className="text-sm text-red-500 text-center">{serverError}</Text> : null}

      <Button title="Send OTP" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

      <Text className="text-xs text-slate-400 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}

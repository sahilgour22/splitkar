import { useState } from 'react';
import { Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { verifyOtp, sendOtp } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/store';

const schema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain only digits'),
});

type FormData = z.infer<typeof schema>;

export function OtpForm() {
  const router = useRouter();
  const pendingPhone = useAuthStore((s) => s.pendingPhone);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' },
  });

  const onSubmit = async ({ otp }: FormData) => {
    setServerError(null);
    const error = await verifyOtp(pendingPhone, otp);

    if (error) {
      setServerError(error);
      return;
    }
    // Auth store listener in root layout handles redirect on SIGNED_IN event
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setServerError(null);
    const error = await sendOtp(pendingPhone);
    setResendLoading(false);
    if (error) {
      setServerError(error);
    } else {
      setResendSuccess(true);
    }
  };

  const maskedPhone = pendingPhone.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');

  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-900">Verify your number</Text>
        <Text className="text-base text-slate-500">
          Enter the 6-digit code sent to{' '}
          <Text className="font-semibold text-slate-700">{maskedPhone}</Text>
        </Text>
      </View>

      <Controller
        control={control}
        name="otp"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="One-time password"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.otp?.message}
            returnKeyType="done"
            onSubmitEditing={handleSubmit(onSubmit)}
            autoFocus
          />
        )}
      />

      {serverError ? <Text className="text-sm text-red-500 text-center">{serverError}</Text> : null}

      {resendSuccess ? (
        <Text className="text-sm text-success text-center">OTP resent successfully.</Text>
      ) : null}

      <Button title="Verify" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

      <View className="flex-row justify-center items-center gap-1">
        <Text className="text-sm text-slate-500">{"Didn't receive the code?"}</Text>
        <Button
          title={resendLoading ? 'Sending…' : 'Resend'}
          onPress={handleResend}
          variant="ghost"
          disabled={resendLoading}
          className="py-1"
        />
      </View>

      <Button title="Change number" onPress={() => router.back()} variant="ghost" />
    </View>
  );
}

import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { SafeView } from '@/components/layout/SafeView';
import { OtpForm } from '@/features/auth/components/OtpForm';

export default function VerifyScreen() {
  return (
    <SafeView>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <OtpForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

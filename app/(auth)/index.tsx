import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { SafeView } from '@/components/layout/SafeView';
import { PhoneForm } from '@/features/auth/components/PhoneForm';

export default function PhoneScreen() {
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
          <PhoneForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}

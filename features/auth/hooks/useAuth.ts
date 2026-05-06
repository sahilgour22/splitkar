import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store';

/** Bootstraps the Supabase session listener. Call once in the root layout. */
export function useAuthListener() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Restore persisted session from SecureStore on cold start
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);
}

/** Send OTP to a phone number. Returns an error string or null. */
export async function sendOtp(phone: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  return error?.message ?? null;
}

/** Verify the OTP received via SMS. Returns an error string or null. */
export async function verifyOtp(phone: string, token: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  return error?.message ?? null;
}

/** Sign out and clear the local session. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

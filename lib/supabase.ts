import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase env vars — check your .env file');
}

/**
 * SecureStore adapter for Supabase session persistence.
 * Keeps auth tokens off AsyncStorage (plain text) and in the device keychain.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string): string | null | Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): void | Promise<void> =>
    SecureStore.setItemAsync(key, value),
  removeItem: (key: string): void | Promise<void> => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

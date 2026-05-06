import { create } from 'zustand';

import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  // Temporary phone number carried between phone → verify screens
  pendingPhone: string;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingPhone: (phone: string) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  isLoading: true,
  pendingPhone: '',
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
}));

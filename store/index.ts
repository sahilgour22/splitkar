import { create } from 'zustand';

import type { UserRow } from '@/types/database';

interface OfflineMutation {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
  retries: number;
}

interface AppState {
  // Current authenticated user profile
  currentUser: UserRow | null;
  setCurrentUser: (user: UserRow | null) => void;

  // Offline mutation queue — drains on reconnect
  offlineQueue: OfflineMutation[];
  enqueueOfflineMutation: (mutation: Omit<OfflineMutation, 'createdAt' | 'retries'>) => void;
  dequeueOfflineMutation: (id: string) => void;
  clearOfflineQueue: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  offlineQueue: [],
  enqueueOfflineMutation: (mutation) =>
    set((state) => ({
      offlineQueue: [...state.offlineQueue, { ...mutation, createdAt: Date.now(), retries: 0 }],
    })),
  dequeueOfflineMutation: (id) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.filter((m) => m.id !== id),
    })),
  clearOfflineQueue: () => set({ offlineQueue: [] }),
}));

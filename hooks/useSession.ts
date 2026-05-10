import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Returns the currently-authenticated user's UUID, or null while loading. */
export function useCurrentUserId(): string | null {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUid(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUid(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return uid;
}

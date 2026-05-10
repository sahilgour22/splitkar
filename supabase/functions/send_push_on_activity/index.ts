// Expo Push Notifications edge function
// Triggered by AFTER INSERT on activities via pg_net HTTP call.
// Reads recipients, filters by notifications_enabled + idempotency,
// batches to Expo's push API (max 100/request), logs each attempt.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Only these activity types generate a push notification
const PUSH_TYPES = new Set(['expense_added', 'settlement_recorded', 'member_joined']);

function formatAmount(paise: number, currency: string): string {
  const rupees = paise / 100;
  const formatted = rupees % 1 === 0 ? String(rupees) : rupees.toFixed(2);
  return currency === 'INR' ? `₹${formatted}` : `${currency} ${formatted}`;
}

interface ActivityRow {
  id: string;
  group_id: string;
  actor_id: string;
  type: string;
  payload: Record<string, unknown>;
}

interface TokenRow {
  user_id: string;
  token: string;
}

interface LogRow {
  activity_id: string;
  user_id: string;
  token: string;
  status: string;
  error: string | null;
}

serve(async (req: Request) => {
  try {
    const body = (await req.json()) as { activity: ActivityRow };
    const { activity } = body;

    if (!PUSH_TYPES.has(activity.type)) {
      return json({ ok: true, skipped: true });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch group + actor in parallel
    const [groupRes, actorRes] = await Promise.all([
      supabase.from('groups').select('name, currency').eq('id', activity.group_id).single(),
      supabase.from('users').select('name').eq('id', activity.actor_id).single(),
    ]);

    const groupName: string = (groupRes.data as { name: string } | null)?.name ?? 'Group';
    const groupCurrency: string = (groupRes.data as { currency: string } | null)?.currency ?? 'INR';
    const actorName: string = (actorRes.data as { name: string | null } | null)?.name ?? 'Someone';
    const payload = activity.payload;

    // Build notification body per activity type
    let notifBody = '';
    const data: Record<string, string> = {
      group_id: activity.group_id,
      activity_id: activity.id,
    };

    switch (activity.type) {
      case 'expense_added': {
        const desc = String(payload.description ?? 'an expense');
        const amount = formatAmount(
          Number(payload.amount ?? 0),
          String(payload.currency ?? groupCurrency),
        );
        notifBody = `${actorName} added ${desc} — ${amount}`;
        if (payload.expense_id) data.expense_id = String(payload.expense_id);
        break;
      }
      case 'settlement_recorded': {
        const amount = formatAmount(Number(payload.amount ?? 0), groupCurrency);
        notifBody = `${actorName} recorded a ${amount} settlement`;
        if (payload.settlement_id) data.settlement_id = String(payload.settlement_id);
        break;
      }
      case 'member_joined':
        notifBody = `${actorName} joined`;
        break;
      default:
        return json({ ok: true, skipped: true });
    }

    // Members who want notifications, excluding the actor
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', activity.group_id)
      .eq('notifications_enabled', true)
      .neq('user_id', activity.actor_id);

    if (!members || members.length === 0) {
      return json({ ok: true, no_recipients: true });
    }

    const memberIds: string[] = (members as { user_id: string }[]).map((m) => m.user_id);

    // Idempotency: skip users already logged for this activity
    const { data: alreadyLogged } = await supabase
      .from('push_log')
      .select('user_id')
      .eq('activity_id', activity.id)
      .in('user_id', memberIds);

    const loggedSet = new Set(
      ((alreadyLogged ?? []) as { user_id: string }[]).map((r) => r.user_id),
    );
    const eligibleIds = memberIds.filter((id) => !loggedSet.has(id));

    if (eligibleIds.length === 0) {
      return json({ ok: true, all_already_sent: true });
    }

    // Fetch push tokens for eligible recipients
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', eligibleIds);

    if (!tokenRows || tokenRows.length === 0) {
      return json({ ok: true, no_tokens: true });
    }

    const tokens = tokenRows as TokenRow[];
    const logRows: LogRow[] = [];

    // Send in batches of 100 (Expo API limit)
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100);
      const messages = batch.map((row) => ({
        to: row.token,
        title: groupName,
        body: notifBody,
        data,
        sound: 'default',
      }));

      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(messages),
        });
        const result = (await res.json()) as { data?: { status: string }[] };
        const statuses = result.data ?? [];

        batch.forEach((row, idx) => {
          const s = statuses[idx];
          logRows.push({
            activity_id: activity.id,
            user_id: row.user_id,
            token: row.token,
            status: s?.status ?? 'unknown',
            error: s?.status !== 'ok' ? JSON.stringify(s) : null,
          });
        });
      } catch (err) {
        batch.forEach((row) => {
          logRows.push({
            activity_id: activity.id,
            user_id: row.user_id,
            token: row.token,
            status: 'error',
            error: err instanceof Error ? err.message : 'fetch_failed',
          });
        });
      }
    }

    if (logRows.length > 0) {
      await supabase.from('push_log').insert(logRows);
    }

    return json({ ok: true, sent: logRows.length });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

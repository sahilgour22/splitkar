# Splitkar! — Phase 1 Roadmap

Each slice is shippable independently on the `main` branch.
Slices build on top of each other; complete them in order.

---

## Slice 0 — Foundation ✅ (current)

**Goal:** Prove the stack works end-to-end.

- [x] Expo Router scaffold + TypeScript strict
- [x] NativeWind + gluestack-ui configured
- [x] Supabase client wired
- [x] TanStack Query + Zustand initialised
- [x] ESLint + Prettier + Husky pre-commit hook
- [x] GitHub Actions CI (typecheck + lint on every push)
- [x] Postgres schema applied (`docs/schema.sql`)
- [x] `.env.example` documented

---

## Slice 1 — Phone OTP Auth ✅ (current)

**Goal:** User can sign in with a phone number; session persists across restarts.

Screens:

- `(auth)/index.tsx` — phone number input + "Send OTP" button
- `(auth)/verify.tsx` — 6-digit OTP input + "Verify" button
- Root layout auth guard redirects unauthenticated users to `(auth)`

Done when:

- [ ] OTP is received on a real Indian phone number
- [ ] Session survives app restart (Supabase session stored in SecureStore)
- [ ] Unauthenticated deep links redirect to auth then back

> **Setup required:** Enable Phone provider in Supabase Auth dashboard.
> Configure an SMS provider (Twilio / MessageBird / Vonage) or use Supabase
> "Phone testing" OTPs for dev. See README → Supabase Setup.

---

## Slice 2 — User Profile Setup

**Goal:** First-time user completes their profile; returning user can edit it.

Screens:

- Profile setup modal (shown once, after first OTP verification, if `name` is null)
- `(app)/profile/index.tsx` — edit name, avatar, default currency

Done when:

- [ ] Profile photo upload works (Supabase Storage bucket `avatars`)
- [ ] Display name shown in header and balance cards
- [ ] Default currency (INR) shown in expense form

---

## Slice 3 — Groups (Create + Join + List)

**Goal:** User can create a group and invite others via code or QR.

Screens:

- `(app)/groups/index.tsx` — list of groups (replaces stub)
- `(app)/groups/new.tsx` — create group (name, emoji/avatar, currency)
- Group detail header with invite code display + QR
- Join-via-invite-code flow (deep link `splitkar://join?code=XXXX`)

Done when:

- [ ] Creating a group makes the creator an `admin` member
- [ ] Invite code deep link opens app and joins the group
- [ ] QR code encodes the deep link (use `react-native-qrcode-svg`)
- [ ] Group list updates in real-time when another device adds the user

---

## Slice 4 — Expenses (Equal Split)

**Goal:** Group member can add and view expenses split equally.

Screens:

- `(app)/groups/[id]/index.tsx` — expense list with running total
- Expense add bottom sheet — description, amount, date, payer, equal split

Done when:

- [ ] Adding an expense creates one `expenses` row + N `expense_splits` rows
- [ ] Splits sum to expense total (server-validated by `validate_splits` trigger)
- [ ] Expense list shows who paid, total, and brief split summary
- [ ] Offline add: expense queued locally and synced on reconnect

---

## Slice 5 — All Split Types

**Goal:** Support exact, percentage, and shares splits.

Additions to expense form:

- Split type selector (equal / exact / percentage / shares)
- Dynamic split editor for each type (real-time validation)

Done when:

- [ ] Exact: user enters each person's amount; form validates sum = total
- [ ] Percentage: user enters %; form validates sum = 100%
- [ ] Shares: user enters share units; amounts computed proportionally
- [ ] Edit expense: changes propagate to `expense_splits`
- [ ] Soft-delete expense: `is_deleted = true`, balances recalculate

---

## Slice 6 — Balances

**Goal:** User can see who owes whom across a group and overall.

Screens:

- `(app)/groups/[id]/balances.tsx` — group balances + simplified debts
- `(app)/activity/index.tsx` repurposed as "Overall" tab with cross-group net

Done when:

- [ ] `compute_balances()` called via Supabase RPC
- [ ] `simplifyDebts()` run client-side (see `docs/debt-simplification.md`)
- [ ] "You owe ₹X" / "Y owes you ₹Z" summary card on groups list
- [ ] Balances refresh when a new expense or settlement is added

---

## Slice 7 — Settle Up

**Goal:** Member can record a settlement; INR groups get a UPI deep link.

Screens:

- `(app)/groups/[id]/settle.tsx` — settle-up form (payer, payee, amount, note)
- UPI "Pay Now" button (opens UPI app if installed)

Done when:

- [ ] Settlement recorded in `settlements` table
- [ ] UPI deep link: `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&tn=<note>&cu=INR`
- [ ] Balances update immediately after settlement (optimistic update)
- [ ] Settlement cannot be edited or deleted (immutable)

---

## Slice 8 — Activity Feed

**Goal:** Group members can see a timeline of all events.

Screen:

- `(app)/groups/[id]/activity.tsx` — paginated activity list

Done when:

- [ ] Activity item created for: expense added/edited/deleted, settlement recorded,
      member joined/left
- [ ] Activity shows actor avatar, action description, timestamp
- [ ] Real-time: new activities appear without manual refresh (Supabase Realtime)

---

## Slice 9 — Push Notifications

**Goal:** Members are notified of new expenses and settlements in their groups.

Done when:

- [ ] Expo push token registered in `users` table (add `push_token TEXT` column)
- [ ] Supabase Edge Function `notify-members` triggered on `expenses` INSERT and
      `settlements` INSERT
- [ ] Notification deep-links to the relevant group screen
- [ ] User can disable notifications per-group (Phase 2 setting)

> **Setup required:** Configure Expo push credentials in EAS and in the Edge
> Function environment. See Expo Notifications docs.

---

## Open TODOs

<!-- TODO(team): Finalize bundle ID + signing certs before first public store submission
     (after domain purchase + final name lock). Track in: this file + app.json. -->

<!-- TODO(team): Confirm SMS provider (Twilio recommended) for production OTP.
     Dev testing uses Supabase built-in test OTPs. -->

<!-- TODO(team): Design branding — primary/accent colours, icon, splash screen.
     Placeholder palette currently used: primary #6C47FF, accent #FF6B35. -->

<!-- TODO(team): Add `push_token TEXT` column to `users` table before Slice 9.
     Migration: ALTER TABLE public.users ADD COLUMN push_token TEXT; -->

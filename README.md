# Splitkar!

> Split expenses with friends — India-first alternative to Splitwise.

**Stack:** Expo SDK 54 · React Native · TypeScript strict · Expo Router · Supabase · NativeWind · TanStack Query · Zustand

---

## Team Onboarding

### Prerequisites

| Tool     | Version | Install             |
| -------- | ------- | ------------------- |
| Node.js  | ≥ 20    | https://nodejs.org  |
| npm      | ≥ 10    | Bundled with Node   |
| Expo CLI | ≥ 55    | `npm i -g expo-cli` |
| EAS CLI  | ≥ 14    | `npm i -g eas-cli`  |
| Git      | any     | https://git-scm.com |

For physical device testing you also need:

- **iOS:** Xcode 16+ (Mac only) OR the Expo Go app
- **Android:** Android Studio OR the Expo Go app

---

### 1. Clone the repo

```bash
git clone https://github.com/<org>/splitkar.git
cd splitkar
npm install --legacy-peer-deps
```

---

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the values. See the table below for who holds which secrets:

| Variable                        | Who has it     | Where to find it                         |
| ------------------------------- | -------------- | ---------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Both devs      | Supabase dashboard → Settings → API      |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Both devs      | Supabase dashboard → Settings → API      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Team lead only | Supabase dashboard → Settings → API      |
| `SUPABASE_DB_PASSWORD`          | Team lead only | Supabase dashboard → Settings → Database |
| `SUPABASE_ACCESS_TOKEN`         | Team lead only | supabase.com/dashboard/account/tokens    |
| `EXPO_PUBLIC_EAS_PROJECT_ID`    | Both devs      | `eas init` then copy ID from output      |
| `EXPO_PUBLIC_SENTRY_DSN`        | Both devs      | sentry.io → project → Client Keys        |
| `EXPO_PUBLIC_POSTHOG_API_KEY`   | Both devs      | posthog.com → project settings           |

> **Security rules:**
>
> - Never commit `.env` — it is gitignored.
> - Never put a secret (service*role, db password, PAT) in an `EXPO_PUBLIC*\*` variable.
> - Rotate the Supabase PAT immediately if it is ever exposed in chat, logs, or a PR.

---

### 3. Apply the database schema

1. Open the Supabase dashboard for your project → SQL Editor
2. Paste and run the contents of `docs/schema.sql`
3. Enable the Phone auth provider in Supabase dashboard → Authentication → Providers → Phone
4. Configure an SMS provider (Twilio recommended) or use Supabase's built-in test OTPs

**Supabase test OTPs (dev only):**  
Dashboard → Authentication → Configuration → Phone → enable "Enable phone testing"  
Then you can use OTP `123456` for any number in the test allowlist.

---

### 4. Start the development server

```bash
npm start
```

Then:

- Press `a` for Android emulator
- Press `i` for iOS simulator (Mac only)
- Scan the QR code with Expo Go on a physical device

> **Note:** Sentry and PostHog native modules require an **Expo Dev Build**, not Expo Go.
> For full fidelity, build the dev client:
>
> ```bash
> eas build --profile development --platform android   # or ios
> ```

---

### 5. How to add a new teammate

1. **GitHub:** Add to the repo with "Write" access at  
   `https://github.com/<org>/splitkar/settings/access`

2. **Supabase:** Add as a member at  
   `https://supabase.com/dashboard/org/<org-slug>/members`  
   Grant "Developer" role (not "Owner").

3. **EAS:** Add at  
   `https://expo.dev/accounts/<account>/settings/members`  
   Grant "Developer" role.

4. **Secrets:** Share `EXPO_PUBLIC_*` variables via your team password manager.  
   Do **not** share `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_PASSWORD` unless the  
   new member needs to run migrations.

---

## Project Structure

See `docs/architecture.md` for the full folder map and data flow diagram.

```
app/          Expo Router pages (file = route)
features/     Business logic co-located by domain
components/   Shared, domain-agnostic UI
lib/          Third-party client setup (Supabase, QueryClient)
store/        Zustand global store
utils/        Pure utility functions (money, debt, UPI)
types/        TypeScript types (Supabase DB types)
constants/    Brand colours, currency metadata
docs/         Design docs (schema, architecture, roadmap)
```

---

## Development Workflow

### Branch strategy

| Branch        | Purpose                                           |
| ------------- | ------------------------------------------------- |
| `main`        | Shippable code — protected, require PR + CI green |
| `develop`     | Integration branch                                |
| `feat/<name>` | Feature branches — one slice at a time            |

### Make a commit

```bash
git add <files>
git commit -m "feat(auth): phone OTP login"
```

**Conventional commit prefixes:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

Husky runs lint-staged before every commit (ESLint + Prettier). CI runs on every push.

### Open a PR

Fill in `.github/pull_request_template.md`. CI must pass before merge.

---

## Useful Commands

```bash
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint (0 warnings allowed)
npm run lint:fix       # Auto-fix lint issues
npm run format         # Prettier
npm start              # Expo dev server
eas build --profile development --platform android
```

---

## Phase 1 Roadmap

See `docs/roadmap.md` for the full slice breakdown.

Current: **Slice 1 — Phone OTP auth** ✅  
Next: **Slice 2 — User profile setup**

---

## Key Decisions

| Decision             | Choice                                 | Reason                                           |
| -------------------- | -------------------------------------- | ------------------------------------------------ |
| Money storage        | BIGINT paise (not FLOAT)               | Exact arithmetic, no rounding errors             |
| Session storage      | expo-secure-store                      | Tokens stay in device keychain, off AsyncStorage |
| Debt simplification  | Greedy net-balance (client-side)       | See `docs/debt-simplification.md`                |
| Deep links (Phase 1) | `splitkar://` dev scheme               | Domain not purchased yet                         |
| Component library    | NativeWind custom components (Phase 1) | No framework conflicts                           |
| Bundle ID            | `com.splitkar.app`                     | PLACEHOLDER — finalise before store submission   |

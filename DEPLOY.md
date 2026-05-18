# TheCardLab Deploy Runbook

Production targets:
- **Web**: `thecardlab.app` + `www.thecardlab.app` → Vercel (static + API rewrite)
- **API**: `api.thecardlab.app` → Fly.io (Docker, autoscale)
- **DB**: Neon Postgres (managed, pooled, SSL)
- **iOS**: App Store via EAS Build + Submit, bundle `com.thecardlab.app`
- **Auth**: Clerk (production instance)
- **AI**: OpenAI
- **Payments**: Stripe (live secret + webhook secret)
- **Domain registrar**: Namecheap

## Fast path

```bash
./scripts/src/setup-production.sh
```
Idempotent. Pauses + prints what's missing. Re-run after each manual step.

---

## One-time setup

### Apple Developer
1. Enroll: <https://developer.apple.com/programs/enroll/> ($99/yr)
2. App Store Connect → My Apps → **New App** with:
   - Bundle ID: `com.thecardlab.app`
   - Primary lang: English
   - SKU: `thecardlab-ios`
3. Record values:
   - `appleId` (email)
   - `appleTeamId` (Membership page)
   - `ascAppId` (App Information → Apple ID, numeric)
4. Edit `artifacts/thecardlab-mobile/eas.json` `submit.production.ios` with those.

### Google Play Console
1. Enroll: <https://play.google.com/console/signup> ($25 one-time)
2. Verify identity — Google requires gov ID for new developer accounts (D-U-N-S optional)
3. Create application:
   - App name: **TheCardLab**
   - Default language: en-US
   - Category: Finance (alt: Sports)
   - Free/paid: Free with IAP (subscriptions)
   - Declarations: Ads (no), Content guidelines, US export
4. **Service account for EAS Submit**:
   - Google Cloud Console → IAM → Service Accounts → Create
   - Role: Service Account User
   - Create JSON key, download
   - Play Console → Setup → API access → Link the service account → grant **Release manager** access
   - Save JSON as `artifacts/thecardlab-mobile/google-play-service-account.json` (gitignored)
   - For CI: paste JSON contents into GitHub secret `PLAY_SERVICE_ACCOUNT_JSON`
5. Internal testing track first → closed/open testing → production
6. Required assets (set via Play Console):
   - App icon 512×512 PNG
   - Feature graphic 1024×500
   - Phone screenshots (2-8, 16:9 or 9:16)
   - Short description (80 char), full description (4000 char)
   - Privacy policy URL: <https://thecardlab.app/privacy>
   - Data safety form (App Privacy equivalent)
   - Content rating questionnaire

### Expo / EAS
```bash
cd artifacts/thecardlab-mobile
pnpm exec eas login
pnpm exec eas project:init        # link to expo project
```
Generate `EXPO_TOKEN` at <https://expo.dev/accounts/[acct]/settings/access-tokens> → add as GitHub secret.

### Fly.io
```bash
brew install flyctl     # or: curl -L https://fly.io/install.sh | sh
flyctl auth login
cd artifacts/api-server
flyctl apps create thecardlab-api
flyctl postgres create --name thecardlab-db --region iad   # or use Neon instead
flyctl postgres attach thecardlab-db -a thecardlab-api
```
Set secrets (one-time):
```bash
flyctl secrets set -a thecardlab-api \
  CLERK_PUBLISHABLE_KEY=pk_live_... \
  CLERK_SECRET_KEY=sk_live_... \
  AI_INTEGRATIONS_OPENAI_API_KEY=sk-... \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_...
```
Token for CI: `flyctl tokens create deploy -a thecardlab-api` → GitHub secret `FLY_API_TOKEN`.

### Namecheap DNS (do AFTER Vercel + Fly are deployed)

Login → Domain List → **Manage** thecardlab.app → **Advanced DNS** tab. Delete the default URL Redirect and parking records, then add:

| Type  | Host | Value                          | TTL  |
|-------|------|--------------------------------|------|
| A Record    | `@`  | `76.76.21.21`                  | Auto |
| CNAME Record | `www` | `cname.vercel-dns.com.`        | Auto |
| CNAME Record | `api` | `thecardlab-api.fly.dev.`      | Auto |

Save. Propagation ~5-30 min (max 24h). Verify:
```bash
dig +short thecardlab.app           # → 76.76.21.21
dig +short www.thecardlab.app       # CNAME → Vercel IP
dig +short api.thecardlab.app       # → fly IPs
curl https://api.thecardlab.app/api/healthz
```

In Vercel dashboard: Project → Settings → Domains → Add `thecardlab.app` + `www.thecardlab.app`. Vercel auto-issues TLS via Let's Encrypt.

In Fly: `flyctl certs add api.thecardlab.app -a thecardlab-api` — issues cert once DNS propagates.

### Neon (recommended over Fly Postgres for scale)
1. <https://neon.tech> → create project `thecardlab` → region near Fly app
2. Copy pooled connection string (with `-pooler` host)
3. `flyctl secrets set -a thecardlab-api DATABASE_URL='postgresql://...?sslmode=require'`
4. Run migration: `cd lib/db && DATABASE_URL=... pnpm run push`

### Clerk
1. <https://dashboard.clerk.com> → create app **TheCardLab**
2. Production instance → copy `pk_live_*` + `sk_live_*`
3. Add `thecardlab.app` to allowed origins, plus `com.thecardlab.app` deep link

**Enable sign-in providers** (User & Authentication → Social Connections):
- **Email + password** — built-in, no config
- **Apple** — required by Apple Store rules whenever any social provider is enabled.
  - In Apple Developer portal: register Services ID `com.thecardlab.app.web`, configure Sign In with Apple capability for bundle `com.thecardlab.app`, generate Sign In with Apple private key (`.p8`), copy Key ID + Team ID.
  - Paste into Clerk → Apple connection.
- **Google** — Google Cloud Console → APIs & Services → Credentials → OAuth client (Web). Add `https://clerk.thecardlab.app/v1/oauth_callback` + Clerk-provided callback. Paste Client ID + Secret into Clerk.
- **Microsoft** — Azure Portal → App registrations → New registration. Redirect URI = Clerk callback. Add Application ID + Client Secret to Clerk.
- **Facebook** — developers.facebook.com → Create App → Facebook Login → Web. Valid OAuth Redirect = Clerk callback. App ID + Secret to Clerk.

After enabling, Clerk's `SignIn`/`SignUp` widget renders the provider buttons automatically — no frontend code change needed. Provider buttons inherit the `socialButtonsVariant: "blockButton"` style already configured in `App.tsx`.

**Mobile (Expo) provider notes**:
- iOS uses `expo-apple-authentication` (added to `app.json` plugins) — Sign in with Apple is native.
- Google / Facebook / Microsoft on iOS + Android route through Clerk's OAuth web flow via `expo-auth-session`.
- `@clerk/expo` handles all of the above when providers are enabled in Clerk dashboard.

### Vercel (web)
```bash
brew install vercel-cli || npm i -g vercel
cd artifacts/thecardlab
vercel link
vercel env add VITE_CLERK_PUBLISHABLE_KEY production   # pk_live_...
vercel env add BASE_PATH production                    # /
vercel env add PORT production                         # 5173 (unused at runtime)
```
Add custom domain `thecardlab.app` in Vercel dashboard. Set DNS A/AAAA per their instructions.

### Stripe
- Replace `stripeClient.ts` Replit token path with direct env `STRIPE_SECRET_KEY`. The current artifact assumes Replit's secret-rotation service — for Fly, use a long-lived secret key.
- Configure webhook endpoint: `https://thecardlab-api.fly.dev/api/stripe/webhook` → copy `whsec_*`.

---

## Recurring deploys

### API
- Auto-deploys on push to `main` touching `artifacts/api-server` or `lib/**`
- Manual: GH Actions → "Deploy API to Fly" → Run workflow

### Web
- Vercel auto-deploys on push to `main` (preview for branches, prod for `main`)

### Mobile (iOS + Android)
- GH Actions → "Mobile Build (EAS)" → Run workflow
  - platform: `ios` | `android` | `all`
  - profile: `production`
  - submit: `true` pushes to TestFlight + Play Internal Testing

Local build/submit:
```bash
cd artifacts/thecardlab-mobile
pnpm exec eas build --platform all --profile production
pnpm exec eas submit --platform ios --latest
pnpm exec eas submit --platform android --latest
```

OTA-only update (no native code change):
```bash
cd artifacts/thecardlab-mobile
pnpm exec eas update --branch production --message "..."
```

---

## Scalability levers already wired

| Concern | Lever |
|---|---|
| Stateless API horizontal scale | `fly.toml` `auto_start_machines=true`, `min_machines_running=1`, concurrency `soft_limit=200` |
| DB connection pool | `lib/db/src/index.ts` env-tunable max/min/idle/timeout, SSL on in production |
| Health checks | `/api/healthz` (liveness) + `/api/readyz` (DB ping) |
| Static asset caching | `vercel.json` immutable 1y on `/assets/*` |
| Bundle size | `manualChunks` split — main bundle 132KB gz vs 1.1MB before |

## Next-step scale upgrades (not yet wired)
- **CDN for user uploads**: Cloudflare R2 / S3 + signed URLs (current code has no upload path inspected)
- **Background jobs**: BullMQ + Redis (Upstash) for grading submissions, AI analysis
- **Rate limiting**: `express-rate-limit` + Redis store on `/api/analyze-listing`, `/api/scans`
- **Observability**: Sentry (`@sentry/node` + `@sentry/react`), structured logs → BetterStack/Datadog via pino transport
- **Caching layer**: Redis or Cloudflare KV for portfolio reads, OpenAI response cache (key by image hash)
- **DB read replicas**: Neon branching for prod-clone test envs
- **CI matrix**: add `pnpm test` once tests exist
- **Mobile crash reporting**: `@sentry/react-native` via expo plugin

---

## Smoke test post-deploy

```bash
curl https://thecardlab-api.fly.dev/api/healthz   # {"status":"ok"}
curl https://thecardlab-api.fly.dev/api/readyz    # {"status":"ready"}
curl https://thecardlab.app/                       # SPA shell
curl https://thecardlab.app/api/healthz            # proxied via vercel.json
```

iOS: open TestFlight invite → install → confirm app launches against prod API.

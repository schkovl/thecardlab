# SHIP NOW — TheCardLab

Zero-ambiguity launch runbook. Copy-paste each command in order. Every "STOP" requires your action (account creation, payment, key paste). Resume from where you stopped.

---

## 0. Pre-flight (5 min)

```bash
cd /Users/Schkovl/Downloads/TheCardLab
./scripts/src/pre-launch-check.sh
```

All green? Continue. Any red? Fix that line.

---

## 1. Cloud accounts you must create yourself (45 min total)

Open these tabs, create accounts, paste values into the table below as you go.

| Service | Sign-up URL | What to copy |
|---|---|---|
| Apple Developer | https://developer.apple.com/programs/enroll/ — $99/yr | Apple ID email · Team ID · ASC App ID (after creating app) |
| Google Play | https://play.google.com/console/signup — $25 once | Account verified · Service account JSON (Step 3) |
| Clerk | https://dashboard.clerk.com | Production instance pk_live + sk_live |
| OpenAI | https://platform.openai.com → API keys → Create | sk-... |
| Stripe | https://dashboard.stripe.com → Developers → API keys | sk_live_... · pk_live_... · webhook secret (Step 6) |
| Fly.io | https://fly.io/app/sign-up | flyctl auth login |
| Vercel | https://vercel.com/signup | vercel login |
| Neon Postgres | https://console.neon.tech → Create project `thecardlab` | DATABASE_URL with `-pooler` host |
| Cloudflare R2 (image storage) | https://dash.cloudflare.com → R2 | Endpoint + access key + secret + bucket name |
| Sentry (optional but recommended) | https://sentry.io/signup | DSN for web, api, mobile (3 projects) |
| Expo | https://expo.dev/signup | Run `pnpm exec eas login`, then `expo whoami` |

---

## 2. Install local CLIs (5 min)

```bash
brew install flyctl
npm i -g vercel
corepack enable           # pnpm
```

Auth them:
```bash
flyctl auth login
vercel login
cd /Users/Schkovl/Downloads/TheCardLab/artifacts/thecardlab-mobile
pnpm exec eas login
```

---

## 3. App Store Connect record (15 min)

1. <https://appstoreconnect.apple.com> → My Apps → **+** → New App
2. Fill:
   - Platform: iOS
   - Name: **TheCardLab**
   - Primary language: English (U.S.)
   - Bundle ID: **com.thecardlab.app** (must already be registered in Certs & Identifiers)
   - SKU: `thecardlab-ios`
3. App Information page → copy fields from `artifacts/thecardlab-mobile/store/app-store/en-US.md`
4. App Privacy → fill in per same file's "App Privacy" section
5. Record values into `artifacts/thecardlab-mobile/eas.json` `submit.production.ios`:
   ```json
   "appleId": "your-apple-id@email.com",
   "ascAppId": "1234567890",
   "appleTeamId": "ABCD123XYZ"
   ```

---

## 4. Play Console record + service account (20 min)

1. <https://play.google.com/console> → Create app
   - Name: TheCardLab
   - Language: English (United States)
   - App type: App · Free
2. Fill **Main store listing** with text from `artifacts/thecardlab-mobile/store/play-store/en-US.md`
3. **Data safety**, **Content rating**, **Target audience**, **Ads**, **App access** — answers in same file
4. **Set up access → API access** in Play Console:
   - Link a Google Cloud project
   - Create Service Account → role: Service Account User → grant **Release manager** permission in Play
   - Download JSON key → save as `artifacts/thecardlab-mobile/google-play-service-account.json` (already in .gitignore)
5. Add to GitHub secret `PLAY_SERVICE_ACCOUNT_JSON` (paste JSON contents)

---

## 5. Backend: Fly + Neon (15 min)

```bash
cd /Users/Schkovl/Downloads/TheCardLab/artifacts/api-server

# Neon: create project at console.neon.tech, copy pooled connection string
# Example: postgresql://user:pass@ep-cool-name-pooler.us-east-2.aws.neon.tech/thecardlab?sslmode=require
export NEON_URL='paste-here'

# Push schema
(cd ../../lib/db && DATABASE_URL="$NEON_URL" pnpm run push)

# Fly app + secrets
flyctl apps create thecardlab-api
flyctl secrets set -a thecardlab-api \
  DATABASE_URL="$NEON_URL" \
  CLERK_PUBLISHABLE_KEY=pk_live_PASTE \
  CLERK_SECRET_KEY=sk_live_PASTE \
  AI_INTEGRATIONS_OPENAI_API_KEY=sk-PASTE \
  AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1 \
  STRIPE_SECRET_KEY=sk_live_PASTE \
  STRIPE_PUBLISHABLE_KEY=pk_live_PASTE \
  STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER \
  S3_BUCKET=thecardlab-uploads \
  S3_REGION=auto \
  S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  S3_ACCESS_KEY_ID=PASTE \
  S3_SECRET_ACCESS_KEY=PASTE \
  S3_PUBLIC_BASE_URL=https://cdn.thecardlab.app

# Deploy
flyctl deploy

# Issue API certificate (after DNS in step 8)
flyctl certs add api.thecardlab.app -a thecardlab-api
```

Create GitHub deploy token for CI:
```bash
flyctl tokens create deploy -a thecardlab-api
# Paste into GitHub repo Settings → Secrets → Actions → FLY_API_TOKEN
```

---

## 6. Stripe webhook (5 min)

After API is deployed:
1. Stripe dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://api.thecardlab.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
4. Copy signing secret `whsec_...`
5. Update Fly:
   ```bash
   flyctl secrets set -a thecardlab-api STRIPE_WEBHOOK_SECRET=whsec_PASTE
   ```
6. Create Products + Prices in Stripe for the Pro tier (monthly / yearly)

---

## 7. Frontend: Vercel (10 min)

```bash
cd /Users/Schkovl/Downloads/TheCardLab/artifacts/thecardlab
vercel link --yes                        # creates project "thecardlab"
vercel env add VITE_CLERK_PUBLISHABLE_KEY production    # paste pk_live
vercel env add BASE_PATH production                     # /
vercel env add PORT production                          # 5173 (unused at runtime, vite reads it at build)
vercel env add VITE_SENTRY_DSN production               # optional, paste DSN or skip

PORT=5173 BASE_PATH=/ vercel --prod
```

Vercel dashboard → Project → Settings → Domains → Add:
- `thecardlab.app`
- `www.thecardlab.app`

---

## 8. Namecheap DNS (5 min, then 5-30 min propagation)

<https://ap.www.namecheap.com> → Domain List → **Manage** thecardlab.app → **Advanced DNS** tab.

Delete the default URL Redirect and parking entries. Add:

| Type           | Host | Value                        | TTL  |
|----------------|------|------------------------------|------|
| A Record       | `@`  | `76.76.21.21`                | Auto |
| CNAME Record   | `www`| `cname.vercel-dns.com.`      | Auto |
| CNAME Record   | `api`| `thecardlab-api.fly.dev.`    | Auto |

Optional CDN subdomain for R2 uploads:

| CNAME Record | `cdn` | `<your R2 public bucket hostname>` | Auto |

Save. Wait 5-30 min.

Verify:
```bash
dig +short thecardlab.app           # → 76.76.21.21
dig +short api.thecardlab.app       # → fly IPs
curl https://api.thecardlab.app/api/healthz
curl https://thecardlab.app/
```

Update Clerk dashboard:
- Production app → Domains → Add `thecardlab.app`
- Mobile / Deep Link → `com.thecardlab.app://`

---

## 9. Smoke test (1 min)

```bash
cd /Users/Schkovl/Downloads/TheCardLab
./scripts/src/smoke-test.sh
```

All green? Web + API live.

---

## 10. iOS submission (90 min build + 24-48h review)

```bash
cd /Users/Schkovl/Downloads/TheCardLab/artifacts/thecardlab-mobile
pnpm exec eas project:init                # one-time, links to expo account
pnpm exec eas build --platform ios --profile production
# Wait ~25 min, build artifact appears in expo.dev dashboard

pnpm exec eas submit --platform ios --latest
# Submits to App Store Connect → automatically goes to TestFlight first
```

In App Store Connect:
1. TestFlight tab → wait for "Ready to Test" (~30 min processing)
2. Add internal testers (your email) → install via TestFlight app → verify
3. Distribution → Submit for Review with metadata from `store/app-store/en-US.md`
4. Apple review: 24-48h typical

---

## 11. Android submission (60 min build + 1-3 day review)

```bash
cd /Users/Schkovl/Downloads/TheCardLab/artifacts/thecardlab-mobile
pnpm exec eas build --platform android --profile production
# Wait ~20 min

pnpm exec eas submit --platform android --latest
# Submits AAB to Play Console Internal Testing track
```

In Play Console:
1. Internal testing → add testers list → share opt-in link → install via Play Store → verify
2. Promote to Closed testing → fill out questionnaires (declared in `store/play-store/en-US.md`)
3. Closed testing review: 1-3 days
4. Promote to Production → staged rollout (10% → 50% → 100%)

---

## 12. Post-launch (ongoing)

- **Push updates without resubmission** (JS-only changes):
  ```bash
  cd artifacts/thecardlab-mobile
  pnpm exec eas update --branch production --message "fix: ..."
  ```
- **API redeploy** auto-runs on push to `main` touching `artifacts/api-server/**` (via GH Actions)
- **Web redeploy** auto-runs on push to `main` (via Vercel GitHub integration)
- **Rollback any layer**:
  ```bash
  ./scripts/src/rollback.sh api      # Fly
  ./scripts/src/rollback.sh web      # Vercel
  ./scripts/src/rollback.sh mobile   # EAS OTA
  ```

---

## Definition of done

- [ ] All checkboxes in steps 1-11 complete
- [ ] `./scripts/src/smoke-test.sh` exits 0
- [ ] iOS app live on App Store
- [ ] Android app live on Play Store
- [ ] thecardlab.app loads in browser with valid TLS
- [ ] Sign-up flow works (Clerk)
- [ ] AI Grade Lab returns a prediction (OpenAI)
- [ ] Stripe Pro upgrade completes a checkout

When all checked, you have shipped.

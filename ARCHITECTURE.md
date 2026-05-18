# TheCardLab — Architecture Map

## 1. High-level system

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        Web["🌐 Web<br/>thecardlab.app<br/>React 19 + Vite + wouter"]
        iOS["📱 iOS<br/>com.thecardlab.app<br/>Expo SDK 54 + RN 0.81"]
        Android["🤖 Android<br/>com.thecardlab.app<br/>Expo SDK 54 + RN 0.81"]
        PWA["📥 PWA<br/>(installable)"]
    end

    subgraph Edge["Edge / CDN"]
        Vercel["▲ Vercel<br/>static + edge rewrites<br/>HSTS · CSP · cache 1y"]
        R2["☁️ Cloudflare R2<br/>cdn.thecardlab.app<br/>card images, scans"]
    end

    subgraph API["API tier — Fly.io"]
        Express["🚏 Express 5<br/>api.thecardlab.app<br/>helmet · compression<br/>rate-limit · CORS allowlist"]
        Health["/healthz · /readyz"]
        Routes["/portfolio · /scans<br/>/analyze-listing · /grade-lab<br/>/marketplace · /vault<br/>/wantlist · /grading-submissions<br/>/uploads · /stripe"]
        Cache["LRU cache<br/>(Redis-ready)"]
    end

    subgraph Data["Data & integrations"]
        Neon[("🐘 Postgres<br/>Neon pooled<br/>Drizzle ORM")]
        Clerk["🔑 Clerk<br/>auth + sessions<br/>pk_live / sk_live"]
        OpenAI["🤖 OpenAI<br/>image analysis<br/>grading prediction"]
        Stripe["💳 Stripe<br/>subscriptions<br/>webhook"]
        Sentry["🔭 Sentry<br/>web/api/mobile<br/>errors + traces"]
    end

    subgraph Build["Build / Submit"]
        EAS["🛠 EAS Build<br/>iOS .ipa · Android .aab"]
        AppStore["🍎 App Store"]
        Play["▶ Play Store"]
    end

    Web -->|HTTPS| Vercel
    PWA -->|HTTPS| Vercel
    Vercel -->|/api/* rewrite| Express
    iOS -->|HTTPS| Express
    Android -->|HTTPS| Express

    Web -->|sign-in flow| Clerk
    iOS -->|sign-in flow| Clerk
    Android -->|sign-in flow| Clerk

    Express -->|verify JWT| Clerk
    Express -->|SQL via Drizzle| Neon
    Express -->|chat/vision| OpenAI
    Express -->|charges, sub events| Stripe
    Express -->|presigned PUT| R2
    Express -->|errors| Sentry

    Web -->|crash + perf| Sentry
    iOS -->|crash + perf| Sentry
    Android -->|crash + perf| Sentry

    iOS -->|.ipa| AppStore
    Android -->|.aab| Play
    EAS -->|submit| AppStore
    EAS -->|submit| Play
```

## 2. Monorepo layout

```
TheCardLab/
├── artifacts/
│   ├── thecardlab/              ← web SPA (Vercel)
│   │   ├── src/
│   │   │   ├── App.tsx          ← wouter routes (lazy) + Clerk + Query
│   │   │   ├── main.tsx         ← entry + Sentry + prefetch
│   │   │   ├── pages/           ← 15 routes (Dashboard, Portfolio, ...)
│   │   │   ├── components/      ← Sidebar, TopBar, Shell, ModalRoot
│   │   │   ├── hooks/           ← useSubscription, etc
│   │   │   ├── lib/             ← prefetch, checkout, modal-bus
│   │   │   ├── data/            ← seed mock data (cards, shows, vault)
│   │   │   ├── assets/cards/    ← AVIF + WebP + JPG hero images
│   │   │   ├── clerk-stub.tsx   ← preview-only Clerk shim
│   │   │   └── observability.ts ← Sentry init (lazy)
│   │   ├── public/              ← favicon, manifest, sw.js, sitemap, robots
│   │   ├── vite.config.ts       ← lazy chunks, Tailwind 4, alias, proxy
│   │   └── vercel.json          ← rewrites + security headers
│   │
│   ├── api-server/              ← Node API (Fly)
│   │   ├── src/
│   │   │   ├── index.ts         ← boot + Stripe init + Sentry
│   │   │   ├── app.ts           ← Express + helmet + cors + rate-limit
│   │   │   ├── routes/          ← 9 routers (health, portfolio, scans, ...)
│   │   │   ├── middlewares/     ← clerkProxyMiddleware
│   │   │   ├── stripeClient.ts  ← STRIPE_SECRET_KEY env
│   │   │   ├── webhookHandlers.ts
│   │   │   └── lib/             ← logger (pino), cache (LRU), observability
│   │   ├── build.mjs            ← esbuild bundle → dist/index.mjs
│   │   ├── Dockerfile           ← multi-stage Alpine
│   │   └── fly.toml             ← autoscale + healthcheck
│   │
│   ├── thecardlab-mobile/       ← Expo app (EAS Build → iOS + Android)
│   │   ├── app/                 ← Expo Router file-based routes
│   │   ├── components/, hooks/, constants/, lib/, data/
│   │   ├── assets/              ← icon, splash, fonts
│   │   ├── ios/                 ← Xcode project (expo prebuild)
│   │   ├── android/             ← Gradle project (expo prebuild)
│   │   ├── store/
│   │   │   ├── app-store/en-US.md  ← App Store Connect copy
│   │   │   └── play-store/en-US.md ← Play Console copy
│   │   ├── app.json             ← bundleId, plugins, splash, ITSAppUses…
│   │   └── eas.json             ← dev/preview/production profiles + submit
│   │
│   └── mockup-sandbox/          ← isolated mockup previewer (vite)
│
├── lib/
│   ├── db/                      ← Drizzle schema + pg.Pool (tuned)
│   ├── api-spec/                ← OpenAPI / Zod source
│   ├── api-zod/                 ← shared zod schemas
│   ├── api-client-react/        ← generated react-query hooks
│   ├── integrations-openai-ai-server/   ← OpenAI server SDK wrapper
│   └── integrations-openai-ai-react/    ← OpenAI client hooks
│
├── scripts/
│   └── src/
│       ├── setup-production.sh  ← idempotent bootstrap
│       ├── smoke-test.sh        ← 15-check post-deploy verify
│       ├── rollback.sh          ← api | web | mobile
│       └── pre-launch-check.sh  ← 25-check pre-flight
│
├── .github/workflows/
│   ├── ci.yml                   ← typecheck + build (PR + push)
│   ├── api-deploy.yml           ← Fly deploy on main
│   └── mobile-build.yml         ← EAS Build + Submit (manual dispatch)
│
├── DEPLOY.md                    ← full runbook (Apple, Play, Fly, Vercel, Namecheap)
├── SHIP_NOW.md                  ← zero-ambiguity 12-step launch
└── ARCHITECTURE.md              ← this file
```

## 3. Request flow — typical AI grade request

```mermaid
sequenceDiagram
    actor User
    participant Web as Web / Mobile
    participant Vercel as Vercel (web only)
    participant Clerk
    participant API as Fly API
    participant Cache as LRU cache
    participant R2 as R2 storage
    participant DB as Neon DB
    participant AI as OpenAI

    User->>Web: capture / paste card image
    Web->>API: POST /api/uploads/presign (Clerk JWT)
    API->>Clerk: verify JWT
    API-->>Web: { uploadUrl, key, publicUrl }
    Web->>R2: PUT image (signed URL)
    Web->>API: POST /api/scans { image: publicUrl }
    API->>Cache: get(hash(image))
    alt cache miss
        API->>AI: chat.completions (vision)
        AI-->>API: grading JSON
        API->>Cache: set(hash, result, 24h)
    end
    API->>DB: INSERT scan row
    API-->>Web: { grade, confidence, value, defects }
    Web-->>User: render Grade Lab result
```

## 4. Auth flow

```mermaid
sequenceDiagram
    actor User
    participant Web
    participant Clerk
    participant API
    participant DB

    User->>Web: visit /sign-in
    Web->>Clerk: open Clerk widget (themed)
    User->>Clerk: email or OAuth
    Clerk-->>Web: session JWT + cookie
    Web->>API: GET /api/portfolio (Authorization: Bearer JWT)
    API->>Clerk: verify(JWT)
    Clerk-->>API: { userId, sessionId }
    API->>DB: SELECT * FROM portfolio_holdings WHERE user_id = ?
    DB-->>API: rows
    API-->>Web: data
```

## 5. Subscription / Stripe flow

```mermaid
sequenceDiagram
    actor User
    participant Web
    participant API
    participant Stripe
    participant DB

    User->>Web: click "Upgrade to Pro"
    Web->>API: POST /api/stripe/checkout-session
    API->>Stripe: create CheckoutSession (price_pro, customer)
    Stripe-->>API: session.url
    API-->>Web: redirect URL
    Web->>Stripe: redirect to hosted checkout
    User->>Stripe: complete payment
    Stripe->>API: webhook POST /api/stripe/webhook (signed)
    API->>API: verify signature
    API->>DB: UPDATE users SET plan='pro', stripe_sub_id=…
    Stripe-->>User: success → redirect to /
```

## 6. Deploy topology

```mermaid
flowchart LR
    subgraph Source["Source"]
        GH["GitHub repo"]
    end

    subgraph CI["GitHub Actions"]
        CIJob["ci.yml<br/>typecheck + build"]
        APIJob["api-deploy.yml<br/>flyctl deploy"]
        MobileJob["mobile-build.yml<br/>eas build + submit"]
    end

    subgraph Prod["Production"]
        Web["Vercel<br/>thecardlab.app"]
        APIProd["Fly.io<br/>api.thecardlab.app<br/>shared-cpu-2x · 1GB · 1+ machines"]
        DB["Neon Postgres<br/>(pooled, SSL)"]
        R2P["Cloudflare R2<br/>cdn.thecardlab.app"]
        AppStore["App Store Connect<br/>TestFlight → Production"]
        PlayP["Play Console<br/>Internal → Closed → Production"]
    end

    GH -->|push main| CIJob
    GH -->|push main + api paths| APIJob
    GH -->|workflow_dispatch| MobileJob
    GH -.->|push main| Web

    APIJob --> APIProd
    MobileJob --> AppStore
    MobileJob --> PlayP

    APIProd <-->|SQL/SSL| DB
    APIProd <-->|S3 API| R2P
```

## 7. Security boundaries

```
┌─ Browser/Device ───────────────────────────────────────┐
│  Public: pk_live (Clerk, Stripe pub key, Sentry DSN)   │
│  Storage: JWT in httpOnly cookie (Clerk)               │
│  CSP: strict (Clerk + Stripe + Sentry + R2 only)       │
└────────────────────────┬───────────────────────────────┘
                         │ HTTPS (HSTS 2y, TLS 1.3)
                         ▼
┌─ Edge (Vercel) ────────────────────────────────────────┐
│  Security headers: HSTS, X-Frame DENY, Permissions     │
│  /api/* → rewrite to api.thecardlab.app                │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌─ API (Fly) ────────────────────────────────────────────┐
│  Helmet + Compression                                  │
│  CORS allowlist: thecardlab.app, www.thecardlab.app    │
│  Rate limit (auth-keyed):                              │
│    /api/analyze-listing 20/min · /api/scans 20/min     │
│    /api/uploads 120/min                                │
│  Clerk middleware verifies JWT on every request        │
│  Secrets: Fly secrets store (encrypted at rest)        │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌─ Data plane ───────────────────────────────────────────┐
│  Postgres: TLS required, pooled, SSL verify            │
│  R2: presigned PUT URLs only (5min expiry)             │
│  Stripe: webhook signature verification (whsec_*)      │
│  OpenAI: server-side key, never exposed to client      │
└────────────────────────────────────────────────────────┘
```

## 8. Bundle topology (web, lazy)

```
                         ┌─────────────────────┐
                         │  index.html (3KB)   │
                         └──────────┬──────────┘
                                    │
                                    ▼
            ┌───────────────────────────────────────┐
            │  index-*.js (124KB gz)                │
            │  ↳ React, wouter, Query, Clerk, Shell │
            └──┬─────────────────────────────────┬──┘
               │ (lazy, hover/idle prefetched)   │
               │                                 │
       ┌───────┴────────┐               ┌────────┴────────┐
       │ Dashboard 2KB  │               │ Portfolio 110KB │
       │ DealScreener   │               │   (recharts)    │
       │ GradeLab       │               └─────────────────┘
       │ Marketplace    │
       │ Wantlist       │               ┌─────────────────┐
       │ ... 13 routes  │ ◄───── shares │ Pill chunk 40KB │
       └────────────────┘               │ (radix/clerk)   │
                                        └─────────────────┘
```

## 9. Build → ship pipeline

```
Developer push to main
        │
        ▼
┌─────────────────────┐
│ GitHub Actions: ci  │ ───► typecheck + build (all packages)
└─────────────────────┘
        │
        ├─► api/lib changes ──► Fly deploy (Docker, remote)
        ├─► thecardlab/**  ──► Vercel auto-deploy (preview/prod)
        └─► (manual dispatch) ──► EAS Build → Submit
                                          │
                              ┌───────────┴────────────┐
                              ▼                        ▼
                        TestFlight                Play Internal
                              │                        │
                              ▼                        ▼
                        App Store review         Play closed/open
                              │                        │
                              ▼                        ▼
                       App Store live           Play prod (staged)
```

## 10. Local dev topology

```
$ pnpm run dev                  # (per artifact)

  thecardlab        :5173   vite dev (HMR)
  mockup-sandbox    :5174   vite dev
  api-server        :8080   esbuild watch + node
  thecardlab-mobile :8081   expo start (Metro)
  Postgres          :5432   Postgres.app

  Web → /api/* proxied → :8080
  Mobile → :8080 directly (LAN IP)
  DB → :5432 (no SSL locally)
```

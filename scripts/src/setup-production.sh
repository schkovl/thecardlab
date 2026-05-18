#!/usr/bin/env bash
set -euo pipefail

# TheCardLab production bootstrap.
# Idempotent — re-running picks up where you left off.
#
# Prereqs: brew, node 22+, pnpm 11+. Run from repo root.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

API_APP="${FLY_APP:-thecardlab-api}"
WEB_DOMAIN="thecardlab.app"
WWW_DOMAIN="www.thecardlab.app"
API_DOMAIN="api.thecardlab.app"

step() { printf "\n\033[36m==> %s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$*"; }

need() { command -v "$1" >/dev/null 2>&1 || { warn "$1 not installed"; return 1; }; }

step "Tooling"
need flyctl || { brew install flyctl || curl -L https://fly.io/install.sh | sh; }
need vercel || npm i -g vercel
need pnpm   || corepack enable
ok "tools present"

step "Auth"
flyctl auth whoami >/dev/null 2>&1 || flyctl auth login
vercel whoami      >/dev/null 2>&1 || vercel login
ok "logged in"

step "Install deps"
pnpm install --frozen-lockfile
ok "deps installed"

step "Typecheck + build"
PORT=5173 BASE_PATH=/ pnpm run typecheck
ok "typecheck passed"

step "Fly: app + Postgres"
flyctl apps list | grep -q "^$API_APP" || flyctl apps create "$API_APP"
ok "app: $API_APP"

if ! flyctl postgres list | grep -q "thecardlab-db"; then
  warn "Create managed Postgres now (or set DATABASE_URL secret manually to Neon):"
  warn "  flyctl postgres create --name thecardlab-db --region iad"
  warn "  flyctl postgres attach thecardlab-db -a $API_APP"
fi

step "Fly: required secrets"
required=(
  DATABASE_URL
  CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  AI_INTEGRATIONS_OPENAI_API_KEY
  STRIPE_SECRET_KEY
  STRIPE_PUBLISHABLE_KEY
  STRIPE_WEBHOOK_SECRET
)
missing=()
existing="$(flyctl secrets list -a "$API_APP" 2>/dev/null || true)"
for s in "${required[@]}"; do
  echo "$existing" | grep -q "^$s " || missing+=("$s")
done
if (( ${#missing[@]} > 0 )); then
  warn "Missing Fly secrets — set them now:"
  for s in "${missing[@]}"; do warn "  $s"; done
  warn "Then: flyctl secrets set -a $API_APP KEY=value [KEY2=value2 ...]"
  exit 1
fi
ok "all secrets present"

step "Run DB migration"
DATABASE_URL="$(flyctl ssh console -a $API_APP -C 'printenv DATABASE_URL' 2>/dev/null || echo '')"
if [[ -z "$DATABASE_URL" ]]; then
  warn "DATABASE_URL not retrievable via ssh — push migrations locally with the Neon URL:"
  warn "  cd lib/db && DATABASE_URL=postgresql://... pnpm run push"
else
  (cd lib/db && DATABASE_URL="$DATABASE_URL" pnpm run push)
fi
ok "schema ready"

step "Deploy API to Fly"
flyctl deploy --config artifacts/api-server/fly.toml --dockerfile artifacts/api-server/Dockerfile --remote-only -a "$API_APP"
ok "API deployed"

step "Attach api.thecardlab.app cert"
flyctl certs add "$API_DOMAIN" -a "$API_APP" || true
flyctl certs show "$API_DOMAIN" -a "$API_APP"

step "Deploy web to Vercel"
cd artifacts/thecardlab
[[ -d .vercel ]] || vercel link --yes
vercel env ls production | grep -q VITE_CLERK_PUBLISHABLE_KEY || warn "Set: vercel env add VITE_CLERK_PUBLISHABLE_KEY production"
vercel env ls production | grep -q BASE_PATH                  || vercel env add BASE_PATH production <<< "/"
vercel env ls production | grep -q PORT                       || vercel env add PORT production <<< "5173"
PORT=5173 BASE_PATH=/ vercel --prod
vercel domains add "$WEB_DOMAIN" || true
vercel domains add "$WWW_DOMAIN" || true
ok "web deployed + domains attached"

cat <<EOF

==> Final step: Namecheap DNS
   Login → Domain List → Manage thecardlab.app → Advanced DNS
   Delete default records, then add:

   Type   Host  Value                            TTL
   A      @     76.76.21.21                      Auto
   CNAME  www   cname.vercel-dns.com.            Auto
   CNAME  api   $API_APP.fly.dev.                Auto

   Propagation: 5-30m typical.

==> Smoke test
   curl https://api.thecardlab.app/api/healthz
   curl https://api.thecardlab.app/api/readyz
   open https://thecardlab.app

EOF

#!/usr/bin/env bash
# Stand up the full first-party SSO flow inside the Replit workspace with
# zero external providers: local Postgres + local API in MOCK_OAUTH mode +
# vite proxying /api to it. Proves start -> callback -> session -> /auth/me.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGDATA="$HOME/.pgdata-tcl"
PGSOCK="/tmp"
DB_NAME="tcl_dev"
export DATABASE_URL="postgresql://$(whoami)@localhost/$DB_NAME?host=$PGSOCK"
API_PORT=8080
API_LOG=/tmp/api.log
VITE_LOG=/tmp/dev.log

step() { printf '\n== %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1"; exit 1; }

step "local postgres"
if [ ! -d "$PGDATA" ]; then
  initdb -D "$PGDATA" -A trust >/dev/null || fail "initdb"
fi
pg_ctl -D "$PGDATA" status >/dev/null 2>&1 || \
  pg_ctl -D "$PGDATA" -o "-k $PGSOCK -c listen_addresses=''" -l /tmp/pg.log start >/dev/null || fail "pg start"
psql -h "$PGSOCK" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  createdb -h "$PGSOCK" "$DB_NAME" || fail "createdb"
echo "postgres up: $DB_NAME"

step "schema push (drizzle, local db only)"
(cd "$ROOT/lib/db" && pnpm exec drizzle-kit push --config ./drizzle.config.ts --force >/dev/null 2>&1) || fail "drizzle push"
echo "schema pushed"

step "api-server (MOCK_OAUTH=1, dev mode)"
pkill -f "dist/index.mjs" 2>/dev/null; sleep 1
(cd "$ROOT/artifacts/api-server" && pnpm build >/dev/null 2>&1) || fail "api build"
(cd "$ROOT/artifacts/api-server" && \
  NODE_ENV=development MOCK_OAUTH=1 PORT=$API_PORT \
  PUBLIC_BASE_URL="http://localhost:3000" DATABASE_URL="$DATABASE_URL" \
  nohup node --enable-source-maps ./dist/index.mjs > "$API_LOG" 2>&1 &)
for i in $(seq 1 20); do
  sleep 1
  curl -sf -o /dev/null "http://localhost:$API_PORT/api/healthz" && break
  [ "$i" = 20 ] && { tail -20 "$API_LOG"; fail "api never became healthy"; }
done
echo "api healthy on :$API_PORT"

step "vite -> local api"
pkill -f vite 2>/dev/null; sleep 1
(cd "$ROOT" && VITE_API_PROXY="http://localhost:$API_PORT" \
  nohup pnpm --dir artifacts/thecardlab dev > "$VITE_LOG" 2>&1 &)
for i in $(seq 1 20); do
  sleep 1
  curl -sf -o /dev/null "http://localhost:3000/" && break
  [ "$i" = 20 ] && { tail -20 "$VITE_LOG"; fail "vite never came up"; }
done
echo "vite up on :3000 (proxy -> :$API_PORT)"

step "PROOF: full SSO flow through the vite proxy"
JAR=/tmp/sso-jar.txt; rm -f "$JAR"

P=$(curl -s http://localhost:3000/api/auth/oauth/providers)
echo "$P" | grep -q '"configured":true' || fail "providers not configured: $P"
echo "1. providers configured: $(echo "$P" | grep -o '"id":"[a-z]*"' | tr '\n' ' ')"

LOC=$(curl -s -o /dev/null -w '%{redirect_url}' "http://localhost:3000/api/auth/oauth/google/start")
echo "$LOC" | grep -q "/mock" || fail "start did not redirect to mock: $LOC"
echo "2. /start redirects to mock consent: $LOC"

CODE=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" -X POST \
  "http://localhost:3000/api/auth/oauth/google/mock-complete" \
  --data-urlencode "email=sso-proof@thecardlab.dev" \
  --data-urlencode "firstName=SSO" --data-urlencode "lastName=Proof")
[ "$CODE" = "302" ] || fail "mock-complete returned $CODE"
grep -q tcl_session "$JAR" || fail "no session cookie set"
echo "3. mock callback completed, session cookie set ($CODE)"

ME=$(curl -s -b "$JAR" http://localhost:3000/api/auth/me)
echo "$ME" | grep -q "sso-proof@thecardlab.dev" || fail "/auth/me did not return SSO user: $ME"
echo "4. /auth/me returns the SSO-created user: $ME"

printf '\nSSO_FLOW_PASS\n'

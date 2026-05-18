#!/usr/bin/env bash
set -euo pipefail

# Production smoke test. Runs after each deploy.
# Usage:  ./scripts/src/smoke-test.sh [https://thecardlab.app] [https://api.thecardlab.app]

WEB_URL="${1:-https://thecardlab.app}"
API_URL="${2:-https://api.thecardlab.app}"

PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    printf "  \033[32m✓\033[0m %s\n" "$name"
    PASS=$((PASS + 1))
  else
    printf "  \033[31m✗\033[0m %s\n" "$name"
    FAIL=$((FAIL + 1))
  fi
}

equal() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    printf "  \033[32m✓\033[0m %s (%s)\n" "$name" "$actual"
    PASS=$((PASS + 1))
  else
    printf "  \033[31m✗\033[0m %s: expected '%s', got '%s'\n" "$name" "$expected" "$actual"
    FAIL=$((FAIL + 1))
  fi
}

echo
echo "==> API ($API_URL)"
check "healthz returns 200"      "curl -sS -o /dev/null -w '%{http_code}' $API_URL/api/healthz | grep -q 200"
check "readyz returns 200"        "curl -sS -o /dev/null -w '%{http_code}' $API_URL/api/readyz | grep -q 200"
check "healthz body == status:ok" "curl -sS $API_URL/api/healthz | grep -q '\"status\":\"ok\"'"
check "HSTS header present"       "curl -sSI $API_URL/api/healthz | grep -qi 'strict-transport-security'"
check "compression enabled"       "curl -sSI -H 'Accept-Encoding: gzip' $API_URL/api/healthz | grep -qi 'content-encoding'"
check "rate limit header present" "curl -sSI $API_URL/api/healthz | grep -qi 'ratelimit'"

echo
echo "==> Web ($WEB_URL)"
check "root returns 200"          "curl -sS -o /dev/null -w '%{http_code}' $WEB_URL/ | grep -q 200"
check "sitemap.xml exists"        "curl -sS -o /dev/null -w '%{http_code}' $WEB_URL/sitemap.xml | grep -q 200"
check "robots.txt exists"         "curl -sS -o /dev/null -w '%{http_code}' $WEB_URL/robots.txt | grep -q 200"
check "privacy page reachable"    "curl -sS -o /dev/null -w '%{http_code}' $WEB_URL/privacy | grep -qE '^(200|304)$'"
check "terms page reachable"      "curl -sS -o /dev/null -w '%{http_code}' $WEB_URL/terms | grep -qE '^(200|304)$'"
check "HSTS on web"               "curl -sSI $WEB_URL/ | grep -qi 'strict-transport-security'"
check "CSP on web"                "curl -sSI $WEB_URL/ | grep -qi 'content-security-policy'"
check "X-Frame-Options DENY"      "curl -sSI $WEB_URL/ | grep -qi 'x-frame-options: deny'"
check "API proxy via web"         "curl -sS $WEB_URL/api/healthz | grep -q '\"status\":\"ok\"'"

echo
echo "==> Summary"
printf "  pass: \033[32m%d\033[0m   fail: \033[31m%d\033[0m\n" "$PASS" "$FAIL"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi

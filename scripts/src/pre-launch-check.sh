#!/usr/bin/env bash
set -euo pipefail

# Pre-launch verification. Run before pushing to App Store / Play Store / production.
# Exits non-zero if any check fails.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

PASS=0
FAIL=0

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf "  \033[32m✓\033[0m %s\n" "$name"
    PASS=$((PASS + 1))
  else
    printf "  \033[31m✗\033[0m %s\n" "$name"
    FAIL=$((FAIL + 1))
  fi
}

echo
echo "==> Repo hygiene"
check "no .env committed"   bash -c "! git ls-files | grep -E '^\\.env|/\\.env$'"
check "no service account"  bash -c "! git ls-files | grep -i 'google-play-service-account'"
check "no Apple key"        bash -c "! git ls-files | grep -E 'AuthKey_.*\\.p8'"
check "no keystore"         bash -c "! git ls-files | grep -E '\\.keystore$'"

echo
echo "==> Required files"
check "DEPLOY.md"           test -f DEPLOY.md
check "SHIP_NOW.md"         test -f SHIP_NOW.md
check "Dockerfile"          test -f artifacts/api-server/Dockerfile
check "fly.toml"            test -f artifacts/api-server/fly.toml
check "vercel.json"         test -f artifacts/thecardlab/vercel.json
check "eas.json"            test -f artifacts/thecardlab-mobile/eas.json
check "app.json"            test -f artifacts/thecardlab-mobile/app.json
check "ios prebuild"        test -d artifacts/thecardlab-mobile/ios
check "android prebuild"    test -d artifacts/thecardlab-mobile/android
check "sitemap.xml"         test -f artifacts/thecardlab/public/sitemap.xml
check "robots.txt"          test -f artifacts/thecardlab/public/robots.txt
check "privacy page"        test -f artifacts/thecardlab/src/pages/Privacy.tsx
check "terms page"          test -f artifacts/thecardlab/src/pages/Terms.tsx
check "app store metadata"  test -f artifacts/thecardlab-mobile/store/app-store/en-US.md
check "play store metadata" test -f artifacts/thecardlab-mobile/store/play-store/en-US.md

echo
echo "==> Bundle identifiers match"
GREP_IOS="$(grep -o '\"bundleIdentifier\": \"[^\"]*\"' artifacts/thecardlab-mobile/app.json || true)"
GREP_AND="$(grep -A1 '\"android\"' artifacts/thecardlab-mobile/app.json | grep '\"package\"' || true)"
check "iOS bundleId = com.thecardlab.app"  bash -c "echo '$GREP_IOS' | grep -q 'com.thecardlab.app'"
check "Android pkg = com.thecardlab.app"   bash -c "echo '$GREP_AND' | grep -q 'com.thecardlab.app'"

echo
echo "==> Workspace typecheck"
if PORT=5173 BASE_PATH=/ pnpm run typecheck 2>&1 | tail -1 | grep -q "Done\|typecheck"; then
  printf "  \033[32m✓\033[0m typecheck passed\n"
  PASS=$((PASS + 1))
else
  printf "  \033[31m✗\033[0m typecheck failed\n"
  FAIL=$((FAIL + 1))
fi

echo
echo "==> Production build (web + api, mobile via EAS)"
if PORT=5173 BASE_PATH=/ pnpm -r --filter '!@workspace/thecardlab-mobile' --if-present run build >/tmp/build.log 2>&1; then
  printf "  \033[32m✓\033[0m web + api build\n"
  PASS=$((PASS + 1))
else
  printf "  \033[31m✗\033[0m build failed — see /tmp/build.log\n"
  FAIL=$((FAIL + 1))
fi

echo
echo "==> Bundle size budget (web initial JS gz < 200KB)"
INDEX_GZ_KB="$(find artifacts/thecardlab/dist/public/assets -name 'index-*.js' -exec wc -c {} \; 2>/dev/null | awk '{print $1}' | sort -n | tail -1)"
if [[ -n "$INDEX_GZ_KB" ]]; then
  INDEX_KB=$((INDEX_GZ_KB / 1024))
  if [[ $INDEX_KB -lt 600 ]]; then
    printf "  \033[32m✓\033[0m main bundle uncompressed %sKB (gz ~30%% of that)\n" "$INDEX_KB"
    PASS=$((PASS + 1))
  else
    printf "  \033[33m!\033[0m main bundle %sKB — verify gzip < 200KB\n" "$INDEX_KB"
  fi
fi

echo
echo "==> npm audit (high+)"
if pnpm audit --prod --audit-level=high 2>&1 | grep -qE "No known|0 vulnerabilities"; then
  printf "  \033[32m✓\033[0m no high-severity vulnerabilities\n"
  PASS=$((PASS + 1))
else
  printf "  \033[33m!\033[0m audit warnings — review pnpm audit output\n"
fi

echo
echo "==> Summary"
printf "  pass: \033[32m%d\033[0m   fail: \033[31m%d\033[0m\n" "$PASS" "$FAIL"
[[ $FAIL -eq 0 ]]

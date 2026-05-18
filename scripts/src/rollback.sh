#!/usr/bin/env bash
set -euo pipefail

# Rollback to previous deploy.
# Usage:  ./scripts/src/rollback.sh [api|web|mobile]   (default: api)
#   api    — Fly: revert to previous release
#   web    — Vercel: promote previous production deployment
#   mobile — EAS: revert OTA update channel

TARGET="${1:-api}"
APP="${FLY_APP:-thecardlab-api}"

case "$TARGET" in
  api)
    echo "==> Fly: listing releases for $APP"
    flyctl releases list -a "$APP" | head -10
    echo
    read -r -p "Rollback to which version number? (e.g. 42) " VER
    flyctl releases rollback "$VER" -a "$APP"
    echo "==> Smoke test"
    ./scripts/src/smoke-test.sh
    ;;
  web)
    echo "==> Vercel: listing recent deployments"
    cd artifacts/thecardlab
    vercel ls --prod | head -10
    echo
    read -r -p "Promote which deployment URL? " DEPLOY_URL
    vercel promote "$DEPLOY_URL" --yes
    ;;
  mobile)
    echo "==> EAS Update: rolling back production channel"
    cd artifacts/thecardlab-mobile
    pnpm exec eas channel:view production
    echo
    read -r -p "Roll out which earlier update group ID? " GROUP_ID
    pnpm exec eas update:roll-back-to-embedded --channel production
    echo "Note: EAS Update only rolls back OTA JS. Native binary rollback requires submitting an older build via 'eas submit'."
    ;;
  *)
    echo "Unknown target: $TARGET. Use: api | web | mobile"
    exit 1
    ;;
esac

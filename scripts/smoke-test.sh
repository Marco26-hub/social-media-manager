#!/usr/bin/env bash
# Smoke Test — Social Automation V2
# Verifica che pagine e API rispondano. Lancia: bash scripts/smoke-test.sh

HOST="${1:-http://localhost:3000}"
PASS=0
FAIL=0

green() { printf "  ✅ %s\n" "$1"; ((PASS++)); }
red()   { printf "  ❌ %s\n" "$1"; ((FAIL++)); }
sep()   { printf "  ───────────────────────────\n"; }

echo ""
echo "  🔥 SMOKE TEST — Social Automation V2"
echo "  Target: $HOST"
echo ""

HEALTH=$(curl -s --max-time 10 "$HOST/api/system/health")
MODE=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mode','?'))" 2>/dev/null || echo "?")

# ── PA,GE TESTS ──
echo "  📄 PAGES"
sep

PAGES=(
  "/"
  "/login"
  "/servizi"
  "/dashboard"
  "/dashboard/brand"
  "/dashboard/calendario"
  "/dashboard/clienti"
  "/dashboard/prodotti"
  "/dashboard/piano"
  "/dashboard/ads"
  "/dashboard/seo"
  "/dashboard/log"
  "/dashboard/settings"
  "/dashboard/social/instagram"
  "/dashboard/social/facebook"
  "/dashboard/social/tiktok"
  "/dashboard/social/pinterest"
  "/dashboard/social/linkedin"
  "/dashboard/social/youtube_shorts"
)

for page in "${PAGES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST$page")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "307" ]; then
    green "$page → $STATUS"
  else
    red "$page → $STATUS"
  fi
done

# ── API TESTS ──
echo ""
echo "  ⚡ API"
sep

APIS=(
  "/api/system/health"
  "/api/data/brand"
)

for api in "${APIS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST$api")
  if [ "$STATUS" = "200" ]; then
    green "$api → $STATUS"
  elif [ "$MODE" != "demo" ] && [ "$STATUS" = "401" ]; then
    green "$api → $STATUS (auth required in production ✓)"
  else
    red "$api → $STATUS"
  fi
done

ACCESS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST/api/system/access")
if [ "$MODE" = "demo" ] && [ "$ACCESS_STATUS" = "200" ]; then
  green "/api/system/access → $ACCESS_STATUS (demo credentials hint ✓)"
elif [ "$MODE" != "demo" ] && { [ "$ACCESS_STATUS" = "404" ] || [ "$ACCESS_STATUS" = "200" ]; }; then
  green "/api/system/access → $ACCESS_STATUS"
else
  red "/api/system/access → $ACCESS_STATUS"
fi

# Auth-required API
AUTH_APIS=(
  "/api/data/stats"
  "/api/data/clienti"
  "/api/data/prodotti"
  "/api/data/settings"
  "/api/data/seo-audit"
  "/api/data/log"
)

# These should 401/redirect without auth
for api in "${AUTH_APIS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST$api")
  if [ "$MODE" = "demo" ] && [ "$STATUS" = "200" ]; then
    green "$api → $STATUS (demo fallback ✓)"
  elif [ "$STATUS" = "401" ] || [ "$STATUS" = "302" ]; then
    green "$api → $STATUS (auth required ✓)"
  else
    red "$api → $STATUS (should be demo 200 or auth-required)"
  fi
done

# ── HEALTH CHECK ──
echo ""
echo "  🩺 Health Check Response"
sep
if echo "$HEALTH" | python3 -m json.tool > /dev/null 2>&1; then
  STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','?'))")
  green "Valid JSON — mode=$MODE status=$STATUS"
else
  red "Invalid JSON: $(echo "$HEALTH" | head -c200)"
fi

# ── DEMO MODE CHECK ──
echo ""
echo "  🎭 Demo Mode"
sep
DASH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST/dashboard")
if [ "$DASH" = "200" ] || [ "$DASH" = "302" ] || [ "$DASH" = "307" ]; then
  green "Dashboard accessible: $DASH"
else
  red "Dashboard failed: $DASH"
fi

# ── SUMMARY ──
echo ""
sep
echo "  📊 TOTALE: $PASS PASS / $FAIL FAIL"
sep
echo ""

if [ "$FAIL" -gt 0 ]; then exit 1; else exit 0; fi

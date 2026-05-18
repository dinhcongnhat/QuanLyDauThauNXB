#!/bin/bash
# ============================================================
# Document Library API - Bash Test Script (curl-based)
# ============================================================
# Prerequisites:
#   - Backend server running on http://localhost:4000
#   - Database migrated and seeded
#   - Default admin: admin@qlda.vn / password123
# ============================================================

BASE_URL="${API_BASE_URL:-http://localhost:4000/api}"
PASS=0
FAIL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

log() {
  echo -e "${BLUE}[TEST]${RESET} $1"
}

pass() {
  echo -e "${GREEN}[PASS]${RESET} $1"
  ((PASS++))
}

fail() {
  echo -e "${RED}[FAIL]${RESET} $1"
  ((FAIL++))
}

info() {
  echo -e "${YELLOW}[INFO]${RESET} $1"
}

# ── Login & Get Token ────────────────────────────────────────
log "Step 1: Login as admin..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@qlda.vn","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESP" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{console.log(JSON.parse(d).access_token)}catch(e){console.log('')}")

if [ -z "$TOKEN" ]; then
  fail "Login - No token received"
  echo "Response: $LOGIN_RESP"
  exit 1
else
  pass "Login successful, token received"
fi

AUTH_HDR="Authorization: Bearer $TOKEN"

# Helper function for API calls
api_call() {
  local method=$1
  local path=$2
  local body=$3

  if [ -n "$body" ]; then
    curl -s -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "$AUTH_HDR" \
      -d "$body"
  else
    curl -s -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "$AUTH_HDR"
  fi
}

get_status() {
  local method=$1
  local path=$2
  local body=$3

  if [ -n "$body" ]; then
    curl -s -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "$AUTH_HDR" \
      -d "$body" \
      -o /dev/null -w '%{http_code}'
  else
    curl -s -X "$method" "$BASE_URL$path" \
      -H "Content-Type: application/json" \
      -H "$AUTH_HDR" \
      -o /dev/null -w '%{http_code}'
  fi
}

# ── Organization Tests ───────────────────────────────────────
log "Step 2: Testing Organization endpoints..."

STATUS=$(get_status "GET" "/document-library/organization")
[ "$STATUS" = "200" ] && pass "GET /document-library/organization -> 200" || fail "GET /document-library/organization -> $STATUS"

ORG_COUNT=$(api_call "GET" "/document-library/organization" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{console.log(JSON.parse(d).length)}catch(e){console.log(0)}")
[ "$ORG_COUNT" -ge 2 ] 2>/dev/null && pass "Seeded organizations exist ($ORG_COUNT >= 2)" || fail "Seeded organizations ($ORG_COUNT < 2)"

ORG_ID=$(api_call "GET" "/document-library/organization" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{const arr=JSON.parse(d); const o=arr.find(x=>x.ten&&x.ten.includes('Chủ đầu tư')); console.log(o?o.id:arr[0].id)}catch(e){console.log('')}")
[ -n "$ORG_ID" ] && pass "Organization A (CDT) found: $ORG_ID" || fail "Organization A not found"

STATUS=$(get_status "GET" "/document-library/organization/$ORG_ID")
[ "$STATUS" = "200" ] && pass "GET /document-library/organization/:id -> 200" || fail "GET /document-library/organization/:id -> $STATUS"

# Create organization
STATUS=$(get_status "POST" "/document-library/organization" '{"ten":"Test Org Bash","moTa":"Created by bash script"}')
[ "$STATUS" = "201" ] && pass "POST /document-library/organization creates org -> 201" || fail "POST /document-library/organization -> $STATUS"

TEST_ORG_ID=$(api_call "POST" "/document-library/organization" '{"ten":"Test Org Bash","moTa":"Created by bash script"}' | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{console.log(JSON.parse(d).id)}catch(e){console.log('')}")

# Update organization
STATUS=$(get_status "PUT" "/document-library/organization/$TEST_ORG_ID" '{"ten":"Test Org Updated","moTa":"Updated by bash script"}')
[ "$STATUS" = "200" ] && pass "PUT /document-library/organization/:id -> 200" || fail "PUT /document-library/organization/:id -> $STATUS"

# ── Library Tests ────────────────────────────────────────────
log "Step 3: Testing Library endpoints..."

STATUS=$(get_status "GET" "/document-library/library")
[ "$STATUS" = "200" ] && pass "GET /document-library/library -> 200" || fail "GET /document-library/library -> $STATUS"

LIB_COUNT=$(api_call "GET" "/document-library/library" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{console.log(JSON.parse(d).length)}catch(e){console.log(0)}")
[ "$LIB_COUNT" -ge 4 ] 2>/dev/null && pass "Libraries exist ($LIB_COUNT >= 4)" || fail "Libraries ($LIB_COUNT < 4)"

STATUS=$(get_status "GET" "/document-library/library?organizationId=$ORG_ID")
[ "$STATUS" = "200" ] && pass "GET /document-library/library?organizationId= -> 200" || fail "GET /document-library/library?organizationId= -> $STATUS"

STATUS=$(get_status "POST" "/document-library/library" "{\"ten\":\"Test Library Bash\",\"loai\":\"CUSTOM\",\"organizationId\":\"$ORG_ID\"}")
[ "$STATUS" = "201" ] && pass "POST /document-library/library creates library -> 201" || fail "POST /document-library/library -> $STATUS"

# Get CDT library ID
CDT_LIB_ID=$(api_call "GET" "/document-library/library" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{const arr=JSON.parse(d); const l=arr.find(x=>x.loai==='THONG_TIN_TO_CHUC'); console.log(l?l.id:'')}catch(e){console.log('')}")

STATUS=$(get_status "GET" "/document-library/library/$CDT_LIB_ID")
[ "$STATUS" = "200" ] && pass "GET /document-library/library/:id (CDT) -> 200" || fail "GET /document-library/library/:id (CDT) -> $STATUS"

FIELD_COUNT=$(api_call "GET" "/document-library/library/$CDT_LIB_ID" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{const lib=JSON.parse(d); console.log(lib.fields?lib.fields.length:0)}catch(e){console.log(0)}")
[ "$FIELD_COUNT" -ge 9 ] 2>/dev/null && pass "CDT library has >= 9 seeded fields ($FIELD_COUNT)" || fail "CDT library fields ($FIELD_COUNT < 9)"

# ── Field Tests ─────────────────────────────────────────────
log "Step 4: Testing Field endpoints..."

STATUS=$(get_status "GET" "/document-library/library/$CDT_LIB_ID/fields")
[ "$STATUS" = "200" ] && pass "GET /document-library/library/:id/fields -> 200" || fail "GET /document-library/library/:id/fields -> $STATUS"

RANDOM_KEY="test_field_$(date +%s)"
STATUS=$(get_status "POST" "/document-library/library/$CDT_LIB_ID/field" "{\"tenTruong\":\"Test Field Bash\",\"khoa\":\"$RANDOM_KEY\",\"kieuDuLieu\":\"TEXT\",\"thuTu\":999,\"nhom\":\"Test\"}")
[ "$STATUS" = "201" ] && pass "POST /document-library/library/:id/field -> 201" || fail "POST /document-library/library/:id/field -> $STATUS"

NEW_FIELD_ID=$(api_call "POST" "/document-library/library/$CDT_LIB_ID/field" "{\"tenTruong\":\"Test Field Bash\",\"khoa\":\"$RANDOM_KEY\",\"kieuDuLieu\":\"TEXT\",\"thuTu\":999,\"nhom\":\"Test\"}" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{console.log(JSON.parse(d).id)}catch(e){console.log('')}")

STATUS=$(get_status "PUT" "/document-library/library/$CDT_LIB_ID/field/$NEW_FIELD_ID" '{"tenTruong":"Updated"}')
[ "$STATUS" = "200" ] && pass "PUT /document-library/library/:id/field/:fieldId -> 200" || fail "PUT /document-library/library/:id/field/:fieldId -> $STATUS"

STATUS=$(get_status "DELETE" "/document-library/library/$CDT_LIB_ID/field/$NEW_FIELD_ID")
[ "$STATUS" = "200" ] && pass "DELETE /document-library/library/:id/field/:fieldId -> 200" || fail "DELETE /document-library/library/:id/field/:fieldId -> $STATUS"

# Duplicate key test
FIRST_FIELD=$(api_call "GET" "/document-library/library/$CDT_LIB_ID/fields" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{console.log(JSON.parse(d)[0]?.khoa||'')}catch(e){console.log('')}")
STATUS=$(get_status "POST" "/document-library/library/$CDT_LIB_ID/field" "{\"tenTruong\":\"Dup\",\"khoa\":\"$FIRST_FIELD\",\"kieuDuLieu\":\"TEXT\"}")
[ "$STATUS" = "400" ] && pass "Duplicate khoa returns 400" || fail "Duplicate khoa -> $STATUS (expected 400)"

# ── Saved Value Tests ────────────────────────────────────────
log "Step 5: Testing Saved Value endpoints..."

STATUS=$(get_status "POST" "/document-library/library/$CDT_LIB_ID/value" '{"tenGiaTri":"Test Company Bash","duLieu":{"cdt_ten_cong_ty":"CT Test Bash","cdt_dia_chi":"123 Test St"}}')
[ "$STATUS" = "201" ] && pass "POST /document-library/library/:id/value -> 201" || fail "POST /document-library/library/:id/value -> $STATUS"

STATUS=$(get_status "GET" "/document-library/library/$CDT_LIB_ID/value")
[ "$STATUS" = "200" ] && pass "GET /document-library/library/:id/value -> 200" || fail "GET /document-library/library/:id/value -> $STATUS"

VAL_ID=$(api_call "GET" "/document-library/library/$CDT_LIB_ID/value" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); try{const arr=JSON.parse(d); console.log(arr[0]?.id||'')}catch(e){console.log('')}")

STATUS=$(get_status "PUT" "/document-library/library/$CDT_LIB_ID/value/$VAL_ID" '{"tenGiaTri":"Updated Name"}')
[ "$STATUS" = "200" ] && pass "PUT /document-library/library/:id/value/:valueId -> 200" || fail "PUT /document-library/library/:id/value/:valueId -> $STATUS"

STATUS=$(get_status "DELETE" "/document-library/library/$CDT_LIB_ID/value/$VAL_ID")
[ "$STATUS" = "200" ] && pass "DELETE /document-library/library/:id/value/:valueId -> 200" || fail "DELETE /document-library/library/:id/value/:valueId -> $STATUS"

# ── Permission Tests ─────────────────────────────────────────
log "Step 6: Testing permissions..."

STATUS_NO_AUTH=$(curl -s -X GET "$BASE_URL/document-library/organization" -H "Content-Type: application/json" -o /dev/null -w '%{http_code}')
[ "$STATUS_NO_AUTH" = "401" ] && pass "Unauthenticated request returns 401" || fail "Unauthenticated request -> $STATUS_NO_AUTH (expected 401)"

# ── Cleanup ─────────────────────────────────────────────────
log "Step 7: Cleanup..."

if [ -n "$TEST_ORG_ID" ]; then
  STATUS=$(get_status "DELETE" "/document-library/organization/$TEST_ORG_ID")
  [ "$STATUS" = "200" ] && pass "DELETE /document-library/organization/:id -> 200" || fail "DELETE /document-library/organization/:id -> $STATUS"
fi

# ── Summary ─────────────────────────────────────────────────
echo ""
echo "============================================================"
echo -e "${BLUE}  Test Summary${RESET}"
echo "============================================================"
echo -e "  ${GREEN}Passed: $PASS${RESET}  |  ${RED}Failed: $FAIL${RESET}"
echo "============================================================"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${YELLOW}WARNING: $FAIL test(s) failed.${RESET}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${RESET}"
  exit 0
fi

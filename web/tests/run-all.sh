#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "╔══════════════════════════════════════════════════╗"
echo "║         New API 完整测试套件运行器              ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  前置条件:                                      ║"
echo "║  1. 服务器运行在 localhost:13000                ║"
echo "║  2. 测试用户: qqqqqqq1 / test123456            ║"
echo "║  3. 建议提高速率限制以避免 429:                ║"
echo "║     CRITICAL_RATE_LIMIT=10000                   ║"
echo "║     GLOBAL_WEB_RATE_LIMIT=10000                 ║"
echo "║     GLOBAL_API_RATE_LIMIT=10000                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Check server
echo "检查服务器..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:13000/api/status 2>/dev/null || true)
if [ "$STATUS" != "200" ]; then
  echo "  错误: 服务器未运行或返回 $STATUS"
  echo "  请先启动服务器:"
  echo "    CRITICAL_RATE_LIMIT=10000 GLOBAL_WEB_RATE_LIMIT=10000 GLOBAL_API_RATE_LIMIT=10000 ./new-api --port 13000"
  exit 1
fi
echo "  服务器正常 (200)"
echo ""

TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_TESTS=0
SUITE_RESULTS=""
FAILED_SUITES=""

run_suite() {
  local name="$1"
  local script="$2"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  运行: $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local output
  local exit_code=0
  output=$(node "$script" 2>&1) || exit_code=$?

  echo "$output"
  echo ""

  # Parse results from last line matching "Total: N | Passed: N | Failed: N"
  local total passed failed
  total=$(echo "$output" | grep -oP 'Total: \K\d+' | tail -1)
  passed=$(echo "$output" | grep -oP 'Passed: \K\d+' | tail -1)
  failed=$(echo "$output" | grep -oP 'Failed: \K\d+' | tail -1)

  total=${total:-0}
  passed=${passed:-0}
  failed=${failed:-0}

  TOTAL_TESTS=$((TOTAL_TESTS + total))
  TOTAL_PASS=$((TOTAL_PASS + passed))
  TOTAL_FAIL=$((TOTAL_FAIL + failed))

  if [ "$failed" -gt 0 ]; then
    SUITE_RESULTS="$SUITE_RESULTS\n  FAIL  $name ($passed/$total 通过)"
    FAILED_SUITES="$FAILED_SUITES $name"
  else
    SUITE_RESULTS="$SUITE_RESULTS\n  PASS  $name ($passed/$total 通过)"
  fi
}

# Run all test suites
run_suite "API 接口契约测试"    "tests/api/api-contract-test.mjs"
run_suite "安全测试"            "tests/security/security-test.mjs"
run_suite "E2E 页面与流程测试"  "tests/e2e/page-flow-test.mjs"

# UI interaction workflow tests
run_suite "令牌管理 UI 工作流"  "tests/ui/token-workflow-test.mjs"
run_suite "兑换码管理 UI 工作流" "tests/ui/redemption-workflow-test.mjs"
run_suite "用户管理 UI 工作流"  "tests/ui/user-workflow-test.mjs"
run_suite "个人设置 UI 测试"    "tests/ui/personal-settings-test.mjs"
run_suite "跨页面业务流程"      "tests/ui/cross-page-flow-test.mjs"
run_suite "表单验证与错误处理"  "tests/ui/form-validation-test.mjs"

# Also run existing tests if present
if [ -f "e2e-test.mjs" ]; then
  run_suite "基础 E2E 测试"     "e2e-test.mjs"
fi
if [ -f "dev-feature-test.mjs" ]; then
  run_suite "Dev 功能测试"      "dev-feature-test.mjs"
fi

# Summary
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║               测试结果汇总                      ║"
echo "╠══════════════════════════════════════════════════╣"
echo -e "$SUITE_RESULTS"
echo ""
echo "  总计: $TOTAL_TESTS 个测试 | 通过: $TOTAL_PASS | 失败: $TOTAL_FAIL"

if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo ""
  echo "  失败套件:$FAILED_SUITES"
  echo "╚══════════════════════════════════════════════════╝"
  exit 1
else
  echo ""
  echo "  所有测试通过!"
  echo "╚══════════════════════════════════════════════════╝"
  exit 0
fi

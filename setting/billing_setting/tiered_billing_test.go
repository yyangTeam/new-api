package billing_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetBillingMode_Default(t *testing.T) {
	mode := GetBillingMode("nonexistent-model")
	assert.Equal(t, BillingModeRatio, mode)
}

func TestGetBillingMode_Configured(t *testing.T) {
	billingSetting.BillingMode["test-model"] = BillingModeTieredExpr
	defer delete(billingSetting.BillingMode, "test-model")

	mode := GetBillingMode("test-model")
	assert.Equal(t, BillingModeTieredExpr, mode)
}

func TestGetBillingExpr_NotFound(t *testing.T) {
	_, ok := GetBillingExpr("nonexistent-model")
	assert.False(t, ok)
}

func TestGetBillingExpr_Found(t *testing.T) {
	billingSetting.BillingExpr["test-expr-model"] = "p + c"
	defer delete(billingSetting.BillingExpr, "test-expr-model")

	expr, ok := GetBillingExpr("test-expr-model")
	assert.True(t, ok)
	assert.Equal(t, "p + c", expr)
}

func TestGetBillingModeCopy(t *testing.T) {
	billingSetting.BillingMode["copy-test"] = BillingModeTieredExpr
	defer delete(billingSetting.BillingMode, "copy-test")

	m := GetBillingModeCopy()
	assert.Equal(t, BillingModeTieredExpr, m["copy-test"])

	m["injected"] = "bad"
	_, found := billingSetting.BillingMode["injected"]
	assert.False(t, found)
}

func TestGetBillingExprCopy(t *testing.T) {
	billingSetting.BillingExpr["copy-expr"] = "p * 2"
	defer delete(billingSetting.BillingExpr, "copy-expr")

	m := GetBillingExprCopy()
	assert.Equal(t, "p * 2", m["copy-expr"])

	m["injected"] = "bad"
	_, found := billingSetting.BillingExpr["injected"]
	assert.False(t, found)
}

func TestGetPricingSyncData_Empty(t *testing.T) {
	origMode := billingSetting.BillingMode
	origExpr := billingSetting.BillingExpr
	billingSetting.BillingMode = make(map[string]string)
	billingSetting.BillingExpr = make(map[string]string)
	defer func() {
		billingSetting.BillingMode = origMode
		billingSetting.BillingExpr = origExpr
	}()

	base := map[string]any{"model_ratio": 1.0}
	result := GetPricingSyncData(base)
	assert.Contains(t, result, "model_ratio")
	_, hasBM := result[BillingModeField]
	assert.False(t, hasBM)
	_, hasBE := result[BillingExprField]
	assert.False(t, hasBE)
}

func TestGetPricingSyncData_WithData(t *testing.T) {
	billingSetting.BillingMode["sync-model"] = BillingModeTieredExpr
	billingSetting.BillingExpr["sync-model"] = "p + c"
	defer func() {
		delete(billingSetting.BillingMode, "sync-model")
		delete(billingSetting.BillingExpr, "sync-model")
	}()

	base := map[string]any{"existing_key": true}
	result := GetPricingSyncData(base)
	assert.Contains(t, result, "existing_key")
	assert.Contains(t, result, BillingModeField)
	assert.Contains(t, result, BillingExprField)
}

func TestBillingModeConstants(t *testing.T) {
	assert.Equal(t, "ratio", BillingModeRatio)
	assert.Equal(t, "tiered_expr", BillingModeTieredExpr)
	assert.Equal(t, "billing_mode", BillingModeField)
	assert.Equal(t, "billing_expr", BillingExprField)
}

func TestSmokeTestExpr_ValidSimple(t *testing.T) {
	err := SmokeTestExpr("p + c")
	assert.NoError(t, err)
}

func TestSmokeTestExpr_ValidZero(t *testing.T) {
	err := SmokeTestExpr("0")
	assert.NoError(t, err)
}

func TestSmokeTestExpr_ValidConstant(t *testing.T) {
	err := SmokeTestExpr("100")
	assert.NoError(t, err)
}

func TestSmokeTestExpr_ValidMultiplication(t *testing.T) {
	err := SmokeTestExpr("p * 2 + c * 3")
	assert.NoError(t, err)
}

func TestSmokeTestExpr_InvalidSyntax(t *testing.T) {
	err := SmokeTestExpr("p +++ c ???")
	assert.Error(t, err)
}

func TestSmokeTestExpr_EmptyString(t *testing.T) {
	err := SmokeTestExpr("")
	assert.Error(t, err)
}

func TestSmokeTestExpr_NegativeResult(t *testing.T) {
	err := SmokeTestExpr("-1000")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "< 0")
}

func TestSmokeTestExpr_WithLen(t *testing.T) {
	err := SmokeTestExpr("p + c + len")
	assert.NoError(t, err)
}

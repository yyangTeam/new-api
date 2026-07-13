package oauth

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestNormalizeAuthorizationTokenType(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", "Bearer"},
		{"Bearer", "Bearer"},
		{"bearer", "Bearer"},
		{"BEARER", "Bearer"},
		{"  Bearer  ", "Bearer"},
		{"token", "token"},
		{"Basic", "Basic"},
		{"  mac  ", "mac"},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, normalizeAuthorizationTokenType(tt.input))
		})
	}
}

func TestNormalizePolicyOp(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"EQ", "eq"},
		{"  GT  ", "gt"},
		{"contains", "contains"},
		{"NOT_IN", "not_in"},
		{"", ""},
	}
	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, normalizePolicyOp(tt.input))
		})
	}
}

func TestParseAccessPolicy_ValidSimple(t *testing.T) {
	raw := `{"logic":"and","conditions":[{"field":"active","op":"eq","value":true}]}`
	policy, err := parseAccessPolicy(raw)
	require.NoError(t, err)
	require.NotNil(t, policy)
	assert.Equal(t, "and", policy.Logic)
	assert.Len(t, policy.Conditions, 1)
	assert.Equal(t, "active", policy.Conditions[0].Field)
	assert.Equal(t, "eq", policy.Conditions[0].Op)
	assert.Equal(t, true, policy.Conditions[0].Value)
}

func TestParseAccessPolicy_DefaultLogic(t *testing.T) {
	raw := `{"conditions":[{"field":"level","op":"gte","value":2}]}`
	policy, err := parseAccessPolicy(raw)
	require.NoError(t, err)
	assert.Equal(t, "and", policy.Logic)
}

func TestParseAccessPolicy_OrLogic(t *testing.T) {
	raw := `{"logic":"or","conditions":[{"field":"role","op":"eq","value":"admin"},{"field":"role","op":"eq","value":"mod"}]}`
	policy, err := parseAccessPolicy(raw)
	require.NoError(t, err)
	assert.Equal(t, "or", policy.Logic)
	assert.Len(t, policy.Conditions, 2)
}

func TestParseAccessPolicy_InvalidJSON(t *testing.T) {
	_, err := parseAccessPolicy("not json")
	require.Error(t, err)
}

func TestParseAccessPolicy_UnsupportedLogic(t *testing.T) {
	raw := `{"logic":"xor","conditions":[{"field":"x","op":"eq","value":1}]}`
	_, err := parseAccessPolicy(raw)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported policy logic")
}

func TestParseAccessPolicy_NoConditions(t *testing.T) {
	raw := `{"logic":"and"}`
	_, err := parseAccessPolicy(raw)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "at least one condition or group")
}

func TestParseAccessPolicy_EmptyField(t *testing.T) {
	raw := `{"conditions":[{"field":"","op":"eq","value":1}]}`
	_, err := parseAccessPolicy(raw)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "field is required")
}

func TestParseAccessPolicy_UnsupportedOp(t *testing.T) {
	raw := `{"conditions":[{"field":"x","op":"regex","value":".*"}]}`
	_, err := parseAccessPolicy(raw)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported")
}

func TestParseAccessPolicy_InOpRequiresArray(t *testing.T) {
	raw := `{"conditions":[{"field":"role","op":"in","value":"admin"}]}`
	_, err := parseAccessPolicy(raw)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must be an array")
}

func TestParseAccessPolicy_NotInOpRequiresArray(t *testing.T) {
	raw := `{"conditions":[{"field":"role","op":"not_in","value":"admin"}]}`
	_, err := parseAccessPolicy(raw)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must be an array")
}

func TestParseAccessPolicy_NestedGroups(t *testing.T) {
	raw := `{
		"logic":"and",
		"conditions":[{"field":"active","op":"eq","value":true}],
		"groups":[
			{"logic":"or","conditions":[{"field":"role","op":"eq","value":"admin"},{"field":"role","op":"eq","value":"mod"}]}
		]
	}`
	policy, err := parseAccessPolicy(raw)
	require.NoError(t, err)
	assert.Len(t, policy.Conditions, 1)
	assert.Len(t, policy.Groups, 1)
	assert.Equal(t, "or", policy.Groups[0].Logic)
}

func TestParseAccessPolicy_NestedGroupValidationError(t *testing.T) {
	raw := `{
		"logic":"and",
		"conditions":[{"field":"active","op":"eq","value":true}],
		"groups":[
			{"logic":"and"}
		]
	}`
	_, err := parseAccessPolicy(raw)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid policy group[0]")
}

func TestEvaluateAccessPolicy_NilPolicy(t *testing.T) {
	ok, failure := evaluateAccessPolicy(`{}`, nil)
	assert.True(t, ok)
	assert.Nil(t, failure)
}

func TestEvaluateAccessPolicy_EmptyConditions(t *testing.T) {
	policy := &accessPolicy{Logic: "and"}
	ok, _ := evaluateAccessPolicy(`{}`, policy)
	assert.True(t, ok)
}

func TestEvaluateAccessPolicy_AndAllPass(t *testing.T) {
	policy := &accessPolicy{
		Logic: "and",
		Conditions: []accessCondition{
			{Field: "active", Op: "eq", Value: true},
			{Field: "level", Op: "gte", Value: float64(2)},
		},
	}
	body := `{"active":true,"level":3}`
	ok, failure := evaluateAccessPolicy(body, policy)
	assert.True(t, ok)
	assert.Nil(t, failure)
}

func TestEvaluateAccessPolicy_AndOneFails(t *testing.T) {
	policy := &accessPolicy{
		Logic: "and",
		Conditions: []accessCondition{
			{Field: "active", Op: "eq", Value: true},
			{Field: "level", Op: "gte", Value: float64(5)},
		},
	}
	body := `{"active":true,"level":3}`
	ok, failure := evaluateAccessPolicy(body, policy)
	assert.False(t, ok)
	require.NotNil(t, failure)
	assert.Equal(t, "level", failure.Field)
	assert.Equal(t, "gte", failure.Op)
}

func TestEvaluateAccessPolicy_OrOnePass(t *testing.T) {
	policy := &accessPolicy{
		Logic: "or",
		Conditions: []accessCondition{
			{Field: "role", Op: "eq", Value: "admin"},
			{Field: "role", Op: "eq", Value: "user"},
		},
	}
	body := `{"role":"user"}`
	ok, _ := evaluateAccessPolicy(body, policy)
	assert.True(t, ok)
}

func TestEvaluateAccessPolicy_OrAllFail(t *testing.T) {
	policy := &accessPolicy{
		Logic: "or",
		Conditions: []accessCondition{
			{Field: "role", Op: "eq", Value: "admin"},
			{Field: "role", Op: "eq", Value: "mod"},
		},
	}
	body := `{"role":"user"}`
	ok, failure := evaluateAccessPolicy(body, policy)
	assert.False(t, ok)
	require.NotNil(t, failure)
}

func TestEvaluateAccessCondition_Eq(t *testing.T) {
	ok, _ := evaluateAccessCondition(`{"name":"alice"}`, accessCondition{Field: "name", Op: "eq", Value: "alice"})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(`{"name":"bob"}`, accessCondition{Field: "name", Op: "eq", Value: "alice"})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_Ne(t *testing.T) {
	ok, _ := evaluateAccessCondition(`{"name":"bob"}`, accessCondition{Field: "name", Op: "ne", Value: "alice"})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(`{"name":"alice"}`, accessCondition{Field: "name", Op: "ne", Value: "alice"})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_NumericComparison(t *testing.T) {
	body := `{"score":75}`

	ok, _ := evaluateAccessCondition(body, accessCondition{Field: "score", Op: "gt", Value: float64(50)})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "score", Op: "gt", Value: float64(75)})
	assert.False(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "score", Op: "gte", Value: float64(75)})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "score", Op: "lt", Value: float64(100)})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "score", Op: "lt", Value: float64(75)})
	assert.False(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "score", Op: "lte", Value: float64(75)})
	assert.True(t, ok)
}

func TestEvaluateAccessCondition_In(t *testing.T) {
	body := `{"role":"admin"}`
	ok, _ := evaluateAccessCondition(body, accessCondition{Field: "role", Op: "in", Value: []any{"admin", "mod"}})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "role", Op: "in", Value: []any{"user", "guest"}})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_NotIn(t *testing.T) {
	body := `{"role":"user"}`
	ok, _ := evaluateAccessCondition(body, accessCondition{Field: "role", Op: "not_in", Value: []any{"admin", "mod"}})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "role", Op: "not_in", Value: []any{"user", "guest"}})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_Contains(t *testing.T) {
	ok, _ := evaluateAccessCondition(`{"bio":"hello world"}`, accessCondition{Field: "bio", Op: "contains", Value: "world"})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(`{"bio":"hello world"}`, accessCondition{Field: "bio", Op: "contains", Value: "xyz"})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_ContainsArray(t *testing.T) {
	body := `{"tags":["go","python","rust"]}`
	ok, _ := evaluateAccessCondition(body, accessCondition{Field: "tags", Op: "contains", Value: "go"})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(body, accessCondition{Field: "tags", Op: "contains", Value: "java"})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_NotContains(t *testing.T) {
	ok, _ := evaluateAccessCondition(`{"bio":"hello world"}`, accessCondition{Field: "bio", Op: "not_contains", Value: "xyz"})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(`{"bio":"hello world"}`, accessCondition{Field: "bio", Op: "not_contains", Value: "world"})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_Exists(t *testing.T) {
	ok, _ := evaluateAccessCondition(`{"name":"alice"}`, accessCondition{Field: "name", Op: "exists"})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(`{"name":"alice"}`, accessCondition{Field: "missing", Op: "exists"})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_NotExists(t *testing.T) {
	ok, _ := evaluateAccessCondition(`{"name":"alice"}`, accessCondition{Field: "missing", Op: "not_exists"})
	assert.True(t, ok)

	ok, _ = evaluateAccessCondition(`{"name":"alice"}`, accessCondition{Field: "name", Op: "not_exists"})
	assert.False(t, ok)
}

func TestEvaluateAccessCondition_UnknownOp(t *testing.T) {
	ok, failure := evaluateAccessCondition(`{"x":1}`, accessCondition{Field: "x", Op: "unknown_op", Value: 1})
	assert.False(t, ok)
	require.NotNil(t, failure)
}

func TestEvaluateAccessCondition_NestedField(t *testing.T) {
	body := `{"user":{"profile":{"level":5}}}`
	ok, _ := evaluateAccessCondition(body, accessCondition{Field: "user.profile.level", Op: "gte", Value: float64(3)})
	assert.True(t, ok)
}

func TestEvaluateAccessPolicy_NestedGroupsComplex(t *testing.T) {
	policy := &accessPolicy{
		Logic: "and",
		Conditions: []accessCondition{
			{Field: "active", Op: "eq", Value: true},
		},
		Groups: []accessPolicy{
			{
				Logic: "or",
				Conditions: []accessCondition{
					{Field: "role", Op: "eq", Value: "admin"},
					{Field: "level", Op: "gte", Value: float64(3)},
				},
			},
		},
	}

	ok, _ := evaluateAccessPolicy(`{"active":true,"role":"user","level":5}`, policy)
	assert.True(t, ok)

	ok, _ = evaluateAccessPolicy(`{"active":true,"role":"user","level":1}`, policy)
	assert.False(t, ok)

	ok, _ = evaluateAccessPolicy(`{"active":false,"role":"admin","level":5}`, policy)
	assert.False(t, ok)
}

func TestEvaluateAccessPolicy_OrWithGroups(t *testing.T) {
	policy := &accessPolicy{
		Logic: "or",
		Groups: []accessPolicy{
			{
				Logic: "and",
				Conditions: []accessCondition{
					{Field: "role", Op: "eq", Value: "admin"},
				},
			},
			{
				Logic: "and",
				Conditions: []accessCondition{
					{Field: "vip", Op: "eq", Value: true},
				},
			},
		},
	}

	ok, _ := evaluateAccessPolicy(`{"role":"user","vip":true}`, policy)
	assert.True(t, ok)

	ok, _ = evaluateAccessPolicy(`{"role":"admin","vip":false}`, policy)
	assert.True(t, ok)

	ok, _ = evaluateAccessPolicy(`{"role":"user","vip":false}`, policy)
	assert.False(t, ok)
}

func TestToFloat(t *testing.T) {
	tests := []struct {
		name     string
		input    any
		expected float64
		ok       bool
	}{
		{"float64", float64(3.14), 3.14, true},
		{"float32", float32(2.5), 2.5, true},
		{"int", int(42), 42.0, true},
		{"int8", int8(10), 10.0, true},
		{"int16", int16(200), 200.0, true},
		{"int32", int32(300), 300.0, true},
		{"int64", int64(400), 400.0, true},
		{"uint", uint(50), 50.0, true},
		{"uint8", uint8(60), 60.0, true},
		{"uint16", uint16(70), 70.0, true},
		{"uint32", uint32(80), 80.0, true},
		{"uint64", uint64(90), 90.0, true},
		{"string number", "123.45", 123.45, true},
		{"string with spaces", "  99  ", 99.0, true},
		{"string non-number", "abc", 0, false},
		{"bool", true, 0, false},
		{"nil", nil, 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, ok := toFloat(tt.input)
			assert.Equal(t, tt.ok, ok)
			if ok {
				assert.InDelta(t, tt.expected, val, 0.001)
			}
		})
	}
}

func TestCompareAny(t *testing.T) {
	assert.Equal(t, 0, compareAny(float64(5), float64(5)))
	assert.Equal(t, -1, compareAny(float64(3), float64(5)))
	assert.Equal(t, 1, compareAny(float64(7), float64(5)))

	assert.Equal(t, 0, compareAny("abc", "abc"))
	assert.Equal(t, -1, compareAny("abc", "def"))
	assert.Equal(t, 1, compareAny("def", "abc"))

	assert.Equal(t, 0, compareAny(int(5), float64(5)))
	assert.Equal(t, 0, compareAny("10", float64(10)))
}

func TestValueInSlice(t *testing.T) {
	assert.True(t, valueInSlice("admin", []any{"admin", "mod", "user"}))
	assert.False(t, valueInSlice("guest", []any{"admin", "mod", "user"}))
	assert.True(t, valueInSlice(float64(2), []any{float64(1), float64(2), float64(3)}))
	assert.False(t, valueInSlice("x", "not a slice"))
}

func TestContainsValue(t *testing.T) {
	assert.True(t, containsValue("hello world", "world"))
	assert.False(t, containsValue("hello world", "xyz"))

	assert.True(t, containsValue([]any{"a", "b", "c"}, "b"))
	assert.False(t, containsValue([]any{"a", "b", "c"}, "d"))

	assert.True(t, containsValue([]any{float64(1), float64(2)}, float64(2)))
	assert.False(t, containsValue([]any{float64(1), float64(2)}, float64(3)))

	assert.False(t, containsValue(42, "anything"))
}

func TestGjsonResultToValue(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		path     string
		expected any
	}{
		{"string", `{"name":"alice"}`, "name", "alice"},
		{"number", `{"age":25}`, "age", float64(25)},
		{"bool true", `{"active":true}`, "active", true},
		{"bool false", `{"active":false}`, "active", false},
		{"null", `{"val":null}`, "val", nil},
		{"missing", `{"val":1}`, "missing", nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := gjson.Get(tt.body, tt.path)
			assert.Equal(t, tt.expected, gjsonResultToValue(result))
		})
	}
}

func TestGjsonResultToValue_Array(t *testing.T) {
	body := `{"items":[1,2,3]}`
	result := gjson.Get(body, "items")
	val := gjsonResultToValue(result)
	arr, ok := val.([]any)
	require.True(t, ok)
	assert.Len(t, arr, 3)
	assert.Equal(t, float64(1), arr[0])
}

func TestRenderAccessDeniedMessage_Default(t *testing.T) {
	msg := renderAccessDeniedMessage("", "TestProvider", `{}`, nil)
	assert.Equal(t, "Access denied: your account does not meet this provider's access requirements.", msg)
}

func TestRenderAccessDeniedMessage_CustomTemplate(t *testing.T) {
	failure := &accessPolicyFailure{
		Field:    "trust_level",
		Op:       "gte",
		Expected: float64(3),
		Current:  float64(1),
	}
	msg := renderAccessDeniedMessage(
		"Provider {{provider}} requires {{field}} {{op}} {{required}}, you have {{current}}",
		"MySSO",
		`{"trust_level":1}`,
		failure,
	)
	assert.Equal(t, "Provider MySSO requires trust_level gte 3, you have 1", msg)
}

func TestRenderAccessDeniedMessage_CurrentDotTemplate(t *testing.T) {
	failure := &accessPolicyFailure{
		Field:    "level",
		Op:       "gte",
		Expected: 3,
		Current:  1,
	}
	body := `{"username":"alice","level":1}`
	msg := renderAccessDeniedMessage(
		"Hello {{current.username}}, your level is {{current.level}}",
		"Test",
		body,
		failure,
	)
	assert.Equal(t, "Hello alice, your level is 1", msg)
}

func TestRenderAccessDeniedMessage_RequiredDotTemplate(t *testing.T) {
	failure := &accessPolicyFailure{
		Field:    "level",
		Op:       "gte",
		Expected: float64(5),
		Current:  float64(2),
	}
	msg := renderAccessDeniedMessage(
		"Required level: {{required.level}}",
		"Test",
		`{"level":2}`,
		failure,
	)
	assert.Equal(t, "Required level: 5", msg)
}

func TestRenderAccessDeniedMessage_RequiredDotMismatch(t *testing.T) {
	failure := &accessPolicyFailure{
		Field:    "level",
		Op:       "gte",
		Expected: float64(5),
		Current:  float64(2),
	}
	msg := renderAccessDeniedMessage(
		"Required role: {{required.role}}",
		"Test",
		`{"level":2}`,
		failure,
	)
	assert.Equal(t, "Required role:", msg)
}

func TestRenderAccessDeniedMessage_NilFailure(t *testing.T) {
	msg := renderAccessDeniedMessage("Provider {{provider}}: denied", "MySvc", `{}`, nil)
	assert.Equal(t, "Provider MySvc: denied", msg)
}

func TestNewGenericOAuthProvider(t *testing.T) {
	config := &model.CustomOAuthProvider{
		Name:    "TestProvider",
		Slug:    "test",
		Enabled: true,
	}
	p := NewGenericOAuthProvider(config)
	assert.Equal(t, "TestProvider", p.GetName())
	assert.Equal(t, "test_", p.GetProviderPrefix())
	assert.True(t, p.IsGenericProvider())
	assert.True(t, p.IsEnabled())
	assert.Same(t, config, p.GetConfig())
}

func TestNewGenericOAuthProvider_Disabled(t *testing.T) {
	config := &model.CustomOAuthProvider{
		Name:    "Disabled",
		Slug:    "disabled",
		Enabled: false,
	}
	p := NewGenericOAuthProvider(config)
	assert.False(t, p.IsEnabled())
}

func TestGenericOAuthProvider_GetProviderId(t *testing.T) {
	config := &model.CustomOAuthProvider{
		Id:   42,
		Slug: "test",
	}
	p := NewGenericOAuthProvider(config)
	assert.Equal(t, 42, p.GetProviderId())
}

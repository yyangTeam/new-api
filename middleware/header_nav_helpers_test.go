package middleware

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseHeaderNavBool(t *testing.T) {
	tests := []struct {
		name     string
		value    any
		fallback bool
		expected bool
	}{
		// bool values
		{name: "bool true", value: true, fallback: false, expected: true},
		{name: "bool false", value: false, fallback: true, expected: false},

		// string values
		{name: "string true", value: "true", fallback: false, expected: true},
		{name: "string TRUE uppercase", value: "TRUE", fallback: false, expected: true},
		{name: "string 1", value: "1", fallback: false, expected: true},
		{name: "string false", value: "false", fallback: true, expected: false},
		{name: "string FALSE uppercase", value: "FALSE", fallback: true, expected: false},
		{name: "string 0", value: "0", fallback: true, expected: false},
		{name: "string with whitespace", value: "  true  ", fallback: false, expected: true},
		{name: "string unknown falls back to true", value: "maybe", fallback: true, expected: true},
		{name: "string unknown falls back to false", value: "maybe", fallback: false, expected: false},
		{name: "empty string falls back", value: "", fallback: true, expected: true},

		// float64 values (from JSON unmarshaling)
		{name: "float64 1", value: float64(1), fallback: false, expected: true},
		{name: "float64 0", value: float64(0), fallback: true, expected: false},
		{name: "float64 other value falls back true", value: float64(0.5), fallback: true, expected: true},
		{name: "float64 other value falls back false", value: float64(2), fallback: false, expected: false},

		// int values
		{name: "int 1", value: int(1), fallback: false, expected: true},
		{name: "int 0", value: int(0), fallback: true, expected: false},
		{name: "int other value falls back", value: int(42), fallback: true, expected: true},

		// nil and unsupported types fall back
		{name: "nil falls back to true", value: nil, fallback: true, expected: true},
		{name: "nil falls back to false", value: nil, fallback: false, expected: false},
		{name: "slice falls back", value: []string{"yes"}, fallback: true, expected: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseHeaderNavBool(tt.value, tt.fallback)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParseHeaderNavAccess(t *testing.T) {
	fallback := headerNavAccess{Enabled: true, RequireAuth: false}

	tests := []struct {
		name     string
		raw      any
		expected headerNavAccess
	}{
		{
			name:     "nil returns fallback",
			raw:      nil,
			expected: fallback,
		},
		{
			name:     "bool true sets enabled",
			raw:      true,
			expected: headerNavAccess{Enabled: true, RequireAuth: false},
		},
		{
			name:     "bool false sets disabled",
			raw:      false,
			expected: headerNavAccess{Enabled: false, RequireAuth: false},
		},
		{
			name:     "string true sets enabled",
			raw:      "true",
			expected: headerNavAccess{Enabled: true, RequireAuth: false},
		},
		{
			name:     "string false sets disabled",
			raw:      "false",
			expected: headerNavAccess{Enabled: false, RequireAuth: false},
		},
		{
			name:     "float64 0 sets disabled",
			raw:      float64(0),
			expected: headerNavAccess{Enabled: false, RequireAuth: false},
		},
		{
			name: "map with enabled and requireAuth",
			raw: map[string]any{
				"enabled":     true,
				"requireAuth": true,
			},
			expected: headerNavAccess{Enabled: true, RequireAuth: true},
		},
		{
			name: "map with only requireAuth preserves enabled default",
			raw: map[string]any{
				"requireAuth": true,
			},
			expected: headerNavAccess{Enabled: true, RequireAuth: true},
		},
		{
			name: "map with only enabled preserves requireAuth default",
			raw: map[string]any{
				"enabled": false,
			},
			expected: headerNavAccess{Enabled: false, RequireAuth: false},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseHeaderNavAccess(tt.raw, fallback)
			assert.Equal(t, tt.expected, result)
		})
	}
}

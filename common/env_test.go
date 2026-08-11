package common

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetEnvOrDefault returns the env value as int when set, default otherwise.
func TestGetEnvOrDefault(t *testing.T) {
	tests := []struct {
		name       string
		envKey     string
		envVal     string
		defaultVal int
		want       int
	}{
		{
			name:       "env not set returns default",
			envKey:     "TEST_ENV_GOTEST_MISSING",
			envVal:     "",
			defaultVal: 42,
			want:       42,
		},
		{
			name:       "env set returns parsed int",
			envKey:     "TEST_ENV_GOTEST_INT",
			envVal:     "99",
			defaultVal: 42,
			want:       99,
		},
		{
			name:       "env set to non-int returns default",
			envKey:     "TEST_ENV_GOTEST_BAD",
			envVal:     "not_a_number",
			defaultVal: 7,
			want:       7,
		},
		{
			name:       "empty env key returns default",
			envKey:     "",
			envVal:     "",
			defaultVal: 5,
			want:       5,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envKey != "" && tt.envVal != "" {
				require.NoError(t, os.Setenv(tt.envKey, tt.envVal))
				defer os.Unsetenv(tt.envKey)
			}
			got := GetEnvOrDefault(tt.envKey, tt.defaultVal)
			assert.Equal(t, tt.want, got)
		})
	}
}

// TestGetEnvOrDefaultString returns the env value as string when set, default otherwise.
func TestGetEnvOrDefaultString(t *testing.T) {
	tests := []struct {
		name       string
		envKey     string
		envVal     string
		defaultVal string
		want       string
	}{
		{
			name:       "env not set returns default",
			envKey:     "TEST_ENV_GOTEST_STR_MISS",
			envVal:     "",
			defaultVal: "fallback",
			want:       "fallback",
		},
		{
			name:       "env set returns value",
			envKey:     "TEST_ENV_GOTEST_STR_HIT",
			envVal:     "custom",
			defaultVal: "fallback",
			want:       "custom",
		},
		{
			name:       "empty key returns default",
			envKey:     "",
			envVal:     "",
			defaultVal: "def",
			want:       "def",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envKey != "" && tt.envVal != "" {
				require.NoError(t, os.Setenv(tt.envKey, tt.envVal))
				defer os.Unsetenv(tt.envKey)
			}
			got := GetEnvOrDefaultString(tt.envKey, tt.defaultVal)
			assert.Equal(t, tt.want, got)
		})
	}
}

// TestGetEnvOrDefaultBool returns the env value as bool when set, default otherwise.
func TestGetEnvOrDefaultBool(t *testing.T) {
	tests := []struct {
		name       string
		envKey     string
		envVal     string
		defaultVal bool
		want       bool
	}{
		{
			name:       "env not set returns default true",
			envKey:     "TEST_ENV_GOTEST_BOOL_MISS",
			envVal:     "",
			defaultVal: true,
			want:       true,
		},
		{
			name:       "env set to true",
			envKey:     "TEST_ENV_GOTEST_BOOL_T",
			envVal:     "true",
			defaultVal: false,
			want:       true,
		},
		{
			name:       "env set to false",
			envKey:     "TEST_ENV_GOTEST_BOOL_F",
			envVal:     "false",
			defaultVal: true,
			want:       false,
		},
		{
			name:       "env set to 1",
			envKey:     "TEST_ENV_GOTEST_BOOL_1",
			envVal:     "1",
			defaultVal: false,
			want:       true,
		},
		{
			name:       "env set to invalid returns default",
			envKey:     "TEST_ENV_GOTEST_BOOL_BAD",
			envVal:     "maybe",
			defaultVal: true,
			want:       true,
		},
		{
			name:       "empty key returns default",
			envKey:     "",
			envVal:     "",
			defaultVal: false,
			want:       false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envKey != "" && tt.envVal != "" {
				require.NoError(t, os.Setenv(tt.envKey, tt.envVal))
				defer os.Unsetenv(tt.envKey)
			}
			got := GetEnvOrDefaultBool(tt.envKey, tt.defaultVal)
			assert.Equal(t, tt.want, got)
		})
	}
}

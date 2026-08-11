package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetIpLimits_NilAllowIps(t *testing.T) {
	token := &Token{AllowIps: nil}
	assert.Empty(t, token.GetIpLimits())
}

func TestGetIpLimits_EmptyString(t *testing.T) {
	empty := ""
	token := &Token{AllowIps: &empty}
	assert.Empty(t, token.GetIpLimits())
}

func TestGetIpLimits_SingleIP(t *testing.T) {
	ips := "192.168.1.1"
	token := &Token{AllowIps: &ips}
	assert.Equal(t, []string{"192.168.1.1"}, token.GetIpLimits())
}

func TestGetIpLimits_MultipleIPs(t *testing.T) {
	ips := "192.168.1.1\n10.0.0.1\n172.16.0.1"
	token := &Token{AllowIps: &ips}
	result := token.GetIpLimits()
	assert.Equal(t, []string{"192.168.1.1", "10.0.0.1", "172.16.0.1"}, result)
}

func TestGetIpLimits_TrimsSpacesAndCommas(t *testing.T) {
	ips := " 192.168.1.1 , \n 10.0.0.1,\n"
	token := &Token{AllowIps: &ips}
	result := token.GetIpLimits()
	assert.Equal(t, []string{"192.168.1.1", "10.0.0.1"}, result)
}

func TestGetIpLimits_IgnoresEmptyLines(t *testing.T) {
	ips := "192.168.1.1\n\n\n10.0.0.1"
	token := &Token{AllowIps: &ips}
	result := token.GetIpLimits()
	assert.Equal(t, []string{"192.168.1.1", "10.0.0.1"}, result)
}

func TestGetModelLimits_Empty(t *testing.T) {
	token := &Token{ModelLimits: ""}
	assert.Empty(t, token.GetModelLimits())
}

func TestGetModelLimits_SingleModel(t *testing.T) {
	token := &Token{ModelLimits: "gpt-4"}
	assert.Equal(t, []string{"gpt-4"}, token.GetModelLimits())
}

func TestGetModelLimits_MultipleModels(t *testing.T) {
	token := &Token{ModelLimits: "gpt-4,claude-3,gemini-pro"}
	assert.Equal(t, []string{"gpt-4", "claude-3", "gemini-pro"}, token.GetModelLimits())
}

func TestGetModelLimitsMap(t *testing.T) {
	token := &Token{ModelLimits: "gpt-4,claude-3"}
	limitsMap := token.GetModelLimitsMap()
	assert.True(t, limitsMap["gpt-4"])
	assert.True(t, limitsMap["claude-3"])
	assert.False(t, limitsMap["gpt-3.5-turbo"])
}

func TestIsModelLimitsEnabled(t *testing.T) {
	assert.True(t, (&Token{ModelLimitsEnabled: true}).IsModelLimitsEnabled())
	assert.False(t, (&Token{ModelLimitsEnabled: false}).IsModelLimitsEnabled())
}

func TestSanitizeLikePattern(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{"plain_text", "hello", "hello", false},
		{"escapes_exclamation", "a!b", "a!!b", false},
		{"escapes_underscore", "a_b", "a!_b", false},
		{"preserves_single_percent", "%hello%", "%hello%", false},
		{"escapes_both", "a!_b", "a!!!_b", false},
		{"rejects_consecutive_percent", "%%hello", "", true},
		{"rejects_too_many_percent", "%a%b%c", "", true},
		{"rejects_short_keyword_with_percent", "%a%", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := sanitizeLikePattern(tt.input)
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.want, got)
			}
		})
	}
}

func TestValidateLikePattern(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"valid_no_percent", "hello", false},
		{"valid_two_percent", "%hello%", false},
		{"valid_prefix", "%hello", false},
		{"valid_suffix", "hello%", false},
		{"invalid_consecutive", "%%test", true},
		{"invalid_three_percent", "%a%b%", true},
		{"invalid_short_keyword", "%a", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateLikePattern(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestTokenClean(t *testing.T) {
	token := &Token{Key: "sk-secret-key-12345678"}
	token.Clean()
	assert.Equal(t, "", token.Key)
}

func TestTokenGetMaskedKey(t *testing.T) {
	token := &Token{Key: "sk-abcdefgh12345678"}
	masked := token.GetMaskedKey()
	assert.Equal(t, MaskTokenKey("sk-abcdefgh12345678"), masked)
	// Verify that original key characters are partially hidden
	assert.NotEqual(t, token.Key, masked)
	assert.Contains(t, masked, "****")
}

func TestTokenGetFullKey(t *testing.T) {
	token := &Token{Key: "sk-full-key-12345"}
	assert.Equal(t, "sk-full-key-12345", token.GetFullKey())
}

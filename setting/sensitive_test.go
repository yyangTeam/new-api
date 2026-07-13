package setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestShouldCheckPromptSensitive(t *testing.T) {
	tests := []struct {
		name        string
		enabled     bool
		promptCheck bool
		expected    bool
	}{
		{"both enabled", true, true, true},
		{"sensitive disabled", false, true, false},
		{"prompt check disabled", true, false, false},
		{"both disabled", false, false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			origEnabled := CheckSensitiveEnabled
			origPrompt := CheckSensitiveOnPromptEnabled
			defer func() {
				CheckSensitiveEnabled = origEnabled
				CheckSensitiveOnPromptEnabled = origPrompt
			}()

			CheckSensitiveEnabled = tt.enabled
			CheckSensitiveOnPromptEnabled = tt.promptCheck
			assert.Equal(t, tt.expected, ShouldCheckPromptSensitive())
		})
	}
}

func TestSensitiveWordsToString(t *testing.T) {
	SensitiveWords = []string{"word1", "word2", "word3"}
	result := SensitiveWordsToString()
	assert.Equal(t, "word1\nword2\nword3", result)
}

func TestSensitiveWordsToString_Empty(t *testing.T) {
	SensitiveWords = []string{}
	result := SensitiveWordsToString()
	assert.Equal(t, "", result)
}

func TestSensitiveWordsFromString(t *testing.T) {
	SensitiveWordsFromString("alpha\nbeta\ngamma")
	assert.Equal(t, []string{"alpha", "beta", "gamma"}, SensitiveWords)
}

func TestSensitiveWordsFromString_WithBlanks(t *testing.T) {
	SensitiveWordsFromString("alpha\n\n  \nbeta\n  gamma  \n")
	assert.Equal(t, []string{"alpha", "beta", "gamma"}, SensitiveWords)
}

func TestSensitiveWordsFromString_Empty(t *testing.T) {
	SensitiveWordsFromString("")
	assert.Empty(t, SensitiveWords)
}

func TestSensitiveWordsFromString_AllBlanks(t *testing.T) {
	SensitiveWordsFromString("  \n  \n  ")
	assert.Empty(t, SensitiveWords)
}

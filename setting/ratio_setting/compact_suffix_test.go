package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCompactModelSuffix(t *testing.T) {
	assert.Equal(t, "-openai-compact", CompactModelSuffix)
	assert.Equal(t, "*-openai-compact", CompactWildcardModelKey)
}

func TestWithCompactModelSuffix_AddsSuffix(t *testing.T) {
	result := WithCompactModelSuffix("gpt-4o")
	assert.Equal(t, "gpt-4o-openai-compact", result)
}

func TestWithCompactModelSuffix_AlreadyHasSuffix(t *testing.T) {
	result := WithCompactModelSuffix("gpt-4o-openai-compact")
	assert.Equal(t, "gpt-4o-openai-compact", result)
}

func TestWithCompactModelSuffix_EmptyString(t *testing.T) {
	result := WithCompactModelSuffix("")
	assert.Equal(t, "-openai-compact", result)
}

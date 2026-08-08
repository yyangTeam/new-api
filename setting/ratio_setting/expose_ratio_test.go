package ratio_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExposeRatio_DefaultDisabled(t *testing.T) {
	SetExposeRatioEnabled(false)
	assert.False(t, IsExposeRatioEnabled())
}

func TestExposeRatio_Enable(t *testing.T) {
	SetExposeRatioEnabled(true)
	assert.True(t, IsExposeRatioEnabled())
	SetExposeRatioEnabled(false)
}

func TestExposeRatio_Toggle(t *testing.T) {
	SetExposeRatioEnabled(false)
	assert.False(t, IsExposeRatioEnabled())
	SetExposeRatioEnabled(true)
	assert.True(t, IsExposeRatioEnabled())
	SetExposeRatioEnabled(false)
	assert.False(t, IsExposeRatioEnabled())
}

package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAddAbilities_CreatesCorrectEntries(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	priority := int64(10)
	weight := uint(5)
	tag := "test-tag"
	ch := &Channel{
		Id:       0,
		Name:     "ability-test",
		Key:      "sk-ability-test",
		Type:     1,
		Status:   common.ChannelStatusEnabled,
		Models:   "gpt-4,claude-3",
		Group:    "default,premium",
		Priority: &priority,
		Weight:   &weight,
		Tag:      &tag,
	}
	require.NoError(t, db.Create(ch).Error)
	require.NotZero(t, ch.Id)

	err := ch.AddAbilities(nil)
	require.NoError(t, err)

	// Should create 2 models * 2 groups = 4 abilities
	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 4)

	// Verify properties
	for _, ab := range abilities {
		assert.True(t, ab.Enabled)
		assert.Equal(t, &priority, ab.Priority)
		assert.Equal(t, uint(5), ab.Weight)
		assert.Equal(t, &tag, ab.Tag)
		assert.Equal(t, ch.Id, ab.ChannelId)
	}

	// Verify that all group+model combinations exist
	combos := make(map[string]bool)
	for _, ab := range abilities {
		combos[ab.Group+"|"+ab.Model] = true
	}
	assert.True(t, combos["default|gpt-4"])
	assert.True(t, combos["default|claude-3"])
	assert.True(t, combos["premium|gpt-4"])
	assert.True(t, combos["premium|claude-3"])
}

func TestAddAbilities_DeduplicatesGroupModel(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "dedup-test",
		Key:    "sk-dedup-test",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,gpt-4", // duplicate model
		Group:  "default,default",
	}
	require.NoError(t, db.Create(ch).Error)

	err := ch.AddAbilities(nil)
	require.NoError(t, err)

	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 1, "duplicate group|model combinations should be deduplicated")
}

func TestAddAbilities_DisabledChannel(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "disabled-test",
		Key:    "sk-disabled-test",
		Type:   1,
		Status: common.ChannelStatusManuallyDisabled,
		Models: "gpt-4",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)

	err := ch.AddAbilities(nil)
	require.NoError(t, err)

	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	require.Len(t, abilities, 1)
	assert.False(t, abilities[0].Enabled, "abilities of disabled channel should be disabled")
}

func TestDeleteAbilities(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "del-ability-test",
		Key:    "sk-del-ability",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,gpt-3.5-turbo",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	var count int64
	db.Model(&Ability{}).Where("channel_id = ?", ch.Id).Count(&count)
	assert.Equal(t, int64(2), count)

	err := ch.DeleteAbilities()
	require.NoError(t, err)

	db.Model(&Ability{}).Where("channel_id = ?", ch.Id).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestUpdateAbilities_ReplacesEntries(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "update-ability",
		Key:    "sk-update-ability",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	// Verify initial state
	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 1)
	assert.Equal(t, "gpt-4", abilities[0].Model)

	// Update models
	ch.Models = "claude-3,gemini-pro"
	err := ch.UpdateAbilities(nil)
	require.NoError(t, err)

	// Verify new state
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	assert.Len(t, abilities, 2)
	models := make(map[string]bool)
	for _, ab := range abilities {
		models[ab.Model] = true
	}
	assert.True(t, models["claude-3"])
	assert.True(t, models["gemini-pro"])
	assert.False(t, models["gpt-4"], "old model should be removed")
}

func TestUpdateAbilityStatus(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "status-ability",
		Key:    "sk-status-ability",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,claude-3",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	// Disable
	err := UpdateAbilityStatus(ch.Id, false)
	require.NoError(t, err)

	var abilities []Ability
	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	for _, ab := range abilities {
		assert.False(t, ab.Enabled)
	}

	// Re-enable
	err = UpdateAbilityStatus(ch.Id, true)
	require.NoError(t, err)

	require.NoError(t, db.Where("channel_id = ?", ch.Id).Find(&abilities).Error)
	for _, ab := range abilities {
		assert.True(t, ab.Enabled)
	}
}

func TestGetGroupEnabledModels(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	// Create a channel with multiple models and groups
	ch := &Channel{
		Name:   "enabled-models",
		Key:    "sk-enabled-models",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "gpt-4,claude-3,gemini-pro",
		Group:  "default,premium",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	models := GetGroupEnabledModels("default")
	assert.Len(t, models, 3)
	assert.Contains(t, models, "gpt-4")
	assert.Contains(t, models, "claude-3")
	assert.Contains(t, models, "gemini-pro")

	// Non-existent group returns empty
	models = GetGroupEnabledModels("nonexistent")
	assert.Empty(t, models)
}

func TestGetEnabledModels(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	ch := &Channel{
		Name:   "all-enabled",
		Key:    "sk-all-enabled",
		Type:   1,
		Status: common.ChannelStatusEnabled,
		Models: "model-a,model-b",
		Group:  "default",
	}
	require.NoError(t, db.Create(ch).Error)
	require.NoError(t, ch.AddAbilities(nil))

	models := GetEnabledModels()
	assert.Contains(t, models, "model-a")
	assert.Contains(t, models, "model-b")
}

func TestGetChannel_WeightedSelection(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	priority := int64(100)
	// Create two channels with same model/group but different weights
	ch1 := &Channel{
		Name:     "heavy-channel",
		Key:      "sk-heavy-channel",
		Type:     1,
		Status:   common.ChannelStatusEnabled,
		Models:   "test-model",
		Group:    "default",
		Priority: &priority,
	}
	require.NoError(t, db.Create(ch1).Error)
	require.NoError(t, ch1.AddAbilities(nil))

	ch2 := &Channel{
		Name:     "light-channel",
		Key:      "sk-light-channel",
		Type:     1,
		Status:   common.ChannelStatusEnabled,
		Models:   "test-model",
		Group:    "default",
		Priority: &priority,
	}
	require.NoError(t, db.Create(ch2).Error)
	require.NoError(t, ch2.AddAbilities(nil))

	// GetChannel should return one of them (both are valid)
	channel, err := GetChannel("default", "test-model", 0, "")
	require.NoError(t, err)
	require.NotNil(t, channel)
	assert.Contains(t, []int{ch1.Id, ch2.Id}, channel.Id)
}

func TestGetChannel_ReturnNilForNoAbilities(t *testing.T) {
	SetupIntegrationTestDB(t)

	// No channels/abilities exist
	channel, err := GetChannel("default", "nonexistent-model", 0, "")
	assert.NoError(t, err)
	assert.Nil(t, channel)
}

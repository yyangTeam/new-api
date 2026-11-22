package oauth

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegistryRegisterAndGet(t *testing.T) {
	defer Unregister("test-registry")

	config := &model.CustomOAuthProvider{Name: "Test", Slug: "test-registry", Enabled: true}
	p := NewGenericOAuthProvider(config)
	Register("test-registry", p)

	got := GetProvider("test-registry")
	require.NotNil(t, got)
	assert.Equal(t, "Test", got.GetName())
}

func TestRegistryGetMissing(t *testing.T) {
	got := GetProvider("nonexistent-provider-xyz")
	assert.Nil(t, got)
}

func TestRegistryUnregister(t *testing.T) {
	config := &model.CustomOAuthProvider{Name: "Temp", Slug: "temp-unreg"}
	Register("temp-unreg", NewGenericOAuthProvider(config))
	require.NotNil(t, GetProvider("temp-unreg"))

	Unregister("temp-unreg")
	assert.Nil(t, GetProvider("temp-unreg"))
}

func TestIsProviderRegistered(t *testing.T) {
	defer Unregister("check-reg")

	assert.False(t, IsProviderRegistered("check-reg"))
	Register("check-reg", NewGenericOAuthProvider(&model.CustomOAuthProvider{Slug: "check-reg"}))
	assert.True(t, IsProviderRegistered("check-reg"))
}

func TestRegisterCustomAndIsCustom(t *testing.T) {
	defer Unregister("custom-test")

	RegisterCustom("custom-test", NewGenericOAuthProvider(&model.CustomOAuthProvider{Slug: "custom-test", Enabled: true}))
	assert.True(t, IsCustomProvider("custom-test"))
	assert.True(t, IsProviderRegistered("custom-test"))

	Unregister("custom-test")
	assert.False(t, IsCustomProvider("custom-test"))
}

func TestIsCustomProvider_BuiltIn(t *testing.T) {
	assert.False(t, IsCustomProvider("github"))
	assert.False(t, IsCustomProvider("discord"))
}

func TestGetAllProviders(t *testing.T) {
	all := GetAllProviders()
	require.NotNil(t, all)
}

func TestRegisterOrUpdateCustomProvider(t *testing.T) {
	defer Unregister("update-test")

	config := &model.CustomOAuthProvider{Name: "V1", Slug: "update-test", Enabled: true}
	RegisterOrUpdateCustomProvider(config)

	p := GetProvider("update-test")
	require.NotNil(t, p)
	assert.Equal(t, "V1", p.GetName())

	config2 := &model.CustomOAuthProvider{Name: "V2", Slug: "update-test", Enabled: true}
	RegisterOrUpdateCustomProvider(config2)

	p2 := GetProvider("update-test")
	require.NotNil(t, p2)
	assert.Equal(t, "V2", p2.GetName())
	assert.True(t, IsCustomProvider("update-test"))
}

func TestUnregisterCustomProvider(t *testing.T) {
	RegisterCustom("del-custom", NewGenericOAuthProvider(&model.CustomOAuthProvider{Slug: "del-custom"}))
	require.True(t, IsProviderRegistered("del-custom"))

	UnregisterCustomProvider("del-custom")
	assert.False(t, IsProviderRegistered("del-custom"))
	assert.False(t, IsCustomProvider("del-custom"))
}

func TestGetEnabledCustomProviders(t *testing.T) {
	defer Unregister("enabled-cp")
	defer Unregister("disabled-cp")

	RegisterCustom("enabled-cp", NewGenericOAuthProvider(&model.CustomOAuthProvider{Slug: "enabled-cp", Enabled: true}))
	RegisterCustom("disabled-cp", NewGenericOAuthProvider(&model.CustomOAuthProvider{Slug: "disabled-cp", Enabled: false}))

	enabled := GetEnabledCustomProviders()
	found := false
	for _, gp := range enabled {
		if gp.config.Slug == "enabled-cp" {
			found = true
		}
		assert.True(t, gp.IsEnabled())
	}
	assert.True(t, found)
}

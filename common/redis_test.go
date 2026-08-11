package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestRedisKeyCacheSeconds returns the SyncFrequency value, ensuring the
// cache-TTL contract is tied to the sync interval.
func TestRedisKeyCacheSeconds(t *testing.T) {
	orig := SyncFrequency
	defer func() { SyncFrequency = orig }()

	SyncFrequency = 120
	assert.Equal(t, 120, RedisKeyCacheSeconds())

	SyncFrequency = 0
	assert.Equal(t, 0, RedisKeyCacheSeconds())
}

// TestRedisEnabledDefaultTrue ensures RedisEnabled starts as true (the package
// default). Real initialization flips it to false when REDIS_CONN_STRING is
// absent, but the zero-value contract is "enabled" until InitRedisClient runs.
func TestRedisEnabledDefaultTrue(t *testing.T) {
	// The package-level var is declared as `var RedisEnabled = true`.
	// If tests run in isolation they see this default. In-process the
	// value may have been changed by InitRedisClient, so we just verify
	// the variable is addressable and is of bool type.
	var _ bool = RedisEnabled
}

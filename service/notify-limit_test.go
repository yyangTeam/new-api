package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/constant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The service package TestMain (task_billing_test.go) sets common.RedisEnabled = false,
// so CheckNotificationLimit exercises the in-memory branches here. The default path
// additionally reads constant.NotifyLimitCount / constant.NotificationLimitDurationMinute,
// which are only populated at server startup, so the default-path test initializes them.
//
// User IDs below are chosen far outside any real range to avoid colliding with the
// package-level notifyLimitStore shared across tests.

// TestCheckNotificationLimit_CooldownSuppressesRepeatWithinWindow verifies the core
// user-configurable-cooldown invariant: at most one notification per (user, type)
// within the cooldown window. The first call is allowed; an immediate second call,
// still inside the window, is suppressed.
func TestCheckNotificationLimit_CooldownSuppressesRepeatWithinWindow(t *testing.T) {
	const uid = 4_900_001
	const ntype = "quota_warning"

	first, err := CheckNotificationLimit(uid, ntype, 1)
	require.NoError(t, err)
	require.True(t, first, "first notification in a fresh cooldown window must be allowed")

	second, err := CheckNotificationLimit(uid, ntype, 1)
	require.NoError(t, err)
	assert.False(t, second, "second notification inside the cooldown window must be suppressed")
}

// TestCheckNotificationLimit_CooldownBucketsArePerUser verifies the cooldown is scoped
// per user: tripping one user's bucket must not suppress a different user's notification.
func TestCheckNotificationLimit_CooldownBucketsArePerUser(t *testing.T) {
	const ntype = "quota_warning"

	_, err := CheckNotificationLimit(4_900_002, ntype, 1) // trip user A's bucket
	require.NoError(t, err)

	other, err := CheckNotificationLimit(4_900_003, ntype, 1) // user B, same type, fresh bucket
	require.NoError(t, err)
	assert.True(t, other, "cooldown must be scoped per user; a different user must be allowed")
}

// TestCheckNotificationLimit_CooldownBucketsArePerNotifyType verifies the cooldown is
// scoped per notify type: tripping one type's bucket must not suppress a different type
// for the same user.
func TestCheckNotificationLimit_CooldownBucketsArePerNotifyType(t *testing.T) {
	const uid = 4_900_004

	_, err := CheckNotificationLimit(uid, "quota_warning", 1) // trip type A's bucket
	require.NoError(t, err)

	other, err := CheckNotificationLimit(uid, "upstream_model_update", 1) // same user, different type
	require.NoError(t, err)
	assert.True(t, other, "cooldown must be scoped per notify type; a different type must be allowed")
}

// TestCheckNotificationLimit_CooldownAllowsAfterWindowElapses verifies the cooldown is
// temporary: once the configured window has passed since the last notification, a new
// notification is allowed again. The store is seeded with an expired timestamp because
// the in-memory branch keys on real time and a one-minute minimum cooldown cannot be
// waited out deterministically in a unit test. The key string mirrors checkMemoryCooldown;
// if that key format changes, update it here.
func TestCheckNotificationLimit_CooldownAllowsAfterWindowElapses(t *testing.T) {
	const uid = 4_900_005
	const ntype = "quota_warning"

	key := fmt.Sprintf("%d:%s:cooldown", uid, ntype)
	notifyLimitStore.Store(key, limitCount{Count: 1, Timestamp: time.Now().Add(-2 * time.Minute)})

	got, err := CheckNotificationLimit(uid, ntype, 1)
	require.NoError(t, err)
	assert.True(t, got, "a notification after the cooldown window has elapsed must be allowed")
}

// TestCheckNotificationLimit_ZeroCooldownFallsBackToServerDefault verifies the
// backward-compatibility contract the user-configurable cooldown preserves:
// cooldownMinutes == 0 keeps the legacy server-default behavior — allow up to
// NotifyLimitCount notifications within the window, then suppress.
func TestCheckNotificationLimit_ZeroCooldownFallsBackToServerDefault(t *testing.T) {
	constant.NotifyLimitCount = 2
	constant.NotificationLimitDurationMinute = 10

	const uid = 4_900_006
	const ntype = "quota_warning_default"

	got, err := CheckNotificationLimit(uid, ntype, 0)
	require.NoError(t, err)
	require.True(t, got, "1st notification under server default must be allowed")

	got, err = CheckNotificationLimit(uid, ntype, 0)
	require.NoError(t, err)
	assert.True(t, got, "2nd notification under server default (limit=2) must be allowed")

	got, err = CheckNotificationLimit(uid, ntype, 0)
	require.NoError(t, err)
	assert.False(t, got, "3rd notification under server default (limit=2) must be suppressed")
}

package operation_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func preserveInviterRebateTiers(t *testing.T) {
	t.Helper()
	original := inviterRebateSetting.Tiers
	t.Cleanup(func() {
		inviterRebateSetting.Tiers = original
	})
}

// TestValidateInviterRebateTiersJSON: write-side validation of the tier JSON —
// legal shapes (including empty = tiers off), and every rejection rule.
func TestValidateInviterRebateTiersJSON(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		want    []InviterRebateTier
		wantErr bool
	}{
		{"empty string disables tiers", "", nil, false},
		{"null disables tiers", "null", nil, false},
		{"empty array disables tiers", "[]", nil, false},
		{"valid multi-tier", `[{"min_invitees":0,"percent":5},{"min_invitees":6,"percent":10},{"min_invitees":21,"percent":15}]`,
			[]InviterRebateTier{{0, 5}, {6, 10}, {21, 15}}, false},
		{"zero percent tier is legal", `[{"min_invitees":0,"percent":0}]`, []InviterRebateTier{{0, 0}}, false},
		{"not a JSON array", `{"min_invitees":0}`, nil, true},
		{"malformed JSON", `[{"min_invitees":0`, nil, true},
		{"percent above 100", `[{"min_invitees":0,"percent":101}]`, nil, true},
		{"negative percent", `[{"min_invitees":0,"percent":-1}]`, nil, true},
		{"negative min_invitees", `[{"min_invitees":-1,"percent":10}]`, nil, true},
		{"duplicate min_invitees", `[{"min_invitees":6,"percent":10},{"min_invitees":6,"percent":15}]`, nil, true},
		{"decreasing min_invitees", `[{"min_invitees":6,"percent":10},{"min_invitees":5,"percent":15}]`, nil, true},
		{"too many tiers", `[{"min_invitees":0,"percent":1},{"min_invitees":1,"percent":1},{"min_invitees":2,"percent":1},{"min_invitees":3,"percent":1},{"min_invitees":4,"percent":1},{"min_invitees":5,"percent":1},{"min_invitees":6,"percent":1},{"min_invitees":7,"percent":1},{"min_invitees":8,"percent":1},{"min_invitees":9,"percent":1},{"min_invitees":10,"percent":1},{"min_invitees":11,"percent":1},{"min_invitees":12,"percent":1},{"min_invitees":13,"percent":1},{"min_invitees":14,"percent":1},{"min_invitees":15,"percent":1},{"min_invitees":16,"percent":1},{"min_invitees":17,"percent":1},{"min_invitees":18,"percent":1},{"min_invitees":19,"percent":1},{"min_invitees":20,"percent":1}]`, nil, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tiers, err := ValidateInviterRebateTiersJSON(tt.value)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, tiers)
		})
	}
}

// TestGetInviterRebateTiersRuntimeGuard: config that bypassed API validation
// (written straight to the DB) degrades to no tiers instead of being applied,
// and the rebate gate only sees tiers as configured when a tier is positive.
func TestGetInviterRebateTiersRuntimeGuard(t *testing.T) {
	preserveInviterRebateTiers(t)

	inviterRebateSetting.Tiers = []InviterRebateTier{{6, 10}, {6, 15}}
	assert.Nil(t, GetInviterRebateTiers(), "invalid runtime tiers must be ignored")
	assert.False(t, InviterRebateTierPercentConfigured())

	inviterRebateSetting.Tiers = []InviterRebateTier{{0, 0}, {6, 0}}
	assert.Len(t, GetInviterRebateTiers(), 2)
	assert.False(t, InviterRebateTierPercentConfigured(), "all-zero tiers keep the rebate feature off")

	inviterRebateSetting.Tiers = []InviterRebateTier{{0, 5}, {6, 10}}
	assert.True(t, InviterRebateTierPercentConfigured())
}

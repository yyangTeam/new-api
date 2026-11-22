/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseSemver(t *testing.T) {
	cases := []struct {
		in   string
		want [3]int
	}{
		{"v0.0.1", [3]int{0, 0, 1}},
		{"0.0.1", [3]int{0, 0, 1}},
		{"v1.2.3", [3]int{1, 2, 3}},
		{"v2.0.0-rc1", [3]int{2, 0, 0}},
		{"v1.2", [3]int{1, 2, 0}},
		{"garbage", [3]int{0, 0, 0}},
		{"", [3]int{0, 0, 0}},
	}
	for _, tc := range cases {
		got := parseSemver(tc.in)
		assert.Equal(t, tc.want, got, "parseSemver(%q)", tc.in)
	}
}

// compareSemver gates which releases appear in the rollback list: only tags
// strictly older than the running version may be offered. A wrong comparison
// would surface a newer (or equal) version for rollback, which is the real
// contract under test here.
func TestCompareSemver_RollbackOrdering(t *testing.T) {
	current := "v0.0.10"
	cases := []struct {
		other   string
		allowed bool // may this tag appear as a rollback target?
	}{
		{"v0.0.9", true},   // older patch -> allowed
		{"v0.0.10", false}, // same -> forbidden
		{"v0.0.11", false}, // newer -> forbidden
		{"v0.1.0", false},  // newer minor -> forbidden
		{"v1.0.0", false},  // newer major -> forbidden
		{"v0.0.1", true},   // much older -> allowed
	}
	for _, tc := range cases {
		got := compareSemver(tc.other, current)
		isOlder := got < 0
		assert.Equal(t, tc.allowed, isOlder, "compareSemver(%q, %q) should be older=%v", tc.other, current, tc.allowed)
	}
}

func TestCompareSemver_EqualAndDirection(t *testing.T) {
	assert.Equal(t, 0, compareSemver("v1.2.3", "1.2.3"))
	assert.Equal(t, -1, compareSemver("v1.2.3", "v1.2.4"))
	assert.Equal(t, 1, compareSemver("v1.3.0", "v1.2.9"))
	assert.Equal(t, -1, compareSemver("v1.2.3", "v2.0.0"))
	assert.Equal(t, 1, compareSemver("v2.0.0", "v1.9.9"))
}

func TestValidateDownloadURL(t *testing.T) {
	origBase := common.UpdateCheckApiBase
	t.Cleanup(func() { common.UpdateCheckApiBase = origBase })
	common.UpdateCheckApiBase = "https://api.github.com"

	cases := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{"github asset https", "https://github.com/x/y/releases/download/v1/binary", false},
		{"objects subdomain", "https://objects.githubusercontent.com/x/y/v1/binary", false},
		{"configured mirror", "https://api.github.com/repos/x/y/asset", false},
		{"plain http rejected", "http://github.com/x/y/binary", true},
		{"untrusted host rejected", "https://evil.example.com/binary", true},
		{"malformed rejected", "://no-scheme", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateDownloadURL(tc.url)
			if tc.wantErr {
				require.Error(t, err, tc.url)
			} else {
				require.NoError(t, err, tc.url)
			}
		})
	}
}

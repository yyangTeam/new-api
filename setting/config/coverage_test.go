package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// coverageScalarConfig exercises every supported scalar field kind in
// configToMap / updateConfigFromMap. The json tags are intentionally terse so
// the persisted key set is stable and observable.
type coverageScalarConfig struct {
	Str   string  `json:"str"`
	Flag  bool    `json:"flag"`
	I     int     `json:"i"`
	I8    int8    `json:"i8"`
	I64   int64   `json:"i64"`
	U     uint    `json:"u"`
	U8    uint8   `json:"u8"`
	U64   uint64  `json:"u64"`
	F32   float32 `json:"f32"`
	F64   float64 `json:"f64"`
	NoTag string
	Hidden string `json:"-"`
	PStr   *string  `json:"pstr"`
	PSlice []string  `json:"pslice"`
	Inner  coverageInner `json:"inner"`
}

type coverageInner struct {
	Value string `json:"value"`
}

func newCoverageScalarConfig() *coverageScalarConfig {
	s := "ptr-value"
	return &coverageScalarConfig{
		Str:    "hello",
		Flag:   true,
		I:      7,
		I8:     8,
		I64:    64,
		U:      9,
		U8:     80,
		U64:    640,
		F32:    1.5,
		F64:    2.25,
		NoTag:  "noTag",
		Hidden: "secret",
		PStr:   &s,
		PSlice: []string{"a", "b"},
		Inner:  coverageInner{Value: "v1"},
	}
}

func TestConfigToMap_RoundTripsAllSupportedKinds(t *testing.T) {
	cfg := newCoverageScalarConfig()
	m, err := ConfigToMap(cfg)
	require.NoError(t, err)

	assert.Equal(t, "hello", m["str"])
	assert.Equal(t, "true", m["flag"])
	assert.Equal(t, "7", m["i"])
	assert.Equal(t, "8", m["i8"])
	assert.Equal(t, "64", m["i64"])
	assert.Equal(t, "9", m["u"])
	assert.Equal(t, "80", m["u8"])
	assert.Equal(t, "640", m["u64"])
	assert.Equal(t, "1.5", m["f32"])
	assert.Equal(t, "2.25", m["f64"])
	// Field without json tag falls back to the field name.
	assert.Equal(t, "noTag", m["NoTag"])
	// Unexported field is skipped.
	_, hasHidden := m["hidden"]
	assert.False(t, hasHidden)
	// Non-nil pointer serializes the pointed value as JSON.
	assert.Equal(t, `"ptr-value"`, m["pstr"])
	assert.Equal(t, `["a","b"]`, m["pslice"])
	assert.Equal(t, `{"value":"v1"}`, m["inner"])
}

func TestConfigToMap_NilPointerSerializesAsNull(t *testing.T) {
	cfg := &coverageScalarConfig{}
	m, err := ConfigToMap(cfg)
	require.NoError(t, err)
	assert.Equal(t, "null", m["pstr"])
}

func TestConfigToMap_RejectsNonStruct(t *testing.T) {
	// A bare map is not a struct; configToMap returns nil map, nil error.
	m, err := ConfigToMap(map[string]string{"k": "v"})
	require.NoError(t, err)
	assert.Nil(t, m)
}

func TestUpdateConfigFromMap_RoundTripsScalars(t *testing.T) {
	cfg := newCoverageScalarConfig()
	updated := map[string]string{
		"str":    "world",
		"flag":   "false",
		"i":      "11",
		"i8":     "12",
		"i64":    "13",
		"u":      "14",
		"u8":     "15",
		"u64":    "16",
		"f32":    "3.5",
		"f64":    "4.25",
		"NoTag":  "newNoTag",
		"pstr":   `"updated"`,
		"pslice": `["c","d"]`,
		"inner":  `{"value":"v2"}`,
	}
	require.NoError(t, UpdateConfigFromMap(cfg, updated))

	assert.Equal(t, "world", cfg.Str)
	assert.False(t, cfg.Flag)
	assert.Equal(t, int(11), cfg.I)
	assert.Equal(t, int8(12), cfg.I8)
	assert.Equal(t, int64(13), cfg.I64)
	assert.Equal(t, uint(14), cfg.U)
	assert.Equal(t, uint8(15), cfg.U8)
	assert.Equal(t, uint64(16), cfg.U64)
	assert.InDelta(t, 3.5, float64(cfg.F32), 0.0001)
	assert.InDelta(t, 4.25, cfg.F64, 0.0001)
	assert.Equal(t, "newNoTag", cfg.NoTag)
	require.NotNil(t, cfg.PStr)
	assert.Equal(t, "updated", *cfg.PStr)
	assert.Equal(t, []string{"c", "d"}, cfg.PSlice)
	assert.Equal(t, "v2", cfg.Inner.Value)
}

func TestUpdateConfigFromMap_NilPointerIsAllocatedAndSet(t *testing.T) {
	cfg := &coverageScalarConfig{} // PStr is nil
	require.NoError(t, UpdateConfigFromMap(cfg, map[string]string{
		"pstr": `"fresh"`,
	}))
	require.NotNil(t, cfg.PStr)
	assert.Equal(t, "fresh", *cfg.PStr)
}

func TestUpdateConfigFromMap_NullPointerIsCleared(t *testing.T) {
	s := "orig"
	cfg := &coverageScalarConfig{PStr: &s}
	require.NoError(t, UpdateConfigFromMap(cfg, map[string]string{
		"pstr": "null",
	}))
	assert.Nil(t, cfg.PStr)
}

func TestUpdateConfigFromMap_FloatStringAcceptedForIntAndUint(t *testing.T) {
	cfg := &coverageScalarConfig{}
	// "2.000000" style strings must be tolerated for int/uint fields.
	require.NoError(t, UpdateConfigFromMap(cfg, map[string]string{
		"i": "2.000000",
		"u": "3.000000",
	}))
	assert.Equal(t, int(2), cfg.I)
	assert.Equal(t, uint(3), cfg.U)
}

func TestUpdateConfigFromMap_NegativeFloatRejectedForUint(t *testing.T) {
	cfg := &coverageScalarConfig{}
	require.NoError(t, UpdateConfigFromMap(cfg, map[string]string{
		"u": "-1.5",
	}))
	// Negative float must not be written to an unsigned field.
	assert.Equal(t, uint(0), cfg.U)
}

func TestUpdateConfigFromMap_InvalidValuesAreSkippedNotFatal(t *testing.T) {
	cfg := newCoverageScalarConfig()
	original := *cfg
	// Malformed values for each kind are skipped silently; valid siblings still apply.
	require.NoError(t, UpdateConfigFromMap(cfg, map[string]string{
		"flag": "not-a-bool",
		"i":    "not-an-int",
		"u":    "not-a-uint",
		"f64":  "not-a-float",
		"str":  "valid",
	}))
	assert.Equal(t, original.Flag, cfg.Flag)
	assert.Equal(t, original.I, cfg.I)
	assert.Equal(t, original.U, cfg.U)
	assert.Equal(t, original.F64, cfg.F64)
	assert.Equal(t, "valid", cfg.Str)
}

func TestUpdateConfigFromMap_RejectsNonPointer(t *testing.T) {
	// Non-pointer struct: updateConfigFromMap returns nil without touching it.
	cfg := coverageScalarConfig{Str: "keep"}
	require.NoError(t, UpdateConfigFromMap(cfg, map[string]string{"str": "changed"}))
	assert.Equal(t, "keep", cfg.Str)
}

func TestUpdateConfigFromMap_UnsettableFieldIsSkipped(t *testing.T) {
	// Fields absent from the map are left untouched.
	cfg := &coverageScalarConfig{Str: "keep", I: 42}
	require.NoError(t, UpdateConfigFromMap(cfg, map[string]string{
		"flag": "true",
	}))
	assert.Equal(t, "keep", cfg.Str)
	assert.Equal(t, 42, cfg.I)
	assert.True(t, cfg.Flag)
}

func TestConfigManager_RegisterAndGet(t *testing.T) {
	cm := NewConfigManager()
	cfg := &coverageScalarConfig{Str: "registered"}
	cm.Register("mod", cfg)

	got := cm.Get("mod")
	require.Same(t, cfg, got)
	// Unknown module returns nil interface.
	assert.Nil(t, cm.Get("missing"))
}

func TestConfigManager_LoadFromDB_PrefixScopedUpdate(t *testing.T) {
	cm := NewConfigManager()
	cfgA := &coverageScalarConfig{Str: "a"}
	cfgB := &coverageScalarConfig{Str: "b"}
	cm.Register("modA", cfgA)
	cm.Register("modB", cfgB)

	// Only modA.* keys should affect cfgA; modB.* keys affect cfgB.
	options := map[string]string{
		"modA.str": "updatedA",
		"modB.str": "updatedB",
		// Unrelated key with no registered module is ignored.
		"orphan.str": "x",
	}
	require.NoError(t, cm.LoadFromDB(options))

	assert.Equal(t, "updatedA", cfgA.Str)
	assert.Equal(t, "updatedB", cfgB.Str)
}

func TestConfigManager_LoadFromDB_BadValueForOneFieldContinuesOthers(t *testing.T) {
	cm := NewConfigManager()
	cfg := &coverageScalarConfig{Str: "keep", I: 9}
	cm.Register("mod", cfg)

	// A bad bool value must not abort the whole load; the valid str still applies.
	require.NoError(t, cm.LoadFromDB(map[string]string{
		"mod.flag": "not-a-bool",
		"mod.str":  "applied",
	}))
	assert.Equal(t, "applied", cfg.Str)
	assert.False(t, cfg.Flag)
	assert.Equal(t, 9, cfg.I)
}

func TestConfigManager_SaveToDB_FlattensWithModulePrefix(t *testing.T) {
	cm := NewConfigManager()
	cm.Register("mod", &coverageScalarConfig{Str: "s", I: 3, Flag: true})

	saved := make(map[string]string)
	require.NoError(t, cm.SaveToDB(func(key, value string) error {
		saved[key] = value
		return nil
	}))

	assert.Equal(t, "s", saved["mod.str"])
	assert.Equal(t, "3", saved["mod.i"])
	assert.Equal(t, "true", saved["mod.flag"])
}

func TestConfigManager_SaveToDB_UpdateFuncErrorAborts(t *testing.T) {
	cm := NewConfigManager()
	cm.Register("mod", &coverageScalarConfig{Str: "s", I: 3})

	calls := 0
	err := cm.SaveToDB(func(key, value string) error {
		calls++
		// Fail on the first persisted key; SaveToDB must surface the error and stop.
		return assert.AnError
	})
	require.ErrorIs(t, err, assert.AnError)
	require.GreaterOrEqual(t, calls, 1)
}

func TestConfigManager_SaveThenLoad_RoundTripFidelity(t *testing.T) {
	cm := NewConfigManager()
	original := newCoverageScalarConfig()
	cm.Register("mod", original)

	// Save into a kv map, then load into a fresh config and confirm fidelity.
	store := make(map[string]string)
	require.NoError(t, cm.SaveToDB(func(key, value string) error {
		store[key] = value
		return nil
	}))

	roundTrip := &coverageScalarConfig{}
	cm2 := NewConfigManager()
	cm2.Register("mod", roundTrip)
	require.NoError(t, cm2.LoadFromDB(store))

	assert.Equal(t, original.Str, roundTrip.Str)
	assert.Equal(t, original.Flag, roundTrip.Flag)
	assert.Equal(t, original.I, roundTrip.I)
	assert.Equal(t, original.I8, roundTrip.I8)
	assert.Equal(t, original.I64, roundTrip.I64)
	assert.Equal(t, original.U, roundTrip.U)
	assert.Equal(t, original.U8, roundTrip.U8)
	assert.Equal(t, original.U64, roundTrip.U64)
	assert.InDelta(t, float64(original.F32), float64(roundTrip.F32), 0.0001)
	assert.InDelta(t, original.F64, roundTrip.F64, 0.0001)
	require.NotNil(t, roundTrip.PStr)
	assert.Equal(t, *original.PStr, *roundTrip.PStr)
	assert.Equal(t, original.PSlice, roundTrip.PSlice)
	assert.Equal(t, original.Inner, roundTrip.Inner)
}

func TestConfigManager_ExportAllConfigs_FlatModulePrefixedMap(t *testing.T) {
	cm := NewConfigManager()
	cm.Register("modA", &coverageScalarConfig{Str: "a", I: 1})
	cm.Register("modB", &coverageScalarConfig{Str: "b", I: 2})

	exported := cm.ExportAllConfigs()
	assert.Equal(t, "a", exported["modA.str"])
	assert.Equal(t, "1", exported["modA.i"])
	assert.Equal(t, "b", exported["modB.str"])
	assert.Equal(t, "2", exported["modB.i"])
}

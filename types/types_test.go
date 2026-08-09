package types

import (
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Set tests
// ---------------------------------------------------------------------------

func TestSet_AddAndContains(t *testing.T) {
	s := NewSet[string]()
	require.NotNil(t, s)

	s.Add("a")
	s.Add("b")
	s.Add("a") // duplicate

	assert.True(t, s.Contains("a"))
	assert.True(t, s.Contains("b"))
	assert.False(t, s.Contains("c"))
	assert.Equal(t, 2, s.Len())
}

func TestSet_Remove(t *testing.T) {
	s := NewSet[int]()
	s.Add(1)
	s.Add(2)
	s.Add(3)

	s.Remove(2)
	assert.False(t, s.Contains(2))
	assert.Equal(t, 2, s.Len())

	// Removing non-existent item is a no-op
	s.Remove(99)
	assert.Equal(t, 2, s.Len())
}

func TestSet_Items(t *testing.T) {
	s := NewSet[string]()
	s.Add("x")
	s.Add("y")
	s.Add("z")

	items := s.Items()
	assert.Len(t, items, 3)
	assert.ElementsMatch(t, []string{"x", "y", "z"}, items)
}

func TestSet_EmptySetOperations(t *testing.T) {
	s := NewSet[int]()
	assert.Equal(t, 0, s.Len())
	assert.False(t, s.Contains(0))
	assert.Empty(t, s.Items())
}

// ---------------------------------------------------------------------------
// PriceData tests
// ---------------------------------------------------------------------------

func TestPriceData_AddOtherRatio_ValidRatios(t *testing.T) {
	pd := &PriceData{}

	pd.AddOtherRatio("size", 2.0)
	pd.AddOtherRatio("quality", 1.5)

	assert.True(t, pd.HasOtherRatio("size"))
	assert.True(t, pd.HasOtherRatio("quality"))
	assert.False(t, pd.HasOtherRatio("nonexistent"))
}

func TestPriceData_AddOtherRatio_RejectsInvalid(t *testing.T) {
	tests := []struct {
		name  string
		ratio float64
	}{
		{"zero", 0},
		{"negative", -1.0},
		{"positive infinity", positiveInf()},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			pd := &PriceData{}
			pd.AddOtherRatio("key", tc.ratio)
			assert.False(t, pd.HasOtherRatio("key"))
		})
	}
}

func positiveInf() float64 {
	// Use a computation to avoid direct math import cycle concerns
	x := 1.0
	for i := 0; i < 1100; i++ {
		x *= 10
	}
	return x
}

func TestPriceData_OtherRatioMultiplier(t *testing.T) {
	pd := &PriceData{}
	// No ratios: multiplier should be 1.0
	assert.Equal(t, 1.0, pd.OtherRatioMultiplier())

	pd.AddOtherRatio("a", 2.0)
	pd.AddOtherRatio("b", 3.0)
	assert.InDelta(t, 6.0, pd.OtherRatioMultiplier(), 1e-10)

	// Ratio of 1.0 should not change multiplier
	pd.AddOtherRatio("c", 1.0)
	assert.InDelta(t, 6.0, pd.OtherRatioMultiplier(), 1e-10)
}

func TestPriceData_ApplyOtherRatiosToFloat(t *testing.T) {
	pd := &PriceData{}
	pd.AddOtherRatio("scale", 2.5)

	result := pd.ApplyOtherRatiosToFloat(100.0)
	assert.InDelta(t, 250.0, result, 1e-10)
}

func TestPriceData_RemoveOtherRatiosFromFloat(t *testing.T) {
	pd := &PriceData{}
	pd.AddOtherRatio("scale", 2.0)

	result := pd.RemoveOtherRatiosFromFloat(100.0)
	assert.InDelta(t, 50.0, result, 1e-10)
}

func TestPriceData_ReplaceOtherRatios(t *testing.T) {
	pd := &PriceData{}
	pd.AddOtherRatio("old", 5.0)

	hasRatios := pd.ReplaceOtherRatios(map[string]float64{
		"new1": 2.0,
		"new2": 3.0,
	})
	assert.True(t, hasRatios)
	assert.False(t, pd.HasOtherRatio("old"))
	assert.True(t, pd.HasOtherRatio("new1"))
	assert.True(t, pd.HasOtherRatio("new2"))
}

func TestPriceData_ReplaceOtherRatios_AllInvalid(t *testing.T) {
	pd := &PriceData{}
	hasRatios := pd.ReplaceOtherRatios(map[string]float64{
		"bad": -1.0,
	})
	assert.False(t, hasRatios)
}

func TestPriceData_OtherRatios_ReturnsNilWhenEmpty(t *testing.T) {
	pd := &PriceData{}
	assert.Nil(t, pd.OtherRatios())
}

func TestPriceData_ToSetting(t *testing.T) {
	pd := &PriceData{
		ModelPrice:      0.5,
		ModelRatio:      1.0,
		CompletionRatio: 2.0,
		CacheRatio:      0.1,
		UsePrice:        true,
		GroupRatioInfo:  GroupRatioInfo{GroupRatio: 1.5},
	}
	s := pd.ToSetting()
	assert.Contains(t, s, "ModelPrice: 0.500000")
	assert.Contains(t, s, "CompletionRatio: 2.000000")
	assert.Contains(t, s, "UsePrice: true")
	assert.Contains(t, s, "GroupRatio: 1.500000")
}

// ---------------------------------------------------------------------------
// RWMap tests
// ---------------------------------------------------------------------------

func TestRWMap_BasicOperations(t *testing.T) {
	m := NewRWMap[string, int]()
	require.NotNil(t, m)

	m.Set("a", 1)
	m.Set("b", 2)

	val, ok := m.Get("a")
	assert.True(t, ok)
	assert.Equal(t, 1, val)

	val, ok = m.Get("c")
	assert.False(t, ok)
	assert.Equal(t, 0, val)

	assert.Equal(t, 2, m.Len())
}

func TestRWMap_AddAll(t *testing.T) {
	m := NewRWMap[string, string]()
	m.Set("existing", "value")

	m.AddAll(map[string]string{
		"k1": "v1",
		"k2": "v2",
	})

	assert.Equal(t, 3, m.Len())
	v, ok := m.Get("k1")
	assert.True(t, ok)
	assert.Equal(t, "v1", v)
}

func TestRWMap_Clear(t *testing.T) {
	m := NewRWMap[string, int]()
	m.Set("a", 1)
	m.Set("b", 2)
	m.Clear()

	assert.Equal(t, 0, m.Len())
	_, ok := m.Get("a")
	assert.False(t, ok)
}

func TestRWMap_ReadAll(t *testing.T) {
	m := NewRWMap[string, int]()
	m.Set("x", 10)
	m.Set("y", 20)

	copied := m.ReadAll()
	assert.Equal(t, map[string]int{"x": 10, "y": 20}, copied)

	// Mutating the copy should not affect the original
	copied["z"] = 30
	assert.Equal(t, 2, m.Len())
}

func TestRWMap_MarshalJSON(t *testing.T) {
	m := NewRWMap[string, int]()
	m.Set("a", 1)

	data, err := m.MarshalJSON()
	require.NoError(t, err)
	assert.JSONEq(t, `{"a":1}`, string(data))
}

func TestRWMap_UnmarshalJSON(t *testing.T) {
	m := NewRWMap[string, int]()
	err := m.UnmarshalJSON([]byte(`{"x":42,"y":7}`))
	require.NoError(t, err)

	val, ok := m.Get("x")
	assert.True(t, ok)
	assert.Equal(t, 42, val)
	assert.Equal(t, 2, m.Len())
}

func TestRWMap_UnmarshalJSON_InvalidJSON(t *testing.T) {
	m := NewRWMap[string, int]()
	err := m.UnmarshalJSON([]byte(`not json`))
	assert.Error(t, err)
}

func TestRWMap_MarshalJSONString(t *testing.T) {
	m := NewRWMap[string, int]()
	m.Set("k", 99)
	s := m.MarshalJSONString()
	assert.JSONEq(t, `{"k":99}`, s)
}

func TestRWMap_MarshalJSONString_Empty(t *testing.T) {
	m := NewRWMap[string, int]()
	s := m.MarshalJSONString()
	assert.Equal(t, "{}", s)
}

func TestLoadFromJsonString(t *testing.T) {
	m := NewRWMap[string, float64]()
	err := LoadFromJsonString(m, `{"pi":3.14,"e":2.718}`)
	require.NoError(t, err)

	val, ok := m.Get("pi")
	assert.True(t, ok)
	assert.InDelta(t, 3.14, val, 1e-10)
	assert.Equal(t, 2, m.Len())
}

func TestLoadFromJsonString_InvalidJSON(t *testing.T) {
	m := NewRWMap[string, int]()
	err := LoadFromJsonString(m, `{broken`)
	assert.Error(t, err)
}

func TestLoadFromJsonStringWithCallback(t *testing.T) {
	m := NewRWMap[string, int]()
	called := false
	err := LoadFromJsonStringWithCallback(m, `{"a":1}`, func() {
		called = true
	})
	require.NoError(t, err)
	assert.True(t, called)
}

func TestLoadFromJsonStringWithCallback_Error(t *testing.T) {
	m := NewRWMap[string, int]()
	called := false
	err := LoadFromJsonStringWithCallback(m, `invalid`, func() {
		called = true
	})
	assert.Error(t, err)
	assert.False(t, called)
}

func TestRWMap_ConcurrentAccess(t *testing.T) {
	m := NewRWMap[int, int]()
	var wg sync.WaitGroup

	// Concurrent writes
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(val int) {
			defer wg.Done()
			m.Set(val, val*2)
		}(i)
	}
	wg.Wait()

	assert.Equal(t, 100, m.Len())
	for i := 0; i < 100; i++ {
		val, ok := m.Get(i)
		assert.True(t, ok)
		assert.Equal(t, i*2, val)
	}
}

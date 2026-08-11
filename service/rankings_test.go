package service

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Pure helper tests (no DB) ---

func TestRankingConfig_ValidPeriods(t *testing.T) {
	tests := []struct {
		period string
		id     string
	}{
		{"", "week"},
		{"week", "week"},
		{"today", "today"},
		{"month", "month"},
		{"year", "year"},
	}
	for _, tt := range tests {
		t.Run(tt.period, func(t *testing.T) {
			cfg, err := rankingConfig(tt.period)
			require.NoError(t, err)
			assert.Equal(t, tt.id, cfg.id)
			assert.True(t, cfg.hasPrevious)
			assert.True(t, cfg.duration > 0)
			assert.True(t, cfg.bucketSize > 0)
		})
	}
}

func TestRankingConfig_InvalidPeriod(t *testing.T) {
	_, err := rankingConfig("invalid")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid ranking period")
}

func TestRankingTimeRange(t *testing.T) {
	now := time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC)
	cfg := rankingPeriodConfig{duration: 7 * 24 * time.Hour}
	start, end := rankingTimeRange(cfg, now)
	assert.Equal(t, now.Unix(), end)
	assert.Equal(t, now.Add(-7*24*time.Hour).Unix(), start)
}

func TestPreviousRankingTimeRange(t *testing.T) {
	cfg := rankingPeriodConfig{duration: 7 * 24 * time.Hour}
	currentStart := int64(1000000)
	prevStart, prevEnd := previousRankingTimeRange(cfg, currentStart)
	assert.Equal(t, currentStart-1, prevEnd)
	assert.Equal(t, time.Unix(currentStart, 0).Add(-7*24*time.Hour).Unix(), prevStart)
}

func TestRankingShare(t *testing.T) {
	tests := []struct {
		name     string
		value    int64
		total    int64
		expected float64
	}{
		{"normal", 500, 1000, 0.5},
		{"zero total", 100, 0, 0},
		{"zero value", 0, 1000, 0},
		{"negative total", 100, -1, 0},
		{"full share", 1000, 1000, 1.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := rankingShare(tt.value, tt.total)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestRankingGrowthPct(t *testing.T) {
	tests := []struct {
		name     string
		current  int64
		previous int64
		expected float64
	}{
		{"100% growth", 200, 100, 100.0},
		{"50% growth", 150, 100, 50.0},
		{"decline", 50, 100, -50.0},
		{"no previous, has current", 100, 0, 100.0},
		{"no previous, no current", 0, 0, 0.0},
		{"same as previous", 100, 100, 0.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := rankingGrowthPct(tt.current, tt.previous)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestSumRankingTokens(t *testing.T) {
	totals := []model.RankingQuotaTotal{
		{ModelName: "a", TotalTokens: 100},
		{ModelName: "b", TotalTokens: 200},
		{ModelName: "c", TotalTokens: 300},
	}
	assert.Equal(t, int64(600), sumRankingTokens(totals))
	assert.Equal(t, int64(0), sumRankingTokens(nil))
}

func TestRankingRankMap(t *testing.T) {
	totals := []model.RankingQuotaTotal{
		{ModelName: "gpt-4", TotalTokens: 1000},
		{ModelName: "claude-3", TotalTokens: 500},
		{ModelName: "gemini", TotalTokens: 250},
	}
	ranks := rankingRankMap(totals)
	assert.Equal(t, 1, ranks["gpt-4"])
	assert.Equal(t, 2, ranks["claude-3"])
	assert.Equal(t, 3, ranks["gemini"])
}

func TestRankingTokenMap(t *testing.T) {
	totals := []model.RankingQuotaTotal{
		{ModelName: "gpt-4", TotalTokens: 1000},
		{ModelName: "claude-3", TotalTokens: 500},
	}
	tokens := rankingTokenMap(totals)
	assert.Equal(t, int64(1000), tokens["gpt-4"])
	assert.Equal(t, int64(500), tokens["claude-3"])
}

func TestLimitRankedModels(t *testing.T) {
	models := make([]RankedModel, 25)
	for i := range models {
		models[i] = RankedModel{Rank: i + 1, ModelName: "m"}
	}
	limited := limitRankedModels(models, 20)
	assert.Len(t, limited, 20)

	// Under limit returns all
	small := []RankedModel{{Rank: 1}, {Rank: 2}}
	assert.Len(t, limitRankedModels(small, 20), 2)

	// Zero limit returns all
	assert.Len(t, limitRankedModels(models, 0), 25)
}

func TestLimitRankingMovers(t *testing.T) {
	movers := make([]RankingMover, 10)
	limited := limitRankingMovers(movers, 6)
	assert.Len(t, limited, 6)

	assert.Len(t, limitRankingMovers(movers, 0), 10)
	assert.Len(t, limitRankingMovers(movers, 20), 10)
}

func TestBuildRankingMovers(t *testing.T) {
	rank2 := 5
	rank3 := 1
	models := []RankedModel{
		{Rank: 1, ModelName: "stable", PreviousRank: nil},         // no previous
		{Rank: 2, ModelName: "mover", PreviousRank: &rank2},       // moved up 3
		{Rank: 3, ModelName: "dropper", PreviousRank: &rank3},     // dropped 2
	}
	movers, droppers := buildRankingMovers(models)
	require.Len(t, movers, 1)
	assert.Equal(t, "mover", movers[0].ModelName)
	assert.Equal(t, 3, movers[0].RankDelta) // 5-2=3

	require.Len(t, droppers, 1)
	assert.Equal(t, "dropper", droppers[0].ModelName)
	assert.Equal(t, -2, droppers[0].RankDelta) // 1-3=-2
}

func TestMinInt(t *testing.T) {
	assert.Equal(t, 3, minInt(3, 5))
	assert.Equal(t, 3, minInt(5, 3))
	assert.Equal(t, 4, minInt(4, 4))
}

func TestRoundRankingFloat(t *testing.T) {
	assert.Equal(t, 0.3333, roundRankingFloat(1.0/3.0))
	assert.Equal(t, 1.0, roundRankingFloat(1.0))
	assert.Equal(t, 0.0, roundRankingFloat(0.0))
}

func TestSortedRankingBuckets(t *testing.T) {
	bucketSet := map[int64]struct{}{
		300: {},
		100: {},
		200: {},
	}
	sorted := sortedRankingBuckets(bucketSet)
	require.Len(t, sorted, 3)
	assert.Equal(t, int64(100), sorted[0])
	assert.Equal(t, int64(200), sorted[1])
	assert.Equal(t, int64(300), sorted[2])
}

func TestRankingBucketTs(t *testing.T) {
	ts := rankingBucketTs(1704067200) // 2024-01-01 00:00:00 UTC
	assert.Equal(t, "2024-01-01T00:00:00Z", ts)
}

// --- DB-backed tests using SQLite fixture from TestMain ---

func TestGetRankingsSnapshot_DBIntegration(t *testing.T) {
	// Migrate QuotaData table for this test
	err := model.DB.AutoMigrate(&model.QuotaData{})
	require.NoError(t, err)

	// Clean up
	model.DB.Exec("DELETE FROM quota_data")

	// Seed data: 2 models with usage in the last week
	now := time.Now().Unix()
	model.DB.Exec("INSERT INTO quota_data (user_id, model_name, token_used, count, quota, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		1, "gpt-4", 5000, 10, 100, now-3600)
	model.DB.Exec("INSERT INTO quota_data (user_id, model_name, token_used, count, quota, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		1, "claude-3", 3000, 5, 60, now-7200)

	// Clear ranking cache to force fresh build
	rankingCacheMu.Lock()
	delete(rankingCache, "week")
	rankingCacheMu.Unlock()

	resp, err := GetRankingsSnapshot("week")
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Verify models are ranked by total tokens
	require.GreaterOrEqual(t, len(resp.Models), 2)
	assert.Equal(t, "gpt-4", resp.Models[0].ModelName)
	assert.Equal(t, "claude-3", resp.Models[1].ModelName)
	assert.Equal(t, int64(5000), resp.Models[0].TotalTokens)
	assert.Equal(t, int64(3000), resp.Models[1].TotalTokens)
	assert.Equal(t, 1, resp.Models[0].Rank)
	assert.Equal(t, 2, resp.Models[1].Rank)

	// Share must sum to ~1.0
	totalShare := resp.Models[0].Share + resp.Models[1].Share
	assert.InDelta(t, 1.0, totalShare, 0.001)

	// Clean up
	model.DB.Exec("DELETE FROM quota_data")
}

func TestGetRankingsSnapshot_CachesResult(t *testing.T) {
	err := model.DB.AutoMigrate(&model.QuotaData{})
	require.NoError(t, err)
	model.DB.Exec("DELETE FROM quota_data")

	now := time.Now().Unix()
	model.DB.Exec("INSERT INTO quota_data (user_id, model_name, token_used, count, quota, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		1, "test-model", 1000, 1, 10, now-100)

	// Clear cache
	rankingCacheMu.Lock()
	delete(rankingCache, "today")
	rankingCacheMu.Unlock()

	resp1, err := GetRankingsSnapshot("today")
	require.NoError(t, err)

	// Second call should return cached result (same pointer)
	resp2, err := GetRankingsSnapshot("today")
	require.NoError(t, err)
	assert.Equal(t, resp1, resp2)

	// Clean up
	model.DB.Exec("DELETE FROM quota_data")
	rankingCacheMu.Lock()
	delete(rankingCache, "today")
	rankingCacheMu.Unlock()
}

func TestGetRankingsSnapshot_InvalidPeriod(t *testing.T) {
	_, err := GetRankingsSnapshot("invalid_period")
	require.Error(t, err)
}

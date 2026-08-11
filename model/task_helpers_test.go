package model

import (
	"encoding/json"
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTaskStatusToVideoStatus(t *testing.T) {
	tests := []struct {
		name     string
		status   TaskStatus
		expected string
	}{
		{"queued", TaskStatusQueued, dto.VideoStatusQueued},
		{"submitted", TaskStatusSubmitted, dto.VideoStatusQueued},
		{"in_progress", TaskStatusInProgress, dto.VideoStatusInProgress},
		{"success", TaskStatusSuccess, dto.VideoStatusCompleted},
		{"failure", TaskStatusFailure, dto.VideoStatusFailed},
		{"not_start", TaskStatusNotStart, dto.VideoStatusUnknown},
		{"unknown", TaskStatusUnknown, dto.VideoStatusUnknown},
		{"arbitrary", TaskStatus("WHATEVER"), dto.VideoStatusUnknown},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.status.ToVideoStatus())
		})
	}
}

func TestGenerateTaskID_Format(t *testing.T) {
	id := GenerateTaskID()
	assert.True(t, len(id) > 5, "task ID should be longer than prefix")
	assert.Equal(t, "task_", id[:5], "task ID must start with 'task_'")
}

func TestGenerateTaskID_Unique(t *testing.T) {
	ids := make(map[string]bool)
	for i := 0; i < 100; i++ {
		id := GenerateTaskID()
		assert.False(t, ids[id], "task IDs must be unique")
		ids[id] = true
	}
}

func TestGetUpstreamTaskID_WithPrivateData(t *testing.T) {
	task := &Task{
		TaskID:      "task_public123",
		PrivateData: TaskPrivateData{UpstreamTaskID: "upstream_456"},
	}
	assert.Equal(t, "upstream_456", task.GetUpstreamTaskID())
}

func TestGetUpstreamTaskID_FallbackToTaskID(t *testing.T) {
	task := &Task{
		TaskID:      "task_public123",
		PrivateData: TaskPrivateData{},
	}
	assert.Equal(t, "task_public123", task.GetUpstreamTaskID())
}

func TestGetResultURL_WithPrivateData(t *testing.T) {
	task := &Task{
		FailReason:  "legacy_url",
		PrivateData: TaskPrivateData{ResultURL: "https://cdn.example.com/video.mp4"},
	}
	assert.Equal(t, "https://cdn.example.com/video.mp4", task.GetResultURL())
}

func TestGetResultURL_FallbackToFailReason(t *testing.T) {
	task := &Task{
		FailReason:  "https://old-cdn.example.com/video.mp4",
		PrivateData: TaskPrivateData{},
	}
	assert.Equal(t, "https://old-cdn.example.com/video.mp4", task.GetResultURL())
}

func TestTaskSnapshot_Equal(t *testing.T) {
	s1 := taskSnapshot{
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		StartTime:  1000,
		FinishTime: 2000,
		FailReason: "",
		ResultURL:  "https://example.com/video.mp4",
		Data:       json.RawMessage(`{"key":"value"}`),
	}
	s2 := taskSnapshot{
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		StartTime:  1000,
		FinishTime: 2000,
		FailReason: "",
		ResultURL:  "https://example.com/video.mp4",
		Data:       json.RawMessage(`{"key":"value"}`),
	}
	assert.True(t, s1.Equal(s2))
}

func TestTaskSnapshot_NotEqual(t *testing.T) {
	base := taskSnapshot{
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		StartTime:  1000,
		FinishTime: 2000,
		FailReason: "",
		ResultURL:  "https://example.com/video.mp4",
		Data:       json.RawMessage(`{"key":"value"}`),
	}

	tests := []struct {
		name   string
		modify func(s *taskSnapshot)
	}{
		{"status", func(s *taskSnapshot) { s.Status = TaskStatusFailure }},
		{"progress", func(s *taskSnapshot) { s.Progress = "50%" }},
		{"start_time", func(s *taskSnapshot) { s.StartTime = 999 }},
		{"finish_time", func(s *taskSnapshot) { s.FinishTime = 3000 }},
		{"fail_reason", func(s *taskSnapshot) { s.FailReason = "error" }},
		{"result_url", func(s *taskSnapshot) { s.ResultURL = "different" }},
		{"data", func(s *taskSnapshot) { s.Data = json.RawMessage(`{"other":"data"}`) }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			modified := base
			tt.modify(&modified)
			assert.False(t, base.Equal(modified))
		})
	}
}

func TestTaskSetAndGetData(t *testing.T) {
	task := &Task{}
	input := map[string]string{"video_url": "https://example.com/v.mp4"}
	task.SetData(input)

	var output map[string]string
	err := task.GetData(&output)
	require.NoError(t, err)
	assert.Equal(t, input, output)
}

func TestPropertiesScanValue_RoundTrip(t *testing.T) {
	props := Properties{
		Input:             "test input",
		UpstreamModelName: "gpt-4",
		OriginModelName:   "gpt-4-turbo",
	}

	val, err := props.Value()
	require.NoError(t, err)

	var scanned Properties
	err = scanned.Scan(val)
	require.NoError(t, err)
	assert.Equal(t, props, scanned)
}

func TestPropertiesScan_EmptyBytes(t *testing.T) {
	var props Properties
	err := props.Scan([]byte{})
	require.NoError(t, err)
	assert.Equal(t, Properties{}, props)
}

func TestPropertiesValue_ZeroValue(t *testing.T) {
	props := Properties{}
	val, err := props.Value()
	require.NoError(t, err)
	assert.Nil(t, val)
}

func TestTaskPrivateDataScanValue_RoundTrip(t *testing.T) {
	pd := TaskPrivateData{
		Key:            "sk-test",
		UpstreamTaskID: "upstream_123",
		ResultURL:      "https://cdn.example.com/result.mp4",
		BillingSource:  "wallet",
		TokenId:        42,
		NodeName:       "node-1",
	}

	val, err := pd.Value()
	require.NoError(t, err)

	var scanned TaskPrivateData
	err = scanned.Scan(val)
	require.NoError(t, err)
	assert.Equal(t, pd, scanned)
}

func TestTaskPrivateDataScan_EmptyBytes(t *testing.T) {
	var pd TaskPrivateData
	err := pd.Scan([]byte{})
	require.NoError(t, err)
	assert.Equal(t, TaskPrivateData{}, pd)
}

func TestTaskPrivateDataValue_ZeroValue(t *testing.T) {
	pd := TaskPrivateData{}
	val, err := pd.Value()
	require.NoError(t, err)
	assert.Nil(t, val)
}

func TestTaskRefundLegacyCutoff_IsReasonable(t *testing.T) {
	// The cutoff is 2026-02-22 00:00:00 UTC
	assert.Equal(t, int64(1771718400), TaskRefundLegacyCutoff)
	// Verify it's a non-zero positive timestamp
	assert.Greater(t, TaskRefundLegacyCutoff, int64(0))
}

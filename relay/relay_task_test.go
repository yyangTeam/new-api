package relay

import (
	"encoding/json"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDetectVideoFormat(t *testing.T) {
	tests := []struct {
		name string
		body string
		want string
	}{
		{
			name: "mp4 explicit mimeType",
			body: `{"response":{"videos":[{"mimeType":"video/mp4","uri":"https://example.com/v.mp4"}]}}`,
			want: "mp4",
		},
		{
			name: "webm mimeType",
			body: `{"response":{"videos":[{"mimeType":"video/webm","uri":"https://example.com/v.webm"}]}}`,
			want: "video/webm",
		},
		{
			name: "empty mimeType defaults to mp4",
			body: `{"response":{"videos":[{"mimeType":"","uri":"https://example.com/v"}]}}`,
			want: "mp4",
		},
		{
			name: "missing mimeType field defaults to mp4",
			body: `{"response":{"videos":[{"uri":"https://example.com/v"}]}}`,
			want: "mp4",
		},
		{
			name: "no videos array defaults to mp4",
			body: `{"response":{"videos":[]}}`,
			want: "mp4",
		},
		{
			name: "no response key defaults to mp4",
			body: `{"error":"something"}`,
			want: "mp4",
		},
		{
			name: "invalid JSON defaults to mp4",
			body: `not-json`,
			want: "mp4",
		},
		{
			name: "mimeType contains mp4 substring",
			body: `{"response":{"videos":[{"mimeType":"application/mp4"}]}}`,
			want: "mp4",
		},
		{
			name: "first video element is not a map",
			body: `{"response":{"videos":["not-a-map"]}}`,
			want: "mp4",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := detectVideoFormat([]byte(tt.body))
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMapTaskStatusToSimple(t *testing.T) {
	tests := []struct {
		name   string
		status model.TaskStatus
		want   string
	}{
		{name: "success", status: model.TaskStatusSuccess, want: "succeeded"},
		{name: "failure", status: model.TaskStatusFailure, want: "failed"},
		{name: "queued", status: model.TaskStatusQueued, want: "queued"},
		{name: "submitted", status: model.TaskStatusSubmitted, want: "queued"},
		{name: "in_progress", status: model.TaskStatusInProgress, want: "processing"},
		{name: "not_start", status: model.TaskStatusNotStart, want: "processing"},
		{name: "unknown", status: model.TaskStatusUnknown, want: "processing"},
		{name: "empty string", status: model.TaskStatus(""), want: "processing"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mapTaskStatusToSimple(tt.status)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestTaskModel2Dto(t *testing.T) {
	task := &model.Task{
		ID:        42,
		CreatedAt: 1700000000,
		UpdatedAt: 1700001000,
		TaskID:    "task_abc123",
		Platform:  constant.TaskPlatformSuno,
		UserId:    7,
		Group:     "default",
		ChannelId: 3,
		Quota:     500,
		Action:    "generate",
		Status:    model.TaskStatusSuccess,
		FailReason: "",
		SubmitTime: 1700000100,
		StartTime:  1700000200,
		FinishTime: 1700000900,
		Progress:   "100%",
		Properties: model.Properties{
			Input:             "test prompt",
			UpstreamModelName: "suno-v3.5",
			OriginModelName:   "suno-v3.5",
		},
		Username: "testuser",
		Data:     json.RawMessage(`{"key":"value"}`),
		PrivateData: model.TaskPrivateData{
			ResultURL: "https://cdn.example.com/result.mp3",
		},
	}

	dto := TaskModel2Dto(task)

	assert.Equal(t, int64(42), dto.ID)
	assert.Equal(t, int64(1700000000), dto.CreatedAt)
	assert.Equal(t, int64(1700001000), dto.UpdatedAt)
	assert.Equal(t, "task_abc123", dto.TaskID)
	assert.Equal(t, "suno", dto.Platform)
	assert.Equal(t, 7, dto.UserId)
	assert.Equal(t, "default", dto.Group)
	assert.Equal(t, 3, dto.ChannelId)
	assert.Equal(t, 500, dto.Quota)
	assert.Equal(t, "generate", dto.Action)
	assert.Equal(t, "SUCCESS", dto.Status)
	assert.Equal(t, "", dto.FailReason)
	assert.Equal(t, int64(1700000100), dto.SubmitTime)
	assert.Equal(t, int64(1700000200), dto.StartTime)
	assert.Equal(t, int64(1700000900), dto.FinishTime)
	assert.Equal(t, "100%", dto.Progress)
	assert.Equal(t, "testuser", dto.Username)
	// GetResultURL returns PrivateData.ResultURL when set
	assert.Equal(t, "https://cdn.example.com/result.mp3", dto.ResultURL)
	assert.JSONEq(t, `{"key":"value"}`, string(dto.Data))
}

func TestTaskModel2DtoFallsBackToFailReasonForResultURL(t *testing.T) {
	// Legacy tasks stored result URL in FailReason field
	task := &model.Task{
		ID:         1,
		TaskID:     "task_legacy",
		Status:     model.TaskStatusSuccess,
		FailReason: "https://cdn.example.com/legacy.mp4",
		PrivateData: model.TaskPrivateData{
			ResultURL: "", // empty = fallback
		},
	}

	dto := TaskModel2Dto(task)
	assert.Equal(t, "https://cdn.example.com/legacy.mp4", dto.ResultURL)
}

func TestNoteTaskQuotaClamp(t *testing.T) {
	t.Run("nil clamp does nothing", func(t *testing.T) {
		info := &relaycommon.RelayInfo{}
		noteTaskQuotaClamp(info, nil)
		assert.Nil(t, info.QuotaClamp)
	})

	t.Run("nil info does not panic", func(t *testing.T) {
		clamp := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 1.5, Clamped: 1}
		require.NotPanics(t, func() {
			noteTaskQuotaClamp(nil, clamp)
		})
	})

	t.Run("first clamp is recorded", func(t *testing.T) {
		info := &relaycommon.RelayInfo{}
		clamp := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 999999999.99, Clamped: 2147483647}
		noteTaskQuotaClamp(info, clamp)
		require.NotNil(t, info.QuotaClamp)
		assert.Equal(t, clamp, info.QuotaClamp)
	})

	t.Run("second clamp is ignored (first wins)", func(t *testing.T) {
		first := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 100.0, Clamped: 100}
		second := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 200.0, Clamped: 200}
		info := &relaycommon.RelayInfo{QuotaClamp: first}
		noteTaskQuotaClamp(info, second)
		assert.Equal(t, first, info.QuotaClamp)
	})
}

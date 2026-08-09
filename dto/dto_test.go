package dto

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTaskResponse_IsSuccess(t *testing.T) {
	tests := []struct {
		name     string
		code     string
		expected bool
	}{
		{name: "success code", code: TaskSuccessCode, expected: true},
		{name: "empty code", code: "", expected: false},
		{name: "error code", code: "error", expected: false},
		{name: "partial match", code: "success_partial", expected: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := TaskResponse[string]{Code: tt.code, Message: "test", Data: "data"}
			assert.Equal(t, tt.expected, resp.IsSuccess())
		})
	}
}

func TestTaskDto_JSONRoundTrip(t *testing.T) {
	original := TaskDto{
		ID:         123,
		CreatedAt:  1700000000,
		UpdatedAt:  1700001000,
		TaskID:     "task-abc-123",
		Platform:   "suno",
		UserId:     42,
		Group:      "default",
		ChannelId:  7,
		Quota:      5000,
		Action:     "song",
		Status:     "success",
		FailReason: "",
		SubmitTime: 1700000000,
		StartTime:  1700000100,
		FinishTime: 1700000500,
		Progress:   "100%",
		Data:       json.RawMessage(`{"audio_url":"https://example.com/song.mp3"}`),
	}

	data, err := json.Marshal(original)
	require.NoError(t, err)

	var decoded TaskDto
	require.NoError(t, json.Unmarshal(data, &decoded))

	assert.Equal(t, original.ID, decoded.ID)
	assert.Equal(t, original.TaskID, decoded.TaskID)
	assert.Equal(t, original.Platform, decoded.Platform)
	assert.Equal(t, original.UserId, decoded.UserId)
	assert.Equal(t, original.ChannelId, decoded.ChannelId)
	assert.Equal(t, original.Quota, decoded.Quota)
	assert.Equal(t, original.Action, decoded.Action)
	assert.Equal(t, original.Status, decoded.Status)
	assert.Equal(t, original.Progress, decoded.Progress)
	assert.JSONEq(t, string(original.Data), string(decoded.Data))
}

func TestTaskDto_OmitsEmptyResultURL(t *testing.T) {
	dto := TaskDto{
		TaskID: "task-1",
		Status: "processing",
	}

	data, err := json.Marshal(dto)
	require.NoError(t, err)

	// result_url should not appear when empty due to omitempty
	assert.NotContains(t, string(data), "result_url")
}

func TestTaskDto_IncludesResultURL(t *testing.T) {
	dto := TaskDto{
		TaskID:    "task-2",
		Status:    "success",
		ResultURL: "https://example.com/video.mp4",
	}

	data, err := json.Marshal(dto)
	require.NoError(t, err)

	assert.Contains(t, string(data), `"result_url":"https://example.com/video.mp4"`)
}

func TestVideoRequest_JSONSerialization(t *testing.T) {
	tests := []struct {
		name     string
		req      VideoRequest
		checkKey string
		checkVal string
		absent   []string
	}{
		{
			name: "full request",
			req: VideoRequest{
				Model:    "kling-v1",
				Prompt:   "astronaut walking",
				Duration: 5.0,
				Width:    512,
				Height:   512,
				N:        2,
			},
			checkKey: "model",
			checkVal: "kling-v1",
		},
		{
			name: "omits empty optional fields",
			req: VideoRequest{
				Duration: 5.0,
				Width:    1024,
				Height:   1024,
			},
			absent: []string{"model", "prompt", "image", "fps", "seed", "response_format", "user"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := json.Marshal(tt.req)
			require.NoError(t, err)

			if tt.checkKey != "" {
				var m map[string]any
				require.NoError(t, json.Unmarshal(data, &m))
				assert.Equal(t, tt.checkVal, m[tt.checkKey])
			}

			for _, key := range tt.absent {
				assert.NotContains(t, string(data), `"`+key+`"`)
			}
		})
	}
}

func TestVideoTaskResponse_ErrorField(t *testing.T) {
	resp := VideoTaskResponse{
		TaskId: "task-err-1",
		Status: "failed",
		Error: &VideoTaskError{
			Code:    500,
			Message: "internal error",
		},
	}

	data, err := json.Marshal(resp)
	require.NoError(t, err)

	var decoded VideoTaskResponse
	require.NoError(t, json.Unmarshal(data, &decoded))

	assert.Equal(t, "failed", decoded.Status)
	require.NotNil(t, decoded.Error)
	assert.Equal(t, 500, decoded.Error.Code)
	assert.Equal(t, "internal error", decoded.Error.Message)
	assert.Nil(t, decoded.Metadata, "metadata should be nil when absent")
}

func TestMidjourneyRequest_JSONRoundTrip(t *testing.T) {
	req := MidjourneyRequest{
		Prompt:   "a cat in space",
		Action:   "imagine",
		BotType:  "MID_JOURNEY",
		TaskId:   "mj-task-123",
		CustomId: "custom-abc",
		Index:    2,
	}

	data, err := json.Marshal(req)
	require.NoError(t, err)

	var decoded MidjourneyRequest
	require.NoError(t, json.Unmarshal(data, &decoded))

	assert.Equal(t, req.Prompt, decoded.Prompt)
	assert.Equal(t, req.Action, decoded.Action)
	assert.Equal(t, req.BotType, decoded.BotType)
	assert.Equal(t, req.TaskId, decoded.TaskId)
	assert.Equal(t, req.CustomId, decoded.CustomId)
	assert.Equal(t, req.Index, decoded.Index)
}

func TestFetchReq_JSONParsing(t *testing.T) {
	input := `{"ids":["task-1","task-2","task-3"]}`

	var req FetchReq
	require.NoError(t, json.Unmarshal([]byte(input), &req))

	assert.Equal(t, []string{"task-1", "task-2", "task-3"}, req.IDs)
}

func TestFetchReq_EmptyIDs(t *testing.T) {
	input := `{"ids":[]}`

	var req FetchReq
	require.NoError(t, json.Unmarshal([]byte(input), &req))

	assert.Empty(t, req.IDs)
}

func TestSunoSubmitReq_OmitsEmptyFields(t *testing.T) {
	req := SunoSubmitReq{
		GptDescriptionPrompt: "upbeat electronic",
		MakeInstrumental:     true,
	}

	data, err := json.Marshal(req)
	require.NoError(t, err)

	// Fields with omitempty should be absent
	jsonStr := string(data)
	assert.NotContains(t, jsonStr, `"prompt"`)
	assert.NotContains(t, jsonStr, `"mv"`)
	assert.NotContains(t, jsonStr, `"title"`)
	assert.NotContains(t, jsonStr, `"tags"`)
	// make_instrumental is bool without omitempty - should always be present
	assert.Contains(t, jsonStr, `"make_instrumental":true`)
	assert.Contains(t, jsonStr, `"gpt_description_prompt":"upbeat electronic"`)
}

func TestSunoSubmitReq_MakeInstrumentalFalse(t *testing.T) {
	req := SunoSubmitReq{
		Prompt:           "rock ballad",
		MakeInstrumental: false,
	}

	data, err := json.Marshal(req)
	require.NoError(t, err)

	// make_instrumental without omitempty preserves explicit false
	assert.Contains(t, string(data), `"make_instrumental":false`)
}
